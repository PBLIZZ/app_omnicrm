/**
 * Google Integration Service
 *
 * Consolidates all Google integration business logic for API routes:
 * - /api/google/status
 * - /api/google/prefs
 *
 * Provides methods for checking Google service status, managing user preferences,
 * and handling OAuth token refresh operations.
 */

import { getDb } from "@/server/db/client";
import { userIntegrations, jobs, userSyncPrefs } from "@/server/db/schema";
import type { UserIntegration } from "@/server/db/types";
import { desc, eq, and, sql, inArray } from "drizzle-orm";
import { GoogleGmailService } from "@/server/services/google-gmail.service";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { logger } from "@/lib/observability";
import { Result, ok, err } from "@/lib/utils/result";
import type { GoogleServiceError, GoogleErrorCode } from "@/server/db/business-schemas/google-prefs";

export interface GoogleStatusResponse {
  googleConnected: boolean;
  services: {
    gmail: {
      connected: boolean;
      autoRefreshed: boolean;
      integration: {
        service: string;
        expiryDate: string | null;
        hasRefreshToken: boolean;
      } | null;
      lastSync: string | null;
    };
    calendar: {
      connected: boolean;
      autoRefreshed: boolean;
      integration: {
        service: string;
        expiryDate: string | null;
        hasRefreshToken: boolean;
      } | null;
      lastSync: string | null;
    };
  };
  features: {
    gmail: boolean;
    calendar: boolean;
  };
  jobs: {
    queued: number;
    done: number;
    error: number;
  };
  embedJobs: {
    queued: number;
    done: number;
    error: number;
  };
  lastBatchId: string | null;
  serviceTokens: {
    google: boolean;
    gmail: boolean;
    calendar: boolean;
    unified: boolean;
  };
  flags: {
    gmail: boolean;
    calendar: boolean;
  };
  lastSync: {
    gmail: string | null;
    calendar: string | null;
  };
  _cached?: boolean;
  _cacheTime?: string;
}

export interface GoogleSyncPreferences {
  gmailQuery: string;
  gmailLabelIncludes: string[];
  gmailLabelExcludes: string[];
  gmailTimeRangeDays: number;
  calendarIncludeOrganizerSelf: boolean;
  calendarIncludePrivate: boolean;
  calendarTimeWindowDays: number;
  calendarIds: string[];
  calendarFutureDays: number;
  driveIngestionMode: string;
  driveFolderIds: string[];
  driveMaxSizeMB: number;
  initialSyncCompleted: boolean;
  initialSyncDate: string | null;
}

export interface GoogleSyncPreferencesUpdate {
  gmailQuery?: string;
  gmailLabelIncludes?: string[];
  gmailLabelExcludes?: string[];
  gmailTimeRangeDays?: number;
  calendarIncludeOrganizerSelf?: boolean;
  calendarIncludePrivate?: boolean;
  calendarTimeWindowDays?: number;
  calendarIds?: string[];
  calendarFutureDays?: number;
  driveIngestionMode?: string;
  driveFolderIds?: string[];
  driveMaxSizeMB?: number;
  initialSyncCompleted?: boolean;
  initialSyncDate?: string | null;
}

// Simple in-memory cache to prevent UI flickering
interface CacheEntry {
  data: GoogleStatusResponse;
  timestamp: number;
  userId: string;
}

export class GoogleIntegrationService {
  private static statusCache = new Map<string, CacheEntry>();
  private static readonly CACHE_TTL_MS = 30 * 1000; // 30 seconds

  /**
   * Classify error types for better user experience and retry logic
   */
  private static classifyError(error: unknown): GoogleServiceError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    let code: GoogleErrorCode;
    let retryable = false;
    let userActionRequired = false;

