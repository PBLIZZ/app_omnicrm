/**
 * GET /api/sync-progress/[sessionId] — Real-time sync progress tracking
 *
 * This endpoint provides real-time progress updates for sync sessions:
 * - Returns current sync session status
 * - Provides progress percentage and step information
 * - Includes detailed statistics (imported, processed, failed items)
 * - Supports polling for real-time updates
 *
 * Key Features:
 * - Real-time progress tracking
 * - Detailed error information
 * - Session completion detection
 * - User-scoped security (RLS)
 */
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { syncSessions } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { z } from "zod";

// URL params schema
const paramsSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "sync_progress" },
  validation: { params: paramsSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("sync.progress", requestId);
  const { sessionId } = validated.params;

  try {
    const db = await getDb();

    // Fetch session with user validation (RLS-style check)
    const session = await db
      .select()
      .from(syncSessions)
      .where(
        and(
          eq(syncSessions.id, sessionId),
          eq(syncSessions.userId, userId), // Ensure user can only access their own sessions
        ),
      )
      .limit(1);

    if (!session[0]) {
      return api.error("Sync session not found", "NOT_FOUND");
    }

    const sessionData = session[0];

    // Calculate time estimates if session is still active
    let timeEstimate: { remainingSeconds: number; eta?: string } | undefined;

    if (sessionData.status === "importing" || sessionData.status === "processing") {
      const elapsed = Date.now() - sessionData.startedAt.getTime();
      const progress = sessionData.progressPercentage ?? 0;

      if (progress > 0 && progress < 100) {
        // Estimate remaining time based on current progress
        const estimatedTotal = (elapsed / progress) * 100;
        const remainingMs = estimatedTotal - elapsed;
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

        const eta = new Date(Date.now() + remainingMs).toISOString();
        timeEstimate = {
          remainingSeconds,
          eta,
        };
      }
    }

    // Format response with comprehensive progress information
    const progressData = {
      sessionId,
      service: sessionData.service,
      status: sessionData.status,
      progress: {
        percentage: sessionData.progressPercentage ?? 0,
        currentStep: sessionData.currentStep ?? "Initializing...",
        totalItems: sessionData.totalItems ?? 0,
        importedItems: sessionData.importedItems ?? 0,
        processedItems: sessionData.processedItems ?? 0,
        failedItems: sessionData.failedItems ?? 0,
      },
      timeEstimate,
      timestamps: {
        startedAt: sessionData.startedAt.toISOString(),
        completedAt: sessionData.completedAt?.toISOString(),
        lastUpdate: sessionData.updatedAt.toISOString(),
      },
      errorDetails: sessionData.errorDetails ?? null,
      preferences: sessionData.preferences ?? {},
    };

    // Log progress check (debug level to avoid spam)
    await logger.debug("Sync progress check", {
      operation: "sync_progress",
      additionalData: {
        userId,
        sessionId,
        status: sessionData.status,
        progressPercentage: sessionData.progressPercentage,
        currentStep: sessionData.currentStep,
      },
    });

    return api.success(progressData);
  } catch (error) {
    await logger.error(
      "Failed to get sync progress",
      {
        operation: "sync_progress",
        additionalData: { userId, sessionId },
      },
      ensureError(error),
    );

    return api.error(
      "Failed to retrieve sync progress",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

/**
 * DELETE /api/sync-progress/[sessionId] — Cancel ongoing sync session
 *
 * This endpoint allows users to cancel ongoing sync operations:
 * - Marks session as cancelled
 * - Attempts graceful cleanup
 * - Preserves partial progress data
 *
 * Note: Due to the synchronous nature of blocking sync endpoints,
 * cancellation may not stop the operation immediately but will
 * mark it as cancelled for UI purposes.
 */
export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "sync_cancel" },
  validation: { params: paramsSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("sync.cancel", requestId);
  const { sessionId } = validated.params;

  try {
    const db = await getDb();

    // Verify session exists and belongs to user
    const session = await db
      .select()
      .from(syncSessions)
      .where(
        and(
          eq(syncSessions.id, sessionId),
          eq(syncSessions.userId, userId),
        ),
      )
      .limit(1);

    if (!session[0]) {
      return api.error("Sync session not found", "NOT_FOUND");
    }

    const sessionData = session[0];

    // Only allow cancellation of active sessions
    if (!["started", "importing", "processing"].includes(sessionData.status)) {
      return api.error(
        `Cannot cancel ${sessionData.status} sync session`,
        "VALIDATION_ERROR"
      );
    }

    // Update session to cancelled status
    await db
      .update(syncSessions)
      .set({
        status: "cancelled",
        currentStep: "Sync cancelled by user",
        completedAt: new Date(),
        errorDetails: {
          cancelled: true,
          cancelledAt: new Date().toISOString(),
          reason: "User requested cancellation",
        },
      })
      .where(eq(syncSessions.id, sessionId));

    await logger.info("Sync session cancelled", {
      operation: "sync_cancel",
      additionalData: {
        userId,
        sessionId,
        service: sessionData.service,
        originalStatus: sessionData.status,
        progressPercentage: sessionData.progressPercentage,
      },
    });

    return api.success({
      sessionId,
      message: "Sync session cancelled",
      status: "cancelled",
    });
  } catch (error) {
    await logger.error(
      "Failed to cancel sync session",
      {
        operation: "sync_cancel",
        additionalData: { userId, sessionId },
      },
      ensureError(error),
    );

    return api.error(
      "Failed to cancel sync session",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});