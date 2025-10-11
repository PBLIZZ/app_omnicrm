import { getDb } from "@/server/db/client";
import { syncSessions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { GmailSyncService } from "@/server/services/gmail-sync.service";
import { ErrorTrackingService } from "@/server/services/error-tracking.service";
import { z } from "zod";

export interface SyncBlockingRequest {
  preferences?: {
    gmailQuery?: string;
    gmailLabelIncludes?: string[];
    gmailLabelExcludes?: string[];
    gmailTimeRangeDays?: number;
  };
  incremental?: boolean;
  overlapHours?: number;
}

export interface SyncBlockingResponse {
  sessionId: string;
  message: string;
  stats: {
    totalFound: number;
    inserted: number;
    processed: number;
    errors: number;
    processedJobs: number;
    successRate: number;
  };
  partialFailure: boolean;
  errorSummary?: {
    totalErrors: number;
    criticalErrors: number;
    retryableErrors: number;
    errorsByCategory: Record<string, number>;
    recentErrors: Array<{
      id: string;
      message: string;
      category: string;
      severity: string;
      timestamp: string;
    }>;
  };
  recommendations?: string[];
}

const syncBlockingSchema = z.object({
  preferences: z
    .object({
      gmailQuery: z.string().optional(),
      gmailLabelIncludes: z.array(z.string()).optional(),
      gmailLabelExcludes: z.array(z.string()).optional(),
      gmailTimeRangeDays: z.number().int().min(1).max(730).optional(),
    })
    .optional(),
  incremental: z.boolean().optional().default(false),
  overlapHours: z.number().int().min(0).max(72).optional().default(0),
});

export class GmailSyncBlockingService {
  /**
   * Execute a blocking Gmail sync with real-time progress tracking
   *
   * @param userId - The user ID
   * @param requestData - Sync request parameters
   * @returns Promise<SyncBlockingResponse> - Complete sync results
   */
  static async executeBlockingSync(
    userId: string,
    requestData: SyncBlockingRequest,
  ): Promise<SyncBlockingResponse> {
    const validatedData = syncBlockingSchema.parse(requestData);
    const { preferences, incremental, overlapHours } = validatedData;

    let sessionId: string | null = null;

    try {
      // Create sync session
      sessionId = await this.createSyncSession(userId, preferences);

      // Update session: starting sync
      await this.updateSyncSession(sessionId, {
        status: "importing",
        currentStep: "Starting Gmail sync...",
        progressPercentage: 10,
      });

      // Calculate time range based on preferences
      const timeRangeDays = preferences?.gmailTimeRangeDays ?? 365;

      // Execute the actual sync with blocking behavior
      const result = await GmailSyncService.syncGmailBlocking(userId, {
        incremental,
        overlapHours,
        daysBack: timeRangeDays,
        blocking: true,
      });

      // Update session with final results
      await this.updateSyncSession(sessionId, {
        status: "completed",
        totalItems: result.stats.totalFound,
        importedItems: result.stats.inserted,
        processedItems: result.normalizedCount || 0,
        failedItems: result.stats.errors,
        currentStep: "Gmail sync completed",
        progressPercentage: 100,
        completedAt: new Date(),
      });

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
      const errorSummary =
        result.stats.errors > 0
          ? await ErrorTrackingService.getErrorSummary(userId, {
              includeResolved: false,
              timeRangeHours: 1,
            })
          : null;

      const successRate =
        result.stats.processed > 0 ? (result.stats.inserted / result.stats.processed) * 100 : 100;

      return {
        sessionId,
        message: result.message,
        stats: {
          ...result.stats,
          processedJobs: result.normalizedCount || 0,
          successRate: Math.round(successRate),
        },
        partialFailure: result.stats.errors > 0,
        errorSummary: errorSummary
          ? {
              totalErrors: errorSummary.totalErrors,
              criticalErrors: errorSummary.criticalErrors.length,
              retryableErrors: errorSummary.retryableErrors.length,
              errorsByCategory: errorSummary.errorsByCategory,
              recentErrors: errorSummary.recentErrors.slice(0, 3),
            }
          : undefined,
        recommendations:
          result.stats.errors > 0
            ? this.generateRecommendations(result.stats, errorSummary)
            : undefined,
      };
    } catch (error) {
      // Record the sync failure
      await ErrorTrackingService.recordError(userId, ensureError(error), {
        provider: "gmail",
        stage: "ingestion",
        operation: "gmail_sync_blocking_failure",
        sessionId: sessionId ?? undefined,
        additionalMeta: {
          syncType: "blocking_sync",
          preferences,
          incremental,
        },
      });

      // Update session with error if we have one
      if (sessionId) {
        await this.updateSyncSession(sessionId, {
          status: "failed",
          currentStep: "Sync failed",
          errorDetails: {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
          completedAt: new Date(),
        });
      }

      throw error;
    }
  }

  /**
   * Create a new sync session for tracking progress
   *
   * @param userId - The user ID
   * @param preferences - Sync preferences
   * @returns Promise<string> - Session ID
   */
  private static async createSyncSession(
    userId: string,
    preferences?: SyncBlockingRequest["preferences"],
  ): Promise<string> {
    const db = await getDb();

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

    const sessionId = sessionInsert[0]?.id;
    if (!sessionId) {
      throw new Error("Failed to create sync session");
    }

    return sessionId;
  }

  /**
   * Update sync session with new data
   *
   * @param sessionId - The session ID
   * @param updates - Session updates
   */
  private static async updateSyncSession(
    sessionId: string,
    updates: Partial<typeof syncSessions.$inferInsert>,
  ): Promise<void> {
    const db = await getDb();

    await db.update(syncSessions).set(updates).where(eq(syncSessions.id, sessionId));
  }

  /**
   * Generate recommendations based on sync results and errors
   *
   * @param stats - Sync statistics
   * @param errorSummary - Error summary if available
   * @returns string[] - List of recommendations
   */
  private static generateRecommendations(
    stats: { errors: number; inserted: number; processed: number },
    errorSummary?: any,
  ): string[] {
    const recommendations: string[] = [];

    if (stats.errors > 10) {
      recommendations.push(
        "High error rate detected. Check your network connection and Google account status.",
      );
    }

    if (errorSummary?.retryableErrors.length) {
      recommendations.push(
        `${errorSummary.retryableErrors.length} errors can be automatically retried.`,
      );
    }

    if (errorSummary?.criticalErrors.length) {
      recommendations.push("Critical errors detected that may require immediate attention.");
    }

    recommendations.push(
      "View detailed error analysis in the sync results for specific recovery steps.",
    );

    return recommendations.filter(Boolean);
  }
}