    if (lowerMessage.includes("auth") || lowerMessage.includes("token") || lowerMessage.includes("unauthorized")) {
      code = "AUTH_ERROR";
      retryable = true;
      userActionRequired = true;
    } else if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("connection")) {
      code = "NETWORK_ERROR";
      retryable = true;
      userActionRequired = false;
    } else if (lowerMessage.includes("quota") || lowerMessage.includes("rate limit") || lowerMessage.includes("429")) {
      code = "QUOTA_ERROR";
      retryable = true;
      userActionRequired = false;
    } else if (lowerMessage.includes("database") || lowerMessage.includes("db") || lowerMessage.includes("sql")) {
      code = "DATABASE_ERROR";
      retryable = true;
      userActionRequired = false;
    } else if (lowerMessage.includes("permission") || lowerMessage.includes("forbidden") || lowerMessage.includes("403")) {
      code = "PERMISSION_ERROR";
      retryable = false;
      userActionRequired = true;
    } else if (lowerMessage.includes("config") || lowerMessage.includes("setup") || lowerMessage.includes("invalid")) {
      code = "CONFIG_ERROR";
      retryable = false;
      userActionRequired = true;
    } else {
      code = "UNKNOWN_ERROR";
      retryable = false;
      userActionRequired = false;
    }

    return {
      code,
      message: errorMessage,
      details: error instanceof Error ? error.stack : undefined,
      retryable,
      userActionRequired,
    };
  }

  /**
   * Get comprehensive Google integration status for a user
   */
  static async getGoogleStatus(userId: string): Promise<Result<GoogleStatusResponse, GoogleServiceError>> {
    try {
      // Check cache first to prevent UI flickering
      const cachedResult = this.getCachedStatus(userId);
      if (cachedResult) {
        const cachedResponse = {
          ...cachedResult,
          _cached: true,
          _cacheTime: new Date().toISOString(),
        };
        return ok(cachedResponse);
      }

    const db = await getDb();

    // Get all Google integrations in parallel
    const [authIntegration, unifiedIntegration, gmailIntegration, calendarIntegration] =
      await Promise.all([
        db
          .select()
          .from(userIntegrations)
          .where(
            and(
              eq(userIntegrations.userId, userId),
              eq(userIntegrations.provider, "google"),
              eq(userIntegrations.service, "auth"),
            ),
          )
          .limit(1),
        db
          .select()
          .from(userIntegrations)
          .where(
            and(
              eq(userIntegrations.userId, userId),
              eq(userIntegrations.provider, "google"),
              eq(userIntegrations.service, "unified"),
            ),
          )
          .limit(1),
        db
          .select()
          .from(userIntegrations)
          .where(
            and(
              eq(userIntegrations.userId, userId),
              eq(userIntegrations.provider, "google"),
              eq(userIntegrations.service, "gmail"),
            ),
          )
          .limit(1),
        db
          .select()
          .from(userIntegrations)
          .where(
            and(
              eq(userIntegrations.userId, userId),
              eq(userIntegrations.provider, "google"),
              eq(userIntegrations.service, "calendar"),
            ),
          )
          .limit(1),
      ]);

    const googleConnected = !!authIntegration[0];

    // Check for valid (non-expired) service tokens with auto-refresh
    const now = new Date();

    // Gmail service status - convert undefined to null for type safety
    const gmailIntegrationForStatus = unifiedIntegration[0] ?? gmailIntegration[0] ?? null;
    const gmailStatus = await this.checkServiceStatus(
      userId,
      'gmail',
      gmailIntegrationForStatus,
      now,
      db
    );

    // Calendar service status - convert undefined to null for type safety
    const calendarIntegrationForStatus = calendarIntegration[0] ?? null;
    const calendarStatus = await this.checkServiceStatus(
      userId,
      'calendar',
      calendarIntegrationForStatus,
      now,
      db
    );

    // Get last sync completion dates and job metrics in parallel
    const [
      gmailLastSyncJob,
      calendarLastSyncJob,
      jobMetrics,
      embedJobMetrics,
      lastBatch,
    ] = await Promise.all([
      // Last successful sync job completion per provider
      db
        .select({ updatedAt: jobs.updatedAt })
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, userId),
            inArray(jobs.kind, ["google_gmail_sync", "normalize_google_email"]),
            eq(jobs.status, "done"),
          ),
        )
        .orderBy(desc(jobs.updatedAt))
        .limit(1),
      db
        .select({ updatedAt: jobs.updatedAt })
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, userId),
            inArray(jobs.kind, ["google_calendar_sync", "normalize_google_event"]),
            eq(jobs.status, "done"),
          ),
        )
        .orderBy(desc(jobs.updatedAt))
        .limit(1),

      // Google job metrics (queued, done, error counts)
      db
        .select({
          status: jobs.status,
          count: sql<number>`count(*)`,
        })
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, userId),
            inArray(jobs.kind, [
              "google_gmail_sync",
              "google_calendar_sync",
              "normalize_google_email",
              "normalize_google_event",
            ]),
          ),
        )
        .groupBy(jobs.status),

      // Embedding job metrics
      db
        .select({
          status: jobs.status,
          count: sql<number>`count(*)`,
        })
        .from(jobs)
        .where(and(eq(jobs.userId, userId), eq(jobs.kind, "embed")))
        .groupBy(jobs.status),

      // Last batch ID
      db
        .select({ batchId: jobs.batchId })
        .from(jobs)
        .where(eq(jobs.userId, userId))
        .orderBy(desc(jobs.createdAt))
        .limit(1),
    ]);

    // Process job metrics with proper type safety
    const jobCounts: { queued: number; done: number; error: number } = jobMetrics.reduce(
      (acc, job) => {
        const status = job.status as "queued" | "done" | "error";
        if (status in acc) {
          acc[status] = job.count;
        }
        return acc;
      },
      { queued: 0, done: 0, error: 0 }
    );

    const embedJobCounts: { queued: number; done: number; error: number } = embedJobMetrics.reduce(
      (acc, job) => {
        const status = job.status as "queued" | "done" | "error";
        if (status in acc) {
          acc[status] = job.count;
        }
        return acc;
      },
      { queued: 0, done: 0, error: 0 }
    );

    const responseData: GoogleStatusResponse = {
      // Provider connection status
      googleConnected,

      // Service-specific token status with auto-refresh info
      services: {
        gmail: {
          connected: gmailStatus.connected,
          autoRefreshed: gmailStatus.autoRefreshed,
          integration: gmailStatus.integration,
          lastSync: gmailLastSyncJob[0]?.updatedAt?.toISOString() ?? null,
        },
        calendar: {
          connected: calendarStatus.connected,
          autoRefreshed: calendarStatus.autoRefreshed,
          integration: calendarStatus.integration,
          lastSync: calendarLastSyncJob[0]?.updatedAt?.toISOString() ?? null,
        },
      },

      // Feature flags
      features: {
        gmail: process.env["FEATURE_GOOGLE_GMAIL_RO"] === "1",
        calendar: process.env["FEATURE_GOOGLE_CALENDAR_RO"] === "1",
      },

      // Job processing metrics
      jobs: jobCounts,
      embedJobs: embedJobCounts,
      lastBatchId: lastBatch[0]?.batchId ?? null,

      // Backward compatibility
      serviceTokens: {
        google: googleConnected,
        gmail: gmailStatus.connected,
        calendar: calendarStatus.connected,
        unified: !!unifiedIntegration[0],
      },
      flags: {
        gmail: process.env["FEATURE_GOOGLE_GMAIL_RO"] === "1",
        calendar: process.env["FEATURE_GOOGLE_CALENDAR_RO"] === "1",
      },
      lastSync: {
        gmail: gmailLastSyncJob[0]?.updatedAt?.toISOString() ?? null,
        calendar: calendarLastSyncJob[0]?.updatedAt?.toISOString() ?? null,
      },
    };

      // Cache the result to prevent UI flickering on subsequent requests
      this.setCachedStatus(userId, responseData);

      return ok(responseData);
    } catch (error: unknown) {
      const classifiedError = this.classifyError(error);
      await logger.error(`Google status fetch failed`, {
        operation: "get_google_status",
        additionalData: {
          userId,
          errorCode: classifiedError.code,
          errorMessage: classifiedError.message,
          retryable: classifiedError.retryable,
          userActionRequired: classifiedError.userActionRequired,
        },
      });
      return err(classifiedError);
    }
  }

  /**
   * Get user's Google sync preferences
   */
  static async getSyncPreferences(userId: string): Promise<GoogleSyncPreferences> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(userSyncPrefs)
      .where(eq(userSyncPrefs.userId, userId))
      .limit(1);

    const prefs = rows[0] ?? {
      gmailQuery: "category:primary -in:chats -in:drafts newer_than:30d",
      gmailLabelIncludes: [],
      gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
      gmailTimeRangeDays: 365,
      calendarIncludeOrganizerSelf: true,
      calendarIncludePrivate: false,
      calendarTimeWindowDays: 365,
      calendarIds: [],
      calendarFutureDays: 90,
      driveIngestionMode: "none",
      driveFolderIds: [],
      driveMaxSizeMB: 5,
      initialSyncCompleted: false,
      initialSyncDate: null,
    };

    return {
      ...prefs,
      initialSyncDate: prefs.initialSyncDate?.toISOString() ?? null,
    } as GoogleSyncPreferences;
  }

  /**
   * Build a clean update object without undefined values for database operations
   */
  static buildCleanUpdateObject(data: GoogleSyncPreferencesUpdate): GoogleSyncPreferencesUpdate {
    const updateData: GoogleSyncPreferencesUpdate = {};

    if (data.gmailQuery !== undefined) updateData.gmailQuery = data.gmailQuery;
    if (data.gmailLabelIncludes !== undefined) updateData.gmailLabelIncludes = data.gmailLabelIncludes;
    if (data.gmailLabelExcludes !== undefined) updateData.gmailLabelExcludes = data.gmailLabelExcludes;
    if (data.gmailTimeRangeDays !== undefined) updateData.gmailTimeRangeDays = data.gmailTimeRangeDays;
    if (data.calendarIncludeOrganizerSelf !== undefined) updateData.calendarIncludeOrganizerSelf = data.calendarIncludeOrganizerSelf;
    if (data.calendarIncludePrivate !== undefined) updateData.calendarIncludePrivate = data.calendarIncludePrivate;
    if (data.calendarTimeWindowDays !== undefined) updateData.calendarTimeWindowDays = data.calendarTimeWindowDays;
    if (data.calendarIds !== undefined) updateData.calendarIds = data.calendarIds;
    if (data.calendarFutureDays !== undefined) updateData.calendarFutureDays = data.calendarFutureDays;
    if (data.driveIngestionMode !== undefined) updateData.driveIngestionMode = data.driveIngestionMode;
    if (data.driveFolderIds !== undefined) updateData.driveFolderIds = data.driveFolderIds;
    if (data.driveMaxSizeMB !== undefined) updateData.driveMaxSizeMB = data.driveMaxSizeMB;
    if (data.initialSyncCompleted !== undefined) updateData.initialSyncCompleted = data.initialSyncCompleted;
    if (data.initialSyncDate !== undefined) updateData.initialSyncDate = data.initialSyncDate;

    return updateData;
  }

  /**
   * Update user's Google sync preferences
   */
  static async updateSyncPreferences(
    userId: string,
    updates: GoogleSyncPreferencesUpdate
  ): Promise<void> {
    const db = await getDb();

    const toBool = (v: unknown, defaultValue: boolean): boolean => {
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v === "true";
      return defaultValue;
    };

    const rows = await db
      .select()
      .from(userSyncPrefs)
      .where(eq(userSyncPrefs.userId, userId))
      .limit(1);

    if (rows[0]) {
      // Check if initial sync is completed and prevent modification of certain settings
      const existingPrefs = rows[0];

      // Prevent modification of time range settings after initial sync
      if (existingPrefs.initialSyncCompleted) {
        if (updates.gmailTimeRangeDays && updates.gmailTimeRangeDays !== existingPrefs.gmailTimeRangeDays) {
          throw new Error("Gmail time range cannot be changed after initial sync");
        }
        if (updates.calendarTimeWindowDays && updates.calendarTimeWindowDays !== existingPrefs.calendarTimeWindowDays) {
          throw new Error("Calendar time window cannot be changed after initial sync");
        }
        if (updates.calendarFutureDays && updates.calendarFutureDays !== existingPrefs.calendarFutureDays) {
          throw new Error("Calendar future days cannot be changed after initial sync");
        }
      }

      // Update existing preferences
      await db
        .update(userSyncPrefs)
        .set({
          gmailQuery: updates.gmailQuery ?? existingPrefs.gmailQuery,
          gmailLabelIncludes: updates.gmailLabelIncludes ?? existingPrefs.gmailLabelIncludes,
          gmailLabelExcludes: updates.gmailLabelExcludes ?? existingPrefs.gmailLabelExcludes,
          gmailTimeRangeDays: updates.gmailTimeRangeDays ?? existingPrefs.gmailTimeRangeDays,
          calendarIncludeOrganizerSelf: toBool(
            updates.calendarIncludeOrganizerSelf,
            existingPrefs.calendarIncludeOrganizerSelf,
          ),
          calendarIncludePrivate: toBool(
            updates.calendarIncludePrivate,
            existingPrefs.calendarIncludePrivate,
          ),
          calendarTimeWindowDays: updates.calendarTimeWindowDays ?? existingPrefs.calendarTimeWindowDays,
          calendarIds: updates.calendarIds ?? existingPrefs.calendarIds,
          calendarFutureDays: updates.calendarFutureDays ?? existingPrefs.calendarFutureDays,
          driveIngestionMode: updates.driveIngestionMode ?? existingPrefs.driveIngestionMode,
          driveFolderIds: updates.driveFolderIds ?? existingPrefs.driveFolderIds,
          driveMaxSizeMB: updates.driveMaxSizeMB ?? existingPrefs.driveMaxSizeMB,
          initialSyncCompleted: updates.initialSyncCompleted ?? existingPrefs.initialSyncCompleted,
          initialSyncDate: updates.initialSyncDate ? new Date(updates.initialSyncDate) : existingPrefs.initialSyncDate,
          updatedAt: new Date(),
        })
        .where(eq(userSyncPrefs.userId, userId));
    } else {
      // Create new preferences record
      await db.insert(userSyncPrefs).values({
        userId,
        gmailQuery: updates.gmailQuery ?? "category:primary -in:chats -in:drafts newer_than:30d",
        gmailLabelIncludes: updates.gmailLabelIncludes ?? [],
        gmailLabelExcludes: updates.gmailLabelExcludes ?? [
          "Promotions",
          "Social",
          "Forums",
          "Updates",
        ],
        gmailTimeRangeDays: updates.gmailTimeRangeDays ?? 365,
        calendarIncludeOrganizerSelf: toBool(updates.calendarIncludeOrganizerSelf, true),
        calendarIncludePrivate: toBool(updates.calendarIncludePrivate, false),
        calendarTimeWindowDays: updates.calendarTimeWindowDays ?? 365,
        calendarIds: updates.calendarIds ?? [],
        calendarFutureDays: updates.calendarFutureDays ?? 90,
        driveIngestionMode: updates.driveIngestionMode ?? "none",
        driveFolderIds: updates.driveFolderIds ?? [],
        driveMaxSizeMB: updates.driveMaxSizeMB ?? 5,
        initialSyncCompleted: updates.initialSyncCompleted ?? false,
        initialSyncDate: updates.initialSyncDate ? new Date(updates.initialSyncDate) : null,
      });
    }
  }

  /**
   * Check service status with auto-refresh capability
   */
  private static async checkServiceStatus(
    userId: string,
    service: 'gmail' | 'calendar',
    integration: UserIntegration | null,
    now: Date,
    db: Awaited<ReturnType<typeof getDb>>
  ): Promise<{
    connected: boolean;
    autoRefreshed: boolean;
    integration: {
      service: string;
      expiryDate: string | null;
      hasRefreshToken: boolean;
    } | null;
  }> {
    let integrationToCheck = integration;
    let autoRefreshed = false;
    let connected = false;

    if (integrationToCheck) {
      const isExpired = integrationToCheck.expiryDate && integrationToCheck.expiryDate < now;

      // If token is expired but we have a refresh token, attempt auto-refresh
      if (isExpired && integrationToCheck.refreshToken) {
        try {
          if (service === 'gmail') {
            await GoogleGmailService.getAuth(userId);
          } else {
            await GoogleCalendarService.getAuth(userId);
          }

          // Re-check the integration after refresh attempt
          const refreshedIntegrations = await db
            .select()
            .from(userIntegrations)
            .where(
              and(
                eq(userIntegrations.userId, userId),
                eq(userIntegrations.provider, "google"),
                eq(userIntegrations.service, integrationToCheck.service),
              ),
            )
            .limit(1);

          if (refreshedIntegrations[0]) {
            integrationToCheck = refreshedIntegrations[0];
            autoRefreshed = true;
          }
        } catch (refreshError) {
          await logger.warn(`Automatic ${service} token refresh failed`, {
            operation: `${service}_token_refresh`,
            additionalData: {
              userId,
              error: refreshError instanceof Error ? refreshError.message : String(refreshError),
            },
          });
        }
      }

      connected = !!(integrationToCheck.expiryDate ? integrationToCheck.expiryDate > now : true);
    }

    return {
      connected,
      autoRefreshed,
      integration: integrationToCheck ? {
        service: integrationToCheck.service,
        expiryDate: integrationToCheck.expiryDate?.toISOString() ?? null,
        hasRefreshToken: !!integrationToCheck.refreshToken,
      } : null,
    };
  }

  /**
   * Get cached status to prevent UI flickering
   */
  private static getCachedStatus(userId: string): GoogleStatusResponse | null {
    const cacheKey = `google-status-${userId}`;
    const entry = this.statusCache.get(cacheKey);

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.CACHE_TTL_MS;
    if (isExpired) {
      this.statusCache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached status with automatic cleanup
   */
  private static setCachedStatus(userId: string, data: GoogleStatusResponse): void {
    const cacheKey = `google-status-${userId}`;
    this.statusCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      userId,
    });

    // Clean up old cache entries to prevent memory leaks
    if (this.statusCache.size > 1000) {
      const now = Date.now();
      const keysToDelete: string[] = [];
      this.statusCache.forEach((entry, key) => {
        if (now - entry.timestamp > this.CACHE_TTL_MS) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.statusCache.delete(key));
    }
  }

  /**
   * Clear cached status for a user (useful after OAuth operations)
   */
  static clearStatusCache(userId: string): void {
    const cacheKey = `google-status-${userId}`;
    this.statusCache.delete(cacheKey);
  }

  /**
   * Check if Google integration is properly configured
   */
  static async isGoogleConnected(userId: string): Promise<boolean> {
    const db = await getDb();

    const authIntegration = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, "auth"),
        ),
      )
      .limit(1);

    return !!authIntegration[0];
  }

  /**
   * Get integration details for a specific service
   */
  static async getServiceIntegration(userId: string, service: string): Promise<UserIntegration | null> {
    const db = await getDb();

    const integration = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, service),
        ),
      )
      .limit(1);

    return integration[0] ?? null;
  }
}