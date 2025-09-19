/**
 * POST /api/google/gmail/sync-blocking — Blocking Gmail sync with real-time progress
 *
 * This endpoint provides a complete synchronous Gmail sync experience:
 * - Creates sync session for tracking progress
 * - Imports Gmail messages into raw_events
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
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { userIntegrations, rawEvents, syncSessions } from "@/server/db/schema";
import { getGoogleClients } from "@/server/google/client";
import { listGmailMessageIds } from "@/server/google/gmail";
import { and, eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { JobRunner } from "@/server/jobs/runner";
import { enqueue } from "@/server/jobs/enqueue";
import { ErrorTrackingService } from "@/server/services/error-tracking.service";
import { z } from "zod";

// Request schema: includes sync preferences and parameters
const syncBlockingSchema = z.object({
  // Sync preferences (from Phase 3)
  preferences: z.object({
    gmailQuery: z.string().optional(),
    gmailLabelIncludes: z.array(z.string()).optional(),
    gmailLabelExcludes: z.array(z.string()).optional(),
    gmailTimeRangeDays: z.number().int().min(1).max(730).optional(),
  }).optional(),
  // Sync parameters
  incremental: z.boolean().optional().default(false), // Default to full sync for manual operations
  overlapHours: z.number().int().min(0).max(72).optional().default(0),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_sync_blocking" },
  validation: { body: syncBlockingSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("google.gmail.sync-blocking", requestId);
  const { preferences, incremental, overlapHours } = validated.body;

  let sessionId: string | null = null;
  let batchId: string | undefined;

  try {
    const db = await getDb();

    // Verify Gmail integration exists
    const [gmailIntegration, unifiedIntegration] = await Promise.all([
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
            eq(userIntegrations.service, "unified"),
          ),
        )
        .limit(1),
    ]);

    const integration = unifiedIntegration[0] ?? gmailIntegration[0];
    if (!integration) {
      return api.error("Gmail not connected", "VALIDATION_ERROR");
    }

    // Create sync session
    const sessionInsert = await db
      .insert(syncSessions)
      .values({
        userId,
        service: "gmail",
        status: "started",
        currentStep: "Initializing Gmail sync...",
        progressPercentage: 0,
        preferences: preferences ?? {},
      })
      .returning({ id: syncSessions.id });

    sessionId = sessionInsert[0]?.id || null;
    if (!sessionId) {
      return api.error("Failed to create sync session", "INTERNAL_ERROR");
    }

    // Get Gmail client
    const { gmail } = await getGoogleClients(userId);

    // Build Gmail query from preferences
    let query = preferences?.gmailQuery ?? "category:primary -in:chats -in:drafts";

    // Add time range constraint
    const timeRangeDays = preferences?.gmailTimeRangeDays ?? 365;
    if (incremental) {
      // For incremental sync, find last sync boundary
      const last = await db
        .select({ createdAt: rawEvents.createdAt })
        .from(rawEvents)
        .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "gmail")))
        .orderBy(desc(rawEvents.createdAt))
        .limit(1);

      if (last[0]?.createdAt) {
        const boundary = new Date(last[0].createdAt);
        if (overlapHours && overlapHours > 0) {
          boundary.setHours(boundary.getHours() - overlapHours);
        }
        const yyyy = boundary.getFullYear();
        const mm = String(boundary.getMonth() + 1).padStart(2, "0");
        const dd = String(boundary.getDate()).padStart(2, "0");
        query += ` after:${yyyy}/${mm}/${dd}`;
      } else {
        query += ` newer_than:${timeRangeDays}d`;
      }
    } else {
      query += ` newer_than:${timeRangeDays}d`;
    }

    // Add label filters
    if (preferences?.gmailLabelIncludes?.length) {
      const labelQuery = preferences.gmailLabelIncludes.map(label => `label:${label}`).join(' OR ');
      query += ` (${labelQuery})`;
    }
    if (preferences?.gmailLabelExcludes?.length) {
      const excludeQuery = preferences.gmailLabelExcludes.map(label => `-label:${label}`).join(' ');
      query += ` ${excludeQuery}`;
    }

    batchId = randomUUID();

    await logger.info("Blocking Gmail sync started", {
      operation: "gmail_sync_blocking",
      additionalData: {
        userId,
        sessionId,
        query,
        batchId,
        incremental,
      },
    });

    // Update session: fetching message list
    await db
      .update(syncSessions)
      .set({
        status: "importing",
        currentStep: "Fetching Gmail message list...",
        progressPercentage: 5,
      })
      .where(eq(syncSessions.id, sessionId));

    // Fetch Gmail message IDs
    const { ids, pages } = await listGmailMessageIds(gmail, query, userId);

    // Update session: starting message import
    await db
      .update(syncSessions)
      .set({
        totalItems: ids.length,
        currentStep: `Importing ${ids.length} Gmail messages...`,
        progressPercentage: 10,
      })
      .where(eq(syncSessions.id, sessionId));

    let processed = 0;
    let inserted = 0;
    let errors = 0;

    // Process messages in parallel batches with progress updates
    const BATCH_SIZE = 20;
    const PARALLEL_BATCHES = 5;
    const totalToProcess = ids.length;

    for (let i = 0; i < totalToProcess; i += BATCH_SIZE * PARALLEL_BATCHES) {
      // Create parallel batch promises
      const batchPromises = [];

      for (let j = 0; j < PARALLEL_BATCHES && i + j * BATCH_SIZE < totalToProcess; j++) {
        const startIdx = i + j * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, totalToProcess);
        const batchIds = ids.slice(startIdx, endIdx);

        if (batchIds.length === 0) break;

        const batchPromise = Promise.all(
          batchIds.map(async (messageId) => {
            try {
              const response = await gmail.users.messages.get({
                userId: "me",
                id: messageId,
                format: "full",
              });

              const msg = response.data;
              if (!msg) {
                return { success: false, error: "No message data" };
              }

              const internalMs = Number(msg.internalDate ?? 0);
              const occurredAt = internalMs ? new Date(internalMs) : new Date();

              await db
                .insert(rawEvents)
                .values({
                  userId,
                  provider: "gmail",
                  payload: msg,
                  occurredAt,
                  contactId: null,
                  batchId,
                  sourceMeta: {
                    labelIds: msg.labelIds ?? [],
                    fetchedAt: new Date().toISOString(),
                    matchedQuery: query,
                    syncType: "blocking_sync",
                    sessionId,
                  },
                  sourceId: msg.id ?? null,
                })
                .onConflictDoUpdate({
                  target: [rawEvents.userId, rawEvents.provider, rawEvents.sourceId],
                  set: {
                    payload: msg,
                    occurredAt,
                    sourceMeta: {
                      labelIds: msg.labelIds ?? [],
                      fetchedAt: new Date().toISOString(),
                      matchedQuery: query,
                      syncType: "blocking_sync",
                      sessionId,
                    },
                    batchId,
                  },
                });

              return { success: true };
            } catch (error) {
              // Enhanced error tracking with classification
              const errorMessage = error instanceof Error ? error.message : String(error);

              // Record error in our comprehensive tracking system
              await ErrorTrackingService.recordError(userId, ensureError(error), {
                provider: 'gmail',
                stage: 'ingestion',
                operation: 'gmail_message_fetch',
                sessionId: sessionId ?? undefined,
                batchId: batchId ?? undefined,
                itemId: messageId,
                additionalMeta: {
                  syncType: 'blocking_sync',
                  query,
                  messageId
                }
              });

              await logger.warn("Failed to process Gmail message", {
                operation: "gmail_sync_blocking",
                additionalData: {
                  userId,
                  sessionId,
                  messageId,
                  error: errorMessage,
                },
              });
              return {
                success: false,
                error: errorMessage,
              };
            }
          }),
        );

        batchPromises.push(batchPromise);
      }

      // Wait for parallel batches to complete
      const batchResults = await Promise.all(batchPromises);

      // Count results and update progress
      for (const batchResult of batchResults) {
        for (const result of batchResult) {
          processed++;
          if (result.success) {
            inserted++;
          } else {
            errors++;
            // Log individual errors for debugging but continue processing
            await logger.debug("Gmail message processing error", {
              operation: "gmail_sync_blocking",
              additionalData: {
                userId,
                sessionId,
                error: result.error,
              },
            });
          }
        }
      }

      // Update progress (import phase: 10% to 70%)
      const importProgress = Math.min(70, 10 + Math.floor((processed / totalToProcess) * 60));
      await db
        .update(syncSessions)
        .set({
          importedItems: inserted,
          failedItems: errors,
          currentStep: `Imported ${inserted}/${totalToProcess} messages...`,
          progressPercentage: importProgress,
        })
        .where(eq(syncSessions.id, sessionId));

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Update session: starting normalization
    await db
      .update(syncSessions)
      .set({
        status: "processing",
        currentStep: "Processing imported messages...",
        progressPercentage: 75,
      })
      .where(eq(syncSessions.id, sessionId));

    // Immediately process normalization jobs instead of queueing
    let processedJobs = 0;
    if (inserted > 0) {
      try {
        // Create normalization job
        await enqueue("normalize", { batchId, provider: "gmail" }, userId, batchId);

        // Process the job immediately
        const jobRunner = new JobRunner();
        const jobResult = await jobRunner.processUserJobs(userId, 10); // Process up to 10 jobs
        processedJobs = jobResult.succeeded;

        if (jobResult.failed > 0) {
          await logger.warn("Some normalization jobs failed", {
            operation: "gmail_sync_blocking",
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
        await logger.warn("Failed to process normalization jobs", {
          operation: "gmail_sync_blocking",
          additionalData: {
            userId,
            sessionId,
            batchId,
            inserted,
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
        currentStep: "Gmail sync completed",
        progressPercentage: 100,
        completedAt: new Date(),
      })
      .where(eq(syncSessions.id, sessionId));

    await logger.info("Blocking Gmail sync completed", {
      operation: "gmail_sync_blocking",
      additionalData: {
        userId,
        sessionId,
        batchId,
        totalFound: ids.length,
        processed,
        inserted,
        errors,
        processedJobs,
        pages,
      },
    });

    // Get comprehensive error summary for enhanced response
    const errorSummary = errors > 0 ? await ErrorTrackingService.getErrorSummary(userId, {
      includeResolved: false,
      timeRangeHours: 1, // Just from this sync session
    }) : null;

    // Determine success message based on error count
    const successRate = processed > 0 ? (inserted / processed) * 100 : 100;
    let message: string;

    if (errors === 0) {
      message = `Successfully synced ${inserted} emails and processed ${processedJobs} normalizations`;
    } else if (inserted > 0) {
      message = `Partially successful: synced ${inserted} of ${processed} emails (${errors} failed) and processed ${processedJobs} normalizations`;
    } else {
      message = `Sync completed with limited success: ${errors} emails failed to process`;
    }

    return api.success({
      sessionId,
      message,
      stats: {
        totalFound: ids.length,
        processed,
        inserted,
        errors,
        processedJobs,
        successRate: Math.round(successRate),
        batchId,
      },
      partialFailure: errors > 0,
      // Enhanced error information
      errorSummary: errorSummary ? {
        totalErrors: errorSummary.totalErrors,
        criticalErrors: errorSummary.criticalErrors.length,
        retryableErrors: errorSummary.retryableErrors.length,
        errorsByCategory: errorSummary.errorsByCategory,
        recentErrors: errorSummary.recentErrors.slice(0, 3), // Latest 3 errors for quick review
      } : null,
      recommendations: errors > 0 ? [
        errors > 10 ? "High error rate detected. Check your network connection and Google account status." : null,
        errorSummary?.retryableErrors.length ? `${errorSummary.retryableErrors.length} errors can be automatically retried.` : null,
        errorSummary?.criticalErrors.length ? "Critical errors detected that may require immediate attention." : null,
        "View detailed error analysis in the sync results for specific recovery steps."
      ].filter(Boolean) : null,
    });
  } catch (error) {
    // Record the sync failure in our comprehensive error tracking
    await ErrorTrackingService.recordError(userId, ensureError(error), {
      provider: 'gmail',
      stage: 'ingestion',
      operation: 'gmail_sync_blocking_failure',
      sessionId: sessionId ?? undefined,
      batchId: batchId ?? undefined,
      additionalMeta: {
        syncType: 'blocking_sync',
        preferences,
        incremental,
        overlapHours
      }
    });

    // Update session with error if we have one
    if (sessionId) {
      try {
        const db = await getDb();
        await db
          .update(syncSessions)
          .set({
            status: "failed",
            currentStep: "Sync failed",
            errorDetails: {
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            },
            completedAt: new Date(),
          })
          .where(eq(syncSessions.id, sessionId));
      } catch (updateError) {
        // Log but don't throw - we want to return the original error
        await logger.error("Failed to update session with error", {
          operation: "gmail_sync_blocking",
          additionalData: { sessionId, originalError: String(error) },
        }, ensureError(updateError));
      }
    }

    await logger.error(
      "Blocking Gmail sync failed",
      {
        operation: "gmail_sync_blocking",
        additionalData: { userId, sessionId },
      },
      ensureError(error),
    );

    return api.error(
      "Failed to sync Gmail messages",
      "INTERNAL_ERROR",
      {
        sessionId,
        canRetry: true,
        suggestions: [
          "Check your internet connection",
          "Verify your Google account is still connected",
          "Try again in a few minutes",
          "Contact support if the problem persists"
        ]
      },
      ensureError(error),
    );
  }
});