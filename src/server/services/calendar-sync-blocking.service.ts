/**
 * Calendar Sync Blocking Service
 *
 * Handles business logic for the blocking calendar sync operation including:
 * - Session management and progress tracking
 * - Integration verification
 * - Calendar sync coordination with real-time progress
 * - Immediate job processing
 * - Error handling and rollback
 */

import { getDb } from "@/server/db/client";
import { userIntegrations, syncSessions } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logger } from "@/lib/observability";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { JobRunner } from "@/server/jobs/runner";
import { enqueue } from "@/server/jobs/enqueue";

export interface CalendarSyncPreferences {
  calendarIds?: string[];
  calendarIncludeOrganizerSelf?: boolean;
  calendarIncludePrivate?: boolean;
  calendarTimeWindowDays?: number;
  calendarFutureDays?: number;
}

export interface CalendarSyncBlockingOptions {
  preferences?: CalendarSyncPreferences;
  daysPast?: number;
  daysFuture?: number;
  maxResults?: number;
}

export interface CalendarSyncProgressCallback {
  (progress: {
    currentStep: string;
    progressPercentage: number;
    totalItems?: number;
    importedItems?: number;
    failedItems?: number;
  }): Promise<void>;
}

export interface CalendarSyncBlockingResult {
  sessionId: string;
  message: string;
  stats: {
    syncedEvents: number;
    processedJobs: number;
    daysPast: number;
    daysFuture: number;
    maxResults: number;
    batchId: string;
  };
  partialFailure: boolean;
}

export class CalendarSyncBlockingService {
  /**
   * Perform a complete blocking calendar sync with real-time progress tracking
   */
  static async syncCalendarBlocking(
    userId: string,
    options: CalendarSyncBlockingOptions
  ): Promise<CalendarSyncBlockingResult> {
    const { preferences, daysPast, daysFuture, maxResults = 2500 } = options;
    const db = await getDb();

    // Verify Calendar integration exists
    const integration = await this.verifyCalendarIntegration(userId);
    if (!integration) {
      throw new Error("Google Calendar access not approved. Please connect Calendar in Settings.");
    }

    // Create sync session
    const sessionId = await this.createSyncSession(userId, preferences ?? {});

    // Calculate sync parameters from preferences
    const syncDaysPast = daysPast ?? preferences?.calendarTimeWindowDays ?? 180;
    const syncDaysFuture = daysFuture ?? preferences?.calendarFutureDays ?? 365;
    const batchId = randomUUID();

    await logger.info("Blocking Calendar sync started", {
      operation: "calendar_sync_blocking",
      additionalData: {
        userId,
        sessionId,
        syncDaysPast,
        syncDaysFuture,
        maxResults,
        batchId,
      },
    });

    try {
      // Update session: starting calendar discovery
      await this.updateSessionProgress(sessionId, {
        status: "importing",
        currentStep: "Discovering calendars and events...",
        progressPercentage: 5,
      });

      // Create progress callback for real-time updates
      const progressCallback: CalendarSyncProgressCallback = async (progress) => {
        await this.updateSessionProgress(sessionId, progress);
      };

      // Execute calendar sync with progress tracking
      const syncOptions = {
        daysPast: syncDaysPast,
        daysFuture: syncDaysFuture,
        maxResults,
        batchId,
        sessionId,
        onProgress: progressCallback,
      };

      const syncResult = await GoogleCalendarService.syncUserCalendars(userId, syncOptions);

      if (!syncResult.success) {
        await this.handleSyncFailure(sessionId, syncResult.error ?? "Unknown error", batchId);
        throw new Error(syncResult.error ?? "Failed to sync calendar events");
      }

      // Update session: starting normalization
      await this.updateSessionProgress(sessionId, {
        status: "processing",
        currentStep: "Processing calendar events...",
        progressPercentage: 75,
      });

      // Process normalization jobs immediately
      const processedJobs = await this.processNormalizationJobs(
        userId,
        batchId,
        syncResult.syncedEvents ?? 0,
        sessionId
      );

      // Update session: completed
      await this.updateSessionProgress(sessionId, {
        status: "completed",
        processedItems: processedJobs,
        currentStep: "Calendar sync completed",
        progressPercentage: 100,
        completedAt: new Date(),
      });

      await logger.info("Blocking Calendar sync completed", {
        operation: "calendar_sync_blocking",
        additionalData: {
          userId,
          sessionId,
          batchId,
          syncedEvents: syncResult.syncedEvents,
          processedJobs,
          syncDaysPast,
          syncDaysFuture,
        },
      });

      // Generate success message
      const message = this.generateSuccessMessage(syncResult.syncedEvents ?? 0, processedJobs);

      return {
        sessionId,
        message,
        stats: {
          syncedEvents: syncResult.syncedEvents || 0,
          processedJobs,
          daysPast: syncDaysPast,
          daysFuture: syncDaysFuture,
          maxResults,
          batchId,
        },
        partialFailure: false,
      };
    } catch (error) {
      // Handle any processing errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.handleSyncFailure(sessionId, errorMessage, batchId);
      throw error;
    }
  }

