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
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { getDb } from "@/server/db/client";
import { syncSessions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { GmailSyncService } from "@/server/services/gmail-sync.service";
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
  const { preferences, incremental, overlapHours } = validated.body;

  let sessionId: string | null = null;

  try {
    const db = await getDb();

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
      return NextResponse.json({ error: "Failed to create sync session" }, { status: 500 });
    }

    // Update session: starting sync
    await db
      .update(syncSessions)
      .set({
        status: "importing",
        currentStep: "Starting Gmail sync...",
        progressPercentage: 10,
      })
      .where(eq(syncSessions.id, sessionId));

    // Calculate time range based on preferences
    const timeRangeDays = preferences?.gmailTimeRangeDays ?? 365;

    // Use the service for the actual sync with blocking behavior
    const result = await GmailSyncService.syncGmailBlocking(userId, {
      incremental,
      overlapHours,
      daysBack: timeRangeDays,
      blocking: true,
    });

    // Update session with final results
    await db
      .update(syncSessions)
      .set({
        status: "completed",
        totalItems: result.stats.totalFound,
        importedItems: result.stats.inserted,
        processedItems: result.normalizedCount || 0,
        failedItems: result.stats.errors,
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
        stats: result.stats,
        normalizedCount: result.normalizedCount,
      },
    });

    // Get error summary if there were errors
    const errorSummary = result.stats.errors > 0 ? await ErrorTrackingService.getErrorSummary(userId, {
      includeResolved: false,
      timeRangeHours: 1,
    }) : null;

    const successRate = result.stats.processed > 0 ? (result.stats.inserted / result.stats.processed) * 100 : 100;

    return NextResponse.json({
      sessionId,
      message: result.message,
      stats: {
        ...result.stats,
        processedJobs: result.normalizedCount || 0,
        successRate: Math.round(successRate),
      },
      partialFailure: result.stats.errors > 0,
      errorSummary: errorSummary ? {
        totalErrors: errorSummary.totalErrors,
        criticalErrors: errorSummary.criticalErrors.length,
        retryableErrors: errorSummary.retryableErrors.length,
        errorsByCategory: errorSummary.errorsByCategory,
        recentErrors: errorSummary.recentErrors.slice(0, 3),
      } : null,
      recommendations: result.stats.errors > 0 ? [
        result.stats.errors > 10 ? "High error rate detected. Check your network connection and Google account status." : null,
        errorSummary?.retryableErrors.length ? `${errorSummary.retryableErrors.length} errors can be automatically retried.` : null,
        errorSummary?.criticalErrors.length ? "Critical errors detected that may require immediate attention." : null,
        "View detailed error analysis in the sync results for specific recovery steps."
      ].filter(Boolean) : null,
    });

  } catch (error) {
    // Record the sync failure
    await ErrorTrackingService.recordError(userId, ensureError(error), {
      provider: 'gmail',
      stage: 'ingestion',
      operation: 'gmail_sync_blocking_failure',
      sessionId: sessionId ?? undefined,
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
        await logger.error("Failed to update session with error", {
          operation: "gmail_sync_blocking",
          additionalData: { sessionId, originalError: String(error) },
        }, ensureError(updateError));
      }
    }

    if (error instanceof Error && error.message === "Gmail not connected") {
      return NextResponse.json({ error: "Gmail not connected", sessionId }, { status: 400 });
    }

    return NextResponse.json({
      error: "Failed to sync Gmail messages",
      sessionId,
      canRetry: true,
      suggestions: [
        "Check your internet connection",
        "Verify your Google account is still connected",
        "Try again in a few minutes",
        "Contact support if the problem persists"
      ]
    }, { status: 500 });
  }
});