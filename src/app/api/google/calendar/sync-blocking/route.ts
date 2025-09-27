/**
 * POST /api/google/calendar/sync-blocking — Blocking Calendar sync with real-time progress
 *
 * This endpoint provides a complete synchronous Calendar sync experience:
 * - Creates sync session for tracking progress
 * - Imports Calendar events into raw_events
 * - Immediately processes normalization jobs
 * - Updates session progress in real-time
 * - Returns complete results when finished
 *
 * Key Features:
 * - Blocking operation with progress tracking
 * - Session-based progress updates
 * - Immediate job processing (no background queuing)
 * - Error resilience with partial failure handling
 * - Cache invalidation triggers
 */
import { handleAuth } from "@/lib/api";
import { CalendarSyncBlockingRequestSchema, CalendarSyncBlockingResponseSchema } from "@/server/db/business-schemas";
import { getDb } from "@/server/db/client";
import { userIntegrations, syncSessions } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logger } from "@/lib/observability";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { JobRunner } from "@/server/jobs/runner";
import { enqueue } from "@/server/jobs/enqueue";

export const POST = handleAuth(CalendarSyncBlockingRequestSchema, CalendarSyncBlockingResponseSchema, async (data, userId) => {
  const { preferences, daysPast, daysFuture, maxResults } = data;

  let sessionId: string | null = null;

  const db = await getDb();

  // Verify Calendar integration exists
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

  if (!integration[0]) {
    throw new Error("Google Calendar access not approved. Please connect Calendar in Settings.");
  }

  // Create sync session
  const sessionInsert = await db
    .insert(syncSessions)
    .values({
      userId,
      service: "calendar",
      status: "started",
      currentStep: "Initializing Calendar sync...",
      progressPercentage: 0,
      preferences: preferences ?? {},
    })
    .returning({ id: syncSessions.id });

  sessionId = sessionInsert[0]?.id || null;
  if (!sessionId) {
    throw new Error("Failed to create sync session");
  }

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

  // Update session: starting calendar discovery
  await db
    .update(syncSessions)
    .set({
      status: "importing",
      currentStep: "Discovering calendars and events...",
      progressPercentage: 5,
    })
    .where(eq(syncSessions.id, sessionId));

  // Create a custom sync options object that includes session tracking
  const syncOptions = {
    daysPast: syncDaysPast,
    daysFuture: syncDaysFuture,
    maxResults,
    batchId,
    sessionId, // Pass session ID for progress tracking
    onProgress: async (progress: {
      currentStep: string;
      progressPercentage: number;
      totalItems?: number;
      importedItems?: number;
      failedItems?: number;
    }) => {
      // Update session progress in real-time
      if (sessionId) {
        await db
          .update(syncSessions)
          .set({
            currentStep: progress.currentStep,
            progressPercentage: progress.progressPercentage,
            ...(progress.totalItems !== undefined && { totalItems: progress.totalItems }),
            ...(progress.importedItems !== undefined && {
              importedItems: progress.importedItems,
            }),
            ...(progress.failedItems !== undefined && { failedItems: progress.failedItems }),
          })
          .where(eq(syncSessions.id, sessionId));
      }
    },
  };

  // Execute calendar sync with progress tracking
  const result = await GoogleCalendarService.syncUserCalendars(userId, syncOptions);

  if (!result.success) {
    // Update session with error
    await db
      .update(syncSessions)
      .set({
        status: "failed",
        currentStep: "Calendar sync failed",
        errorDetails: {
          error: result.error ?? "Unknown error",
          timestamp: new Date().toISOString(),
        },
        completedAt: new Date(),
      })
      .where(eq(syncSessions.id, sessionId));

    await logger.error("Calendar sync failed", {
      operation: "calendar_sync_blocking",
      additionalData: {
        userId,
        sessionId,
        batchId,
        error: result.error,
      },
    });

    throw new Error(result.error ?? "Failed to sync calendar events");
  }

  // Update session: starting normalization
  await db
    .update(syncSessions)
    .set({
      status: "processing",
      currentStep: "Processing calendar events...",
      progressPercentage: 75,
    })
    .where(eq(syncSessions.id, sessionId));

  // Immediately process normalization jobs instead of queueing
  let processedJobs = 0;
  if (result.syncedEvents && result.syncedEvents > 0) {
    try {
      // Create normalization job for calendar events
      await enqueue("normalize", { batchId, provider: "calendar" }, userId, batchId);

      // Process the job immediately
      const jobRunner = new JobRunner();
      const jobResult = await jobRunner.processUserJobs(userId, 10);
      processedJobs = jobResult.succeeded;

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
    } catch (jobError) {
      await logger.warn("Failed to process calendar normalization jobs", {
        operation: "calendar_sync_blocking",
        additionalData: {
          userId,
          sessionId,
          batchId,
          syncedEvents: result.syncedEvents,
          error: jobError instanceof Error ? jobError.message : String(jobError),
        },
      });
    }
  }

  // Update session: completed
  await db
    .update(syncSessions)
    .set({
      status: "completed",
      processedItems: processedJobs,
      currentStep: "Calendar sync completed",
      progressPercentage: 100,
      completedAt: new Date(),
    })
    .where(eq(syncSessions.id, sessionId));

  await logger.info("Blocking Calendar sync completed", {
    operation: "calendar_sync_blocking",
    additionalData: {
      userId,
      sessionId,
      batchId,
      syncedEvents: result.syncedEvents,
      processedJobs,
      syncDaysPast,
      syncDaysFuture,
    },
  });

  // Determine success message
  let message: string;
  if (result.syncedEvents && result.syncedEvents > 0) {
    message = `Successfully synced ${result.syncedEvents} calendar events and processed ${processedJobs} normalizations`;
  } else {
    message = `Calendar sync completed - no new events found in the specified date range`;
  }

  return {
    sessionId,
    message,
    stats: {
      syncedEvents: result.syncedEvents || 0,
      processedJobs,
      daysPast: syncDaysPast,
      daysFuture: syncDaysFuture,
      maxResults,
      batchId,
    },
    partialFailure: false, // Calendar service handles individual failures internally
  };
});
