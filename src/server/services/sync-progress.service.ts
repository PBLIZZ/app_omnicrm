/**
 * SyncProgressService - Manages sync session progress tracking
 *
 * This service provides real-time progress tracking for manual sync operations,
 * enabling blocking UI with live updates and comprehensive error handling.
 */

import { getDb } from "@/server/db/client";
import { syncSessions } from "@/server/db/schema";
import { eq, lt } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { SyncSession, NewSyncSession } from "@/server/db/types";

export interface SyncProgressUpdate {
  status?:
    | "started"
    | "importing"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | undefined;
  progressPercentage?: number | undefined;
  currentStep?: string | undefined;
  totalItems?: number | undefined;
  importedItems?: number | undefined;
  processedItems?: number | undefined;
  failedItems?: number | undefined;
  errorDetails?: Record<string, unknown> | undefined;
}

export interface SyncProgressData {
  sessionId: string;
  service: SyncService;
  status: string;
  progress: {
    percentage: number;
    currentStep?: string | undefined;
    totalItems: number;
    importedItems: number;
    processedItems: number;
    failedItems: number;
  };
  timeEstimate?:
    | {
        remainingSeconds: number;
        completedAt?: string | undefined;
      }
    | undefined;
  errors?:
    | Array<{
        stage: string;
        message: string;
        recoverable: boolean;
      }>
    | undefined;
  startedAt: string;
  completedAt?: string | undefined;
}

type SyncService = "gmail" | "calendar" | "drive";

export class SyncProgressService {
  /**
   * Create a new sync session for progress tracking
   */
  static async createSession(userId: string, service: SyncService): Promise<string> {
    const db = await getDb();
    const sessionId = randomUUID();

    const sessionData: NewSyncSession = {
      id: sessionId,
      user_id: userId,
      service,
      status: "started",
      progress_percentage: 0,
      current_step: "Initializing sync...",
      total_items: 0,
      imported_items: 0,
      processed_items: 0,
      failed_items: 0,
      error_details: {},
      preferences: {},
      started_at: new Date(),
      completed_at: null,
    };

    await db.insert(syncSessions).values(sessionData);
    return sessionId;
  }

  /**
   * Update sync session progress
   */
  static async updateProgress(sessionId: string, updates: SyncProgressUpdate): Promise<void> {
    const db = await getDb();

    const updateData: Partial<SyncSession> = {};

    if (updates.status !== undefined) {
      updateData.status = updates.status;
      if (
        updates.status === "completed" ||
        updates.status === "failed" ||
        updates.status === "cancelled"
      ) {
        updateData.completed_at = new Date();
      }
    }

    if (updates.progressPercentage !== undefined) {
      if (
        typeof updates.progressPercentage !== "number" ||
        !Number.isFinite(updates.progressPercentage)
      ) {
        throw new Error("progressPercentage must be a finite number");
      }
      updateData.progress_percentage = Math.max(0, Math.min(100, updates.progressPercentage));
    }

    if (updates.currentStep !== undefined) {
      updateData.current_step = updates.currentStep;
    }

    if (updates.totalItems !== undefined) {
      if (
        typeof updates.totalItems !== "number" ||
        !Number.isInteger(updates.totalItems) ||
        updates.totalItems < 0
      ) {
        throw new Error("totalItems must be a non-negative integer");
      }
      updateData.total_items = updates.totalItems;
    }

    if (updates.importedItems !== undefined) {
      if (
        typeof updates.importedItems !== "number" ||
        !Number.isInteger(updates.importedItems) ||
        updates.importedItems < 0
      ) {
        throw new Error("importedItems must be a non-negative integer");
      }
      updateData.imported_items = updates.importedItems;
    }

    if (updates.processedItems !== undefined) {
      if (
        typeof updates.processedItems !== "number" ||
        !Number.isInteger(updates.processedItems) ||
        updates.processedItems < 0
      ) {
        throw new Error("processedItems must be a non-negative integer");
      }
      updateData.processed_items = updates.processedItems;
    }

    if (updates.failedItems !== undefined) {
      if (
        typeof updates.failedItems !== "number" ||
        !Number.isInteger(updates.failedItems) ||
        updates.failedItems < 0
      ) {
        throw new Error("failedItems must be a non-negative integer");
      }
      updateData.failed_items = updates.failedItems;
    }

    if (updates.errorDetails !== undefined) {
      updateData.error_details = updates.errorDetails;
    }

    await db.update(syncSessions).set(updateData).where(eq(syncSessions.id, sessionId));
  }

  /**
   * Get current sync session data
   */
  static async getSession(sessionId: string): Promise<SyncSession | null> {
    const db = await getDb();

    const sessions = await db
      .select()
      .from(syncSessions)
      .where(eq(syncSessions.id, sessionId))
      .limit(1);

    return sessions[0] ?? null;
  }

