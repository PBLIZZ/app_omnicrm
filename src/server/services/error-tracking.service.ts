/**
 * Error Tracking Service
 *
 * Provides comprehensive error tracking, classification, and recovery management
 * for the Google Sync System. Enhances the existing raw_event_errors table with
 * structured classification and user-friendly recovery suggestions.
 */

import { getDb } from "@/server/db/client";
import { rawEventErrors } from "@/server/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { classifyError, type ErrorClassification } from "@/lib/errors/classification";
import { logger } from "@/lib/observability/unified-logger";
import { ensureError } from "@/lib/utils/error-handler";

export interface ErrorTrackingContext {
  rawEventId?: string | undefined;
  provider: "gmail" | "calendar" | "drive";
  stage: "ingestion" | "normalization" | "processing";
  operation?: string | undefined;
  sessionId?: string | undefined;
  batchId?: string | undefined;
  itemId?: string | undefined;
  additionalMeta?: Record<string, unknown> | undefined;
}

export interface EnhancedErrorRecord {
  id: string;
  rawEventId: string | null;
  userId: string;
  provider: string;
  errorAt: Date;
  stage: string;
  error: string;
  context: unknown;
  // Enhanced fields (stored in context jsonb)
  classification?: ErrorClassification | undefined;
  retryCount?: number | undefined;
  lastRetryAt?: Date | undefined;
  resolvedAt?: Date | undefined;
  userAcknowledged?: boolean | undefined;
}

export interface ErrorSummary {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: EnhancedErrorRecord[];
  criticalErrors: EnhancedErrorRecord[];
  retryableErrors: EnhancedErrorRecord[];
  resolvedErrors: number;
  pendingErrors: number;
}

export class ErrorTrackingService {
  /**
   * Record a new error with automatic classification
   */
  static async recordError(
    userId: string,
    error: string | Error,
    context: ErrorTrackingContext,
  ): Promise<string> {
    try {
      const db = await getDb();

      // Classify the error
      const classification = classifyError(error, {
        provider: context.provider,
        stage: context.stage,
        ...(context.operation && { operation: context.operation }),
        ...(userId && { userId }),
      });

      // Enhanced context with classification
      const enhancedContext = {
        ...context.additionalMeta,
        classification,
        sessionId: context.sessionId,
        batchId: context.batchId,
        itemId: context.itemId,
        operation: context.operation,
        retryCount: 0,
        recordedAt: new Date().toISOString(),
        userAcknowledged: false,
      };

      const errorMessage = error instanceof Error ? error.message : String(error);

      const result = await db
        .insert(rawEventErrors)
        .values({
          rawEventId: context.rawEventId ?? null,
          userId,
          provider: context.provider,
          errorAt: new Date(),
          stage: context.stage,
          error: errorMessage,
          context: enhancedContext,
        })
        .returning({ id: rawEventErrors.id });

      const errorId = result[0]?.id;
      if (!errorId) {
        throw new Error("Failed to insert error record");
      }

      // Fire-and-forget logging for successful error recording
      void logger.warn("Error recorded with classification", {
        operation: "error_tracking_record",
        additionalData: {
          errorId,
          userId,
          provider: context.provider,
          stage: context.stage,
          category: classification.category,
          severity: classification.severity,
          retryable: classification.retryable,
        },
      });

      return errorId;
    } catch (trackingError) {
      // Log tracking failure but don't throw - we don't want error tracking to break the main flow
      // Fire-and-forget logging for tracking failures (don't await to avoid blocking main flow)
      void logger.error(
        "Failed to record error",
        {
          operation: "error_tracking_record",
          additionalData: {
            userId,
            originalError: error instanceof Error ? error.message : String(error),
            context,
          },
        },
        ensureError(trackingError),
      );

      // Return a fallback ID
      return `fallback-${Date.now()}`;
    }
  }

