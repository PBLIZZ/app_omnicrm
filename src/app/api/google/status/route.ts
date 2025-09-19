/**
 * GET /api/google/status — Unified Google provider status
 *
 * This endpoint consolidates all Google service status checking into a single route.
 * Replaces /api/settings/sync/status and /api/google/{gmail,calendar}/status endpoints.
 *
 * Features:
 * - Google OAuth connection status
 * - Gmail & Calendar service status with auto-refresh
 * - Accurate last sync timestamps (job completion, not raw event creation)
 * - Job processing metrics
 * - Server-side caching to prevent UI flickering
 */
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { userIntegrations, jobs } from "@/server/db/schema";
import { desc, eq, and, sql, inArray } from "drizzle-orm";
import { ensureError } from "@/lib/utils/error-handler";
import { GoogleGmailService } from "@/server/services/google-gmail.service";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";

// Define Google status response interface
interface GoogleStatusResponse {
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

// Simple in-memory cache to prevent UI flickering
// Cache status for 30 seconds per user to reduce database hits and improve UX
interface CacheEntry {
  data: GoogleStatusResponse;
  timestamp: number;
  userId: string;
}

const statusCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

function getCachedStatus(userId: string): GoogleStatusResponse | null {
  const cacheKey = `google-status-${userId}`;
  const entry = statusCache.get(cacheKey);

  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
  if (isExpired) {
    statusCache.delete(cacheKey);
    return null;
  }

  return entry.data;
}

function setCachedStatus(userId: string, data: GoogleStatusResponse): void {
  const cacheKey = `google-status-${userId}`;
  statusCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    userId,
  });

  // Clean up old cache entries to prevent memory leaks
  if (statusCache.size > 1000) {
    const now = Date.now();
    for (const [key, entry] of statusCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        statusCache.delete(key);
      }
    }
  }
}

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_status" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("google.status", requestId);

  try {
    // Check cache first to prevent UI flickering
    const cachedResult = getCachedStatus(userId);
    if (cachedResult) {
      // Add cache hit indicator for debugging
      return api.success({
        ...cachedResult,
        _cached: true,
        _cacheTime: new Date().toISOString(),
      });
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

    // Unified integration provides Gmail access, legacy gmail integration also works
    let gmailIntegrationToCheck = unifiedIntegration[0] ?? gmailIntegration[0];
    let gmailNeedsRefresh = false;
    let hasGmailToken = false;

    if (gmailIntegrationToCheck) {
      const isExpired = gmailIntegrationToCheck.expiryDate && gmailIntegrationToCheck.expiryDate < now;

      // If token is expired but we have a refresh token, attempt auto-refresh
      if (isExpired && gmailIntegrationToCheck.refreshToken) {
        try {
          await GoogleGmailService.getAuth(userId);

          // Re-check the integration after refresh attempt
          const refreshedIntegrations = await db
            .select()
            .from(userIntegrations)
            .where(
              and(
                eq(userIntegrations.userId, userId),
                eq(userIntegrations.provider, "google"),
                eq(userIntegrations.service, gmailIntegrationToCheck.service),
              ),
            )
            .limit(1);

          if (refreshedIntegrations[0]) {
            gmailIntegrationToCheck = refreshedIntegrations[0];
            gmailNeedsRefresh = true;
          }
        } catch (refreshError) {
          console.warn("Automatic Gmail token refresh failed:", refreshError);
        }
      }

      hasGmailToken = !!(gmailIntegrationToCheck.expiryDate ? gmailIntegrationToCheck.expiryDate > now : true);
    }

    // Calendar token validation with auto-refresh
    let calendarIntegrationToCheck = calendarIntegration[0];
    let calendarNeedsRefresh = false;
    let hasCalendarToken = false;

    if (calendarIntegrationToCheck) {
      const isExpired = calendarIntegrationToCheck.expiryDate && calendarIntegrationToCheck.expiryDate < now;

      // If token is expired but we have a refresh token, attempt auto-refresh
      if (isExpired && calendarIntegrationToCheck.refreshToken) {
        try {
          await GoogleCalendarService.getAuth(userId);

          // Re-check the integration after refresh attempt
          const refreshedIntegrations = await db
            .select()
            .from(userIntegrations)
            .where(
              and(
                eq(userIntegrations.userId, userId),
                eq(userIntegrations.provider, "google"),
                eq(userIntegrations.service, "calendar"),
              ),
            )
            .limit(1);

          if (refreshedIntegrations[0]) {
            calendarIntegrationToCheck = refreshedIntegrations[0];
            calendarNeedsRefresh = true;
          }
        } catch (refreshError) {
          console.warn("Automatic Calendar token refresh failed:", refreshError);
        }
      }

      hasCalendarToken = !!(calendarIntegrationToCheck.expiryDate ? calendarIntegrationToCheck.expiryDate > now : true);
    }

    // Get last sync completion dates and job metrics in parallel
    const [
      gmailLastSyncJob,
      calendarLastSyncJob,
      jobMetrics,
      embedJobMetrics,
      lastBatch,
    ] = await Promise.all([
      // Last successful sync job completion per provider (not raw event creation)
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
          connected: hasGmailToken,
          autoRefreshed: gmailNeedsRefresh,
          integration: gmailIntegrationToCheck ? {
            service: gmailIntegrationToCheck.service,
            expiryDate: gmailIntegrationToCheck.expiryDate?.toISOString() ?? null,
            hasRefreshToken: !!gmailIntegrationToCheck.refreshToken,
          } : null,
          lastSync: gmailLastSyncJob[0]?.updatedAt?.toISOString() ?? null,
        },
        calendar: {
          connected: hasCalendarToken,
          autoRefreshed: calendarNeedsRefresh,
          integration: calendarIntegrationToCheck ? {
            service: calendarIntegrationToCheck.service,
            expiryDate: calendarIntegrationToCheck.expiryDate?.toISOString() ?? null,
            hasRefreshToken: !!calendarIntegrationToCheck.refreshToken,
          } : null,
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
        gmail: hasGmailToken,
        calendar: hasCalendarToken,
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
    setCachedStatus(userId, responseData);

    return api.success(responseData);
  } catch (error) {

function mapToStandardErrorCode(customCode: string): import("@/server/api/response").ApiErrorCode {
  switch (customCode) {
    case "AUTH_ERROR":
      return "UNAUTHORIZED";
    case "NETWORK_ERROR":
      return "INTEGRATION_ERROR";
    case "QUOTA_ERROR":
      return "RATE_LIMITED";
    case "DATABASE_ERROR":
      return "DATABASE_ERROR";
    default:
      return "INTERNAL_ERROR";
  }
}
    const ensuredError = ensureError(error);

    // Classify error types for better user experience
    let errorCode: string;
    let errorMessage: string;

    if (ensuredError.message.includes("auth") || ensuredError.message.includes("token")) {
      errorCode = "AUTH_ERROR";
      errorMessage = "Authentication error occurred while checking Google status";
    } else if (ensuredError.message.includes("network") || ensuredError.message.includes("fetch")) {
      errorCode = "NETWORK_ERROR";
      errorMessage = "Network error occurred while checking Google status";
    } else if (ensuredError.message.includes("quota") || ensuredError.message.includes("rate limit")) {
      errorCode = "QUOTA_ERROR";
      errorMessage = "Rate limit exceeded while checking Google status";
    } else if (ensuredError.message.includes("database") || ensuredError.message.includes("db")) {
      errorCode = "DATABASE_ERROR";
      errorMessage = "Database error occurred while checking Google status";
    } else {
      errorCode = "UNKNOWN_ERROR";
      errorMessage = "Unknown error occurred while checking Google status";
    }

    console.error("Google status check failed:", {
      userId,
      error: ensuredError.message,
      stack: ensuredError.stack,
      code: errorCode,
    });

    // Map custom error codes to standard API error codes
    const standardErrorCode = mapToStandardErrorCode(errorCode);

    return api.error(
      errorMessage,
      standardErrorCode,
      {
        timestamp: new Date().toISOString(),
        operation: "google_status_check",
        recoverable: errorCode !== "DATABASE_ERROR",
        retryable: ["NETWORK_ERROR", "QUOTA_ERROR"].includes(errorCode),
      },
      ensuredError,
    );
  }
});