  /**
   * Get formatted progress data for API responses
   */
  static async getProgressData(sessionId: string): Promise<SyncProgressData | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const errors: Array<{ stage: string; message: string; recoverable: boolean }> = [];

    // Define error detail interface
    interface ErrorDetail {
      stage: string;
      message: string;
      recoverable: boolean;
    }

    interface ErrorDetailsObject {
      errors?: unknown[];
    }

    // Type guard for error details object
    function isErrorDetailsObject(obj: unknown): obj is ErrorDetailsObject {
      if (obj === null || typeof obj !== "object") {
        return false;
      }

      const objRecord = obj as Record<string, unknown>;
      return !("errors" in objRecord) || Array.isArray(objRecord["errors"]);
    }

    // Type guard for individual error objects
    function isErrorObject(obj: unknown): obj is Record<string, unknown> {
      return obj !== null && typeof obj === "object";
    }

    // Parse error details if present with proper type guards
    if (session.errorDetails && isErrorDetailsObject(session.errorDetails)) {
      const errorObj = session.errorDetails;
      if (errorObj.errors && Array.isArray(errorObj.errors)) {
        errors.push(
          ...errorObj.errors.filter(isErrorObject).map(
            (err): ErrorDetail => ({
              stage: typeof err["stage"] === "string" ? err["stage"] : "unknown",
              message: typeof err["message"] === "string" ? err["message"] : "Unknown error",
              recoverable: typeof err["recoverable"] === "boolean" ? err["recoverable"] : true, // Default to recoverable
            }),
          ),
        );
      }
    }

    // Calculate time estimate based on progress
    let timeEstimate: { remainingSeconds: number; completedAt?: string } | undefined;
    if (session.status === "importing" || session.status === "processing") {
      const startTime = session.startedAt.getTime();
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = session.progressPercentage ?? 0;

      if (progress > 0 && progress < 100) {
        const estimatedTotal = (elapsed / progress) * 100;
        const remaining = Math.max(0, estimatedTotal - elapsed);
        const remainingSeconds = Math.ceil(remaining / 1000);
        const completedAt = new Date(currentTime + remaining).toISOString();

        timeEstimate = { remainingSeconds, completedAt };
      }
    }

    // Type guard for service validation
    function isValidService(service: string): service is SyncService {
      return service === "gmail" || service === "calendar" || service === "drive";
    }

    if (!isValidService(session.service)) {
      throw new Error(`Invalid service type: ${session.service}`);
    }

    return {
      sessionId: session.id,
      service: session.service,
      status: session.status,
      progress: {
        percentage: session.progressPercentage ?? 0,
        currentStep: session.currentStep ?? undefined,
        totalItems: session.totalItems ?? 0,
        importedItems: session.importedItems ?? 0,
        processedItems: session.processedItems ?? 0,
        failedItems: session.failedItems ?? 0,
      },
      timeEstimate,
      errors: errors.length > 0 ? errors : undefined,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
    };
  }

  /**
   * Mark session as failed with error details
   */
  static async markFailed(
    sessionId: string,
    error: string,
    stage: string = "unknown",
  ): Promise<void> {
    await this.updateProgress(sessionId, {
      status: "failed",
      progressPercentage: 0,
      currentStep: `Failed: ${error}`,
      errorDetails: {
        errors: [
          {
            stage,
            message: error,
            recoverable: false,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
  }

  /**
   * Mark session as completed
   */
  static async markCompleted(
    sessionId: string,
    finalCounts: {
      totalItems: number;
      importedItems: number;
      processedItems: number;
      failedItems: number;
    },
  ): Promise<void> {
    await this.updateProgress(sessionId, {
      status: "completed",
      progressPercentage: 100,
      currentStep: "Sync completed successfully",
      ...finalCounts,
    });
  }

  /**
   * Cancel a sync session
   */
  static async cancelSession(sessionId: string): Promise<void> {
    await this.updateProgress(sessionId, {
      status: "cancelled",
      currentStep: "Sync cancelled by user",
    });
  }

  /**
   * Clean up old sync sessions (older than specified days)
   */
  static async cleanupOldSessions(olderThanDays: number = 7): Promise<number> {
    const db = await getDb();
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    // First get the sessions to delete to count them
    const sessionsToDelete = await db
      .select({ id: syncSessions.id })
      .from(syncSessions)
      .where(lt(syncSessions.createdAt, cutoffDate));

    if (sessionsToDelete.length === 0) {
      return 0;
    }

    // Delete the sessions
    await db.delete(syncSessions).where(lt(syncSessions.createdAt, cutoffDate));

    return sessionsToDelete.length;
  }
}