  /**
   * Record multiple errors in batch
   */
  static async recordErrorBatch(
    userId: string,
    errors: Array<{ error: string | Error; context: ErrorTrackingContext }>,
  ): Promise<string[]> {
    const errorIds: string[] = [];

    // Process errors in parallel but limit concurrency
    const BATCH_SIZE = 10;
    for (let i = 0; i < errors.length; i += BATCH_SIZE) {
      const batch = errors.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(({ error, context }) =>
        this.recordError(userId, error, context),
      );

      const batchIds = await Promise.all(batchPromises);
      errorIds.push(...batchIds);
    }

    // Fire-and-forget logging for batch completion
    void logger.info(`Recorded ${errorIds.length} errors in batch`, {
      operation: "error_tracking_batch",
      additionalData: {
        userId,
        totalErrors: errors.length,
        successfulRecords: errorIds.filter((id) => !id.startsWith("fallback-")).length,
      },
    });

    return errorIds;
  }

  /**
   * Get comprehensive error summary for a user
   */
  static async getErrorSummary(
    userId: string,
    options: {
      includeResolved?: boolean;
      timeRangeHours?: number;
      provider?: "gmail" | "calendar" | "drive";
      stage?: "ingestion" | "normalization" | "processing";
    } = {},
  ): Promise<ErrorSummary> {
    try {
      const db = await getDb();
      const { includeResolved = false, timeRangeHours, provider, stage } = options;

      // Build base query conditions
      const conditions = [eq(rawEventErrors.userId, userId)];

      if (timeRangeHours) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - timeRangeHours);
        conditions.push(sql`${rawEventErrors.errorAt} >= ${cutoff}`);
      }

      if (provider) {
        conditions.push(eq(rawEventErrors.provider, provider));
      }

      if (stage) {
        conditions.push(eq(rawEventErrors.stage, stage));
      }

      // Get all errors
      const allErrors = await db
        .select()
        .from(rawEventErrors)
        .where(and(...conditions))
        .orderBy(desc(rawEventErrors.errorAt))
        .limit(1000); // Reasonable limit

      // Define context interface for type safety
      interface StoredErrorContext {
        resolvedAt?: string;
        userAcknowledged?: boolean;
        classification?: ErrorClassification;
        retryCount?: number;
        lastRetryAt?: string;
      }

      // Filter based on resolution status with proper type guards
      const errors = allErrors.filter((error) => {
        const context = error.context as StoredErrorContext | null;
        const isResolved = context?.resolvedAt ?? context?.userAcknowledged;
        return includeResolved || !isResolved;
      });

      // Classify errors and generate statistics
      const errorsByCategory: Record<string, number> = {};
      const errorsBySeverity: Record<string, number> = {};
      const criticalErrors: EnhancedErrorRecord[] = [];
      const retryableErrors: EnhancedErrorRecord[] = [];

      let resolvedCount = 0;
      const recentErrors: EnhancedErrorRecord[] = [];

      errors.forEach((error) => {
        const context = error.context as StoredErrorContext | null;
        const classification = context?.classification;

        if (context?.resolvedAt || context?.userAcknowledged) {
          resolvedCount++;
        }

        if (classification) {
          errorsByCategory[classification.category] =
            (errorsByCategory[classification.category] ?? 0) + 1;
          errorsBySeverity[classification.severity] =
            (errorsBySeverity[classification.severity] ?? 0) + 1;

          const enhancedError: EnhancedErrorRecord = {
            ...error,
            classification,
            retryCount: context?.retryCount ?? 0,
            lastRetryAt: context?.lastRetryAt ? new Date(context.lastRetryAt) : undefined,
            resolvedAt: context?.resolvedAt ? new Date(context.resolvedAt) : undefined,
            userAcknowledged: context?.userAcknowledged ?? false,
          };

          if (classification.severity === "critical") {
            criticalErrors.push(enhancedError);
          }

          if (classification.retryable && !context?.resolvedAt && !context?.userAcknowledged) {
            retryableErrors.push(enhancedError);
          }

          if (recentErrors.length < 10) {
            recentErrors.push(enhancedError);
          }
        }
      });