  /**
   * Verify that Google Calendar integration is properly configured
   */
  private static async verifyCalendarIntegration(userId: string): Promise<boolean> {
    const db = await getDb();

    const integration = await db
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

    return !!integration[0];
  }

  /**
   * Create a new sync session for progress tracking
   */
  private static async createSyncSession(
    userId: string,
    preferences: CalendarSyncPreferences
  ): Promise<string> {
    const db = await getDb();

    const sessionInsert = await db
      .insert(syncSessions)
      .values({
        userId,
        service: "calendar",
        status: "started",
        currentStep: "Initializing Calendar sync...",
        progressPercentage: 0,
        preferences: preferences,
      })
      .returning({ id: syncSessions.id });

    const sessionId = sessionInsert[0]?.id;
    if (!sessionId) {
      throw new Error("Failed to create sync session");
    }

    return sessionId;
  }

  /**
   * Update sync session progress
   */
  private static async updateSessionProgress(
    sessionId: string,
    progress: {
      status?: string;
      currentStep?: string;
      progressPercentage?: number;
      totalItems?: number;
      importedItems?: number;
      failedItems?: number;
      processedItems?: number;
      completedAt?: Date;
    }
  ): Promise<void> {
    const db = await getDb();

    const updateData: Record<string, unknown> = {};

    if (progress.status !== undefined) updateData.status = progress.status;
    if (progress.currentStep !== undefined) updateData.currentStep = progress.currentStep;
    if (progress.progressPercentage !== undefined) updateData.progressPercentage = progress.progressPercentage;
    if (progress.totalItems !== undefined) updateData.totalItems = progress.totalItems;
    if (progress.importedItems !== undefined) updateData.importedItems = progress.importedItems;
    if (progress.failedItems !== undefined) updateData.failedItems = progress.failedItems;
    if (progress.processedItems !== undefined) updateData.processedItems = progress.processedItems;
    if (progress.completedAt !== undefined) updateData.completedAt = progress.completedAt;

    await db
      .update(syncSessions)
      .set(updateData)
      .where(eq(syncSessions.id, sessionId));
  }

  /**
   * Handle sync failures by updating session status
   */
  private static async handleSyncFailure(
    sessionId: string,
    errorMessage: string,
    batchId: string
  ): Promise<void> {
    const db = await getDb();

    await db
      .update(syncSessions)
      .set({
        status: "failed",
        currentStep: "Calendar sync failed",
        errorDetails: {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        completedAt: new Date(),
      })
      .where(eq(syncSessions.id, sessionId));

    await logger.error("Calendar sync failed", {
      operation: "calendar_sync_blocking",
      additionalData: {
        sessionId,
        batchId,
        error: errorMessage,
      },
    });
  }

  /**
   * Process normalization jobs immediately after sync
   */
  private static async processNormalizationJobs(
    userId: string,
    batchId: string,
    syncedEvents: number,
    sessionId: string
  ): Promise<number> {
    if (!syncedEvents || syncedEvents === 0) {
      return 0;
    }

    try {
      // Create normalization job for calendar events
      await enqueue("normalize", { batchId, provider: "calendar" }, userId, batchId);

      // Process the job immediately
      const jobRunner = new JobRunner();
      const jobResult = await jobRunner.processUserJobs(userId, 10);

      if (jobResult.failed > 0) {
        await logger.warn("Some calendar normalization jobs failed", {
          operation: "calendar_sync_blocking",
          additionalData: {
            userId,
            sessionId,
            batchId,
            succeeded: jobResult.succeeded,
            failed: jobResult.failed,
            errors: jobResult.errors,
          },
        });
      }

      return jobResult.succeeded;
    } catch (jobError) {
      await logger.warn("Failed to process calendar normalization jobs", {
        operation: "calendar_sync_blocking",
        additionalData: {
          userId,
          sessionId,
          batchId,
          syncedEvents,
          error: jobError instanceof Error ? jobError.message : String(jobError),
        },
      });

      return 0;
    }
  }

  /**
   * Generate user-friendly success message
   */
  private static generateSuccessMessage(syncedEvents: number, processedJobs: number): string {
    if (syncedEvents > 0) {
      return `Successfully synced ${syncedEvents} calendar events and processed ${processedJobs} normalizations`;
    } else {
      return `Calendar sync completed - no new events found in the specified date range`;
    }
  }
}