      return {
        totalErrors: errors.length,
        errorsByCategory,
        errorsBySeverity,
        recentErrors,
        criticalErrors,
        retryableErrors,
        resolvedErrors: resolvedCount,
        pendingErrors: errors.length - resolvedCount,
      };
    } catch (error) {
      // Fire-and-forget logging for summary generation failures
      void logger.error(
        "Failed to generate error summary",
        {
          operation: "error_tracking_summary",
          additionalData: { userId, options },
        },
        ensureError(error),
      );

      // Return empty summary on failure
      return {
        totalErrors: 0,
        errorsByCategory: {},
        errorsBySeverity: {},
        recentErrors: [],
        criticalErrors: [],
        retryableErrors: [],
        resolvedErrors: 0,
        pendingErrors: 0,
      };
    }
  }

  /**
   * Mark an error as acknowledged by the user
   */
  static async acknowledgeError(userId: string, errorId: string): Promise<boolean> {
    try {
      const db = await getDb();

      const result = await db
        .update(rawEventErrors)
        .set({
          context: sql`jsonb_set(context, '{userAcknowledged}', 'true'::jsonb) || jsonb_build_object('acknowledgedAt', to_jsonb(now()))`,
        })
        .where(and(eq(rawEventErrors.id, errorId), eq(rawEventErrors.userId, userId)))
        .returning({ id: rawEventErrors.id });

      const success = result.length > 0;

      if (success) {
        // Fire-and-forget logging for successful error acknowledgment
        void logger.info("Error acknowledged by user", {
          operation: "error_tracking_acknowledge",
          additionalData: { userId, errorId },
        });
      }

      return success;
    } catch (error) {
      // Fire-and-forget logging for acknowledgment failures
      void logger.error(
        "Failed to acknowledge error",
        {
          operation: "error_tracking_acknowledge",
          additionalData: { userId, errorId },
        },
        ensureError(error),
      );

      return false;
    }
  }

  /**
   * Mark an error as resolved
   */
  static async resolveError(
    userId: string,
    errorId: string,
    resolution: { method: string; details?: string },
  ): Promise<boolean> {
    try {
      const db = await getDb();

      const result = await db
        .update(rawEventErrors)
        .set({
          context: sql`context || jsonb_build_object(
            'resolvedAt', to_jsonb(now()),
            'resolutionMethod', ${resolution.method}::text,
            'resolutionDetails', ${resolution.details ?? ""}::text
          )`,
        })
        .where(and(eq(rawEventErrors.id, errorId), eq(rawEventErrors.userId, userId)))
        .returning({ id: rawEventErrors.id });

      const success = result.length > 0;

      if (success) {
        // Fire-and-forget logging for successful error resolution
        void logger.info("Error marked as resolved", {
          operation: "error_tracking_resolve",
          additionalData: { userId, errorId, resolution },
        });
      }

      return success;
    } catch (error) {
      // Fire-and-forget logging for resolution failures
      void logger.error(
        "Failed to resolve error",
        {
          operation: "error_tracking_resolve",
          additionalData: { userId, errorId, resolution },
        },
        ensureError(error),
      );

      return false;
    }
  }

  /**
   * Record a retry attempt for an error
   */
  static async recordRetryAttempt(
    userId: string,
    errorId: string,
    result: { success: boolean; details?: string },
  ): Promise<boolean> {
    try {
      const db = await getDb();

      const updateSql = result.success
        ? sql`context || jsonb_build_object(
            'retryCount', COALESCE((context->>'retryCount')::int, 0) + 1,
            'lastRetryAt', to_jsonb(now()),
            'lastRetrySuccess', true,
            'resolvedAt', to_jsonb(now()),
            'resolutionMethod', 'retry_success'
          )`
        : sql`context || jsonb_build_object(
            'retryCount', COALESCE((context->>'retryCount')::int, 0) + 1,
            'lastRetryAt', to_jsonb(now()),
            'lastRetrySuccess', false,
            'lastRetryDetails', ${result.details ?? ""}::text
          )`;

      const updateResult = await db
        .update(rawEventErrors)
        .set({ context: updateSql })
        .where(and(eq(rawEventErrors.id, errorId), eq(rawEventErrors.userId, userId)))
        .returning({ id: rawEventErrors.id });

      const success = updateResult.length > 0;

      if (success) {
        // Fire-and-forget logging for successful retry recording
        void logger.info("Retry attempt recorded", {
          operation: "error_tracking_retry",
          additionalData: {
            userId,
            errorId,
            retrySuccess: result.success,
            retryDetails: result.details,
          },
        });
      }

      return success;
    } catch (error) {
      // Fire-and-forget logging for retry recording failures
      void logger.error(
        "Failed to record retry attempt",
        {
          operation: "error_tracking_retry",
          additionalData: { userId, errorId, result },
        },
        ensureError(error),
      );

      return false;
    }
  }

  /**
   * Get retryable errors for automatic retry processing
   */
  static async getRetryableErrors(
    userId: string,
    options: {
      maxRetryCount?: number;
      minRetryInterval?: number; // minutes
      provider?: "gmail" | "calendar" | "drive";
    } = {},
  ): Promise<EnhancedErrorRecord[]> {
    try {
      const db = await getDb();
      const { maxRetryCount = 3, minRetryInterval = 5, provider } = options;

      const conditions = [
        eq(rawEventErrors.userId, userId),
        // Not resolved
        sql`(context->>'resolvedAt') IS NULL`,
        sql`(context->>'userAcknowledged')::boolean IS NOT TRUE`,
        // Has retryable classification
        sql`(context->'classification'->>'retryable')::boolean = true`,
        // Under retry limit
        sql`COALESCE((context->>'retryCount')::int, 0) < ${maxRetryCount}`,
        // Past retry interval
        sql`(
          (context->>'lastRetryAt') IS NULL
          OR (context->>'lastRetryAt')::timestamp < (now() - interval '${minRetryInterval} minutes')
        )`,
      ];

      if (provider) {
        conditions.push(eq(rawEventErrors.provider, provider));
      }

      const errors = await db
        .select()
        .from(rawEventErrors)
        .where(and(...conditions))
        .orderBy(rawEventErrors.errorAt)
        .limit(50); // Reasonable batch size for retries

      return errors.map((error) => {
        interface RetryableErrorContext {
          resolvedAt?: string;
          userAcknowledged?: boolean;
          classification?: ErrorClassification;
          retryCount?: number;
          lastRetryAt?: string;
        }
        const context = error.context as RetryableErrorContext | null;
        return {
          ...error,
          classification: context?.classification,
          retryCount: context?.retryCount ?? 0,
          lastRetryAt: context?.lastRetryAt ? new Date(context.lastRetryAt) : undefined,
          resolvedAt: context?.resolvedAt ? new Date(context.resolvedAt) : undefined,
          userAcknowledged: context?.userAcknowledged ?? false,
        };
      });
    } catch (error) {
      // Fire-and-forget logging for retryable errors retrieval failures
      void logger.error(
        "Failed to get retryable errors",
        {
          operation: "error_tracking_retryable",
          additionalData: { userId, options },
        },
        ensureError(error),
      );

      return [];
    }
  }

  /**
   * Cleanup old resolved errors
   */
  static async cleanupOldErrors(
    retentionDays = 30,
  ): Promise<{ deletedCount: number }> {
    try {
      const db = await getDb();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      const result = await db
        .delete(rawEventErrors)
        .where(
          and(
            sql`${rawEventErrors.errorAt} < ${cutoff}`,
            sql`(context->>'resolvedAt') IS NOT NULL OR (context->>'userAcknowledged')::boolean = true`,
          ),
        );

      const deletedCount = Array.isArray(result) ? result.length : 0;

      // Fire-and-forget logging for successful cleanup
      void logger.info("Old errors cleaned up", {
        operation: "error_tracking_cleanup",
        additionalData: {
          retentionDays,
          cutoffDate: cutoff.toISOString(),
          deletedCount,
        },
      });

      return { deletedCount };
    } catch (error) {
      // Fire-and-forget logging for cleanup failures
      void logger.error(
        "Failed to cleanup old errors",
        {
          operation: "error_tracking_cleanup",
          additionalData: { retentionDays },
        },
        ensureError(error),
      );

      return { deletedCount: 0 };
    }
  }
}
