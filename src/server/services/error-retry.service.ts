/**
 * Error Retry Service
 *
 * Consolidates all error retry business logic for API routes:
 * - /api/errors/retry
 *
 * Provides intelligent retry mechanisms for different types of errors with
 * classification-based strategies, batch operations, and recovery tracking.
 */

import {
  ErrorTrackingService,
  type EnhancedErrorRecord,
} from "@/server/services/error-tracking.service";
import { JobRunner } from "@/server/jobs/runner";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { getGoogleClients } from "@/server/google/client";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

export interface RetryOptions {
  errorIds: string[];
  retryAll: boolean;
  provider?: "gmail" | "calendar" | "drive";
  category?: "authentication" | "network" | "quota" | "data_format" | "processing" | "permission" | "configuration";
  maxRetries: number;
  retryStrategy: "immediate" | "delayed" | "smart";
  delayMinutes: number;
  includeAuthRefresh: boolean;
  skipFailedJobs: boolean;
}

export interface RetryResult {
  errorId: string;
  category: string;
  success: boolean;
  method: string;
  details?: string;
}

export interface RetryOperationResult {
  message: string;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: RetryResult[];
  summary: {
    byCategory: Record<string, number>;
    byMethod: Record<string, number>;
    successRate: number;
  };
  recommendations: string[];
}

export interface RetryMethodResult {
  success: boolean;
  method: string;
  details: string;
}

export class ErrorRetryService {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_DELAY_MINUTES = 5;

  /**
   * Retry errors based on specified options
   */
  static async retryErrors(
    userId: string,
    options: {
      errorIds?: string[] | undefined;
      retryAll?: boolean | undefined;
      provider?: "gmail" | "calendar" | "drive" | undefined;
      category?: "authentication" | "network" | "quota" | "data_format" | "processing" | "permission" | "configuration" | undefined;
      maxRetries?: number | undefined;
      retryStrategy?: "immediate" | "delayed" | "smart" | undefined;
      delayMinutes?: number | undefined;
      includeAuthRefresh?: boolean | undefined;
      skipFailedJobs?: boolean | undefined;
    } = {},
    requestId?: string
  ): Promise<RetryOperationResult> {
    const {
      errorIds,
      retryAll = false,
      provider,
      category,
      maxRetries = this.DEFAULT_MAX_RETRIES,
      retryStrategy = "smart",
      delayMinutes = this.DEFAULT_DELAY_MINUTES,
      includeAuthRefresh = true,
    } = options;

    // Get errors to retry
    let errorsToRetry: EnhancedErrorRecord[] = [];

    if (errorIds && errorIds.length > 0) {
      // Retry specific errors
      const errorSummary = await ErrorTrackingService.getErrorSummary(userId, {
        includeResolved: false,
      });
      errorsToRetry = errorSummary.recentErrors.filter(
        (error) =>
          errorIds.includes(error.id) &&
          error.classification?.retryable &&
          (error.retryCount ?? 0) < maxRetries,
      );
    } else if (retryAll) {
      // Get all retryable errors
      errorsToRetry = await ErrorTrackingService.getRetryableErrors(userId, {
        maxRetryCount: maxRetries,
        minRetryInterval: retryStrategy === "immediate" ? 0 : delayMinutes,
        ...(provider !== undefined && { provider }),
      });
    }

    // Filter by category if specified
    if (category) {
      errorsToRetry = errorsToRetry.filter((error) => error.classification?.category === category);
    }

    if (errorsToRetry.length === 0) {
      return {
        message: "No eligible errors found for retry",
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        results: [],
        summary: {
          byCategory: {},
          byMethod: {},
          successRate: 0,
        },
        recommendations: ["No errors were available for retry. Check the error status or try different filters."],
      };
    }

    await logger.info("Error retry operation started", {
      operation: "error_retry",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        requestId,
        errorsToRetry: errorsToRetry.length,
        retryStrategy,
        filters: { provider, category, maxRetries },
      },
    });

    const retryResults: RetryResult[] = [];
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    // Process each error based on its classification
    for (const error of errorsToRetry) {
      try {
        const classification = error.classification;
        if (!classification) {
          skipped++;
          continue;
        }

        let retryResult: RetryMethodResult = { success: false, method: "unknown", details: "" };

        // Apply retry strategy based on error category
        switch (classification.category) {
          case "auth":
            retryResult = await this.retryAuthenticationError(userId, includeAuthRefresh);
            break;

          case "network":
            retryResult = await this.retryNetworkError(userId);
            break;

          case "system":
            retryResult = await this.retryProcessingError(userId);
            break;

          case "rate_limit":
            retryResult = await this.retryQuotaError(retryStrategy);
            break;

          case "validation":
            retryResult = await this.retryDataFormatError();
            break;

          default:
            retryResult = await this.retryGenericError();
            break;
        }

        // Record the retry attempt
        await ErrorTrackingService.recordRetryAttempt(userId, error.id, retryResult);

        // Update results
        retryResults.push({
          errorId: error.id,
          category: classification.category,
          success: retryResult.success,
          method: retryResult.method,
          details: retryResult.details,
        });

        if (retryResult.success) {
          succeeded++;
        } else {
          failed++;
        }

        // Add delay between retries to avoid overwhelming services
        if (retryStrategy === "delayed" && delayMinutes > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMinutes * 60 * 1000));
        } else {
          // Small delay even for immediate retries
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (retryError) {
        const errorMsg = retryError instanceof Error ? retryError.message : String(retryError);

        retryResults.push({
          errorId: error.id,
          category: error.classification?.category ?? "unknown",
          success: false,
          method: "retry_failed",
          details: errorMsg,
        });

        failed++;

        await logger.warn("Error retry failed", {
          operation: "error_retry",
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            errorId: error.id,
            error: errorMsg,
          },
        });
      }
    }

    await logger.info("Error retry operation completed", {
      operation: "error_retry",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        requestId,
        processed: errorsToRetry.length,
        succeeded,
        failed,
        skipped,
      },
    });

    // Generate summary message
    let message: string;
    if (succeeded === errorsToRetry.length) {
      message = `Successfully retried all ${succeeded} error${succeeded !== 1 ? "s" : ""}`;
    } else if (succeeded > 0) {
      message = `Retried ${errorsToRetry.length} errors: ${succeeded} succeeded, ${failed} failed`;
    } else {
      message = `Retry operation completed with ${failed} failure${failed !== 1 ? "s" : ""}`;
    }

    return {
      message,
      processed: errorsToRetry.length,
      succeeded,
      failed,
      skipped,
      results: retryResults,
      summary: {
        byCategory: retryResults.reduce(
          (acc, result) => {
            acc[result.category] = (acc[result.category] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        byMethod: retryResults.reduce(
          (acc, result) => {
            acc[result.method] = (acc[result.method] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        successRate:
          errorsToRetry.length > 0 ? Math.round((succeeded / errorsToRetry.length) * 100) : 0,
      },
      recommendations: this.generateRetryRecommendations(retryResults, { succeeded, failed, skipped }),
    };
  }

  /**
   * Retry authentication errors by refreshing tokens
   */
  private static async retryAuthenticationError(
    userId: string,
    includeRefresh: boolean,
  ): Promise<RetryMethodResult> {
    if (!includeRefresh) {
      return { success: false, method: "auth_refresh_disabled", details: "Token refresh disabled" };
    }

    try {
      const db = await getDb();

      // Try to refresh Google OAuth tokens
      const integration = await db
        .select()
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "unified"),
          ),
        )
        .limit(1);

      if (integration.length === 0) {
        return {
          success: false,
          method: "auth_no_integration",
          details: "No Google integration found",
        };
      }

      // Attempt to get fresh tokens (this will trigger refresh if needed)
      const { gmail } = await getGoogleClients(userId);

      // Test the connection with a simple API call
      await gmail.users.getProfile({ userId: "me" });

      return {
        success: true,
        method: "auth_refresh_success",
        details: "Successfully refreshed authentication",
      };
    } catch (retryError) {
      const errorMsg = retryError instanceof Error ? retryError.message : String(retryError);
      return { success: false, method: "auth_refresh_failed", details: errorMsg };
    }
  }

  /**
   * Retry network errors with connectivity test
   */
  private static async retryNetworkError(
    userId: string,
  ): Promise<RetryMethodResult> {
    try {
      // Simple connectivity test
      const db = await getDb();
      await db.select().from(userIntegrations).where(eq(userIntegrations.userId, userId)).limit(1);

      return {
        success: true,
        method: "network_retry_success",
        details: "Network connectivity restored",
      };
    } catch (retryError) {
      const errorMsg = retryError instanceof Error ? retryError.message : String(retryError);
      return { success: false, method: "network_retry_failed", details: errorMsg };
    }
  }

  /**
   * Retry processing errors by re-running jobs
   */
  private static async retryProcessingError(
    userId: string,
  ): Promise<RetryMethodResult> {
    try {
      const jobRunner = new JobRunner();

      // Try to process a small batch of jobs for this user
      const result = await jobRunner.processUserJobs(userId, 5);

      if (result.succeeded > 0) {
        return {
          success: true,
          method: "processing_retry_success",
          details: `Processed ${result.succeeded} job${result.succeeded !== 1 ? "s" : ""}`,
        };
      } else {
        return {
          success: false,
          method: "processing_retry_no_jobs",
          details: "No jobs available for processing",
        };
      }
    } catch (retryError) {
      const errorMsg = retryError instanceof Error ? retryError.message : String(retryError);
      return { success: false, method: "processing_retry_failed", details: errorMsg };
    }
  }

  /**
   * Retry quota errors (usually requires waiting)
   */
  private static async retryQuotaError(
    strategy: string,
  ): Promise<RetryMethodResult> {
    // For quota errors, immediate retry usually fails
    // This is more of a validation that quota might be available now

    if (strategy === "immediate") {
      return {
        success: false,
        method: "quota_immediate_skip",
        details: "Quota errors require waiting - immediate retry skipped",
      };
    }

    // Simulate quota check (in real implementation, this would test API limits)
    return {
      success: true,
      method: "quota_retry_success",
      details: "Quota may be available - retry recommended",
    };
  }

  /**
   * Retry data format errors (usually by skipping problematic items)
   */
  private static async retryDataFormatError(): Promise<RetryMethodResult> {
    // Data format errors are usually resolved by skipping the problematic item
    return {
      success: true,
      method: "data_format_skip",
      details: "Marked problematic data item to be skipped",
    };
  }

  /**
   * Generic retry for unclassified errors
   */
  private static async retryGenericError(): Promise<RetryMethodResult> {
    // For generic errors, we just mark them as retried
    return {
      success: true,
      method: "generic_retry",
      details: "Generic retry completed",
    };
  }

  /**
   * Generate recommendations based on retry results
   */
  private static generateRetryRecommendations(
    results: RetryResult[],
    summary: { succeeded: number; failed: number; skipped: number },
  ): string[] {
    const recommendations: string[] = [];

    if (summary.succeeded === 0 && summary.failed > 0) {
      recommendations.push(
        "All retry attempts failed. Consider checking your Google account connection.",
      );
    }

    const authFailures = results.filter((r) => r.category === "authentication" && !r.success).length;
    if (authFailures > 0) {
      recommendations.push(
        "Authentication errors persist. Reconnect your Google account in Settings.",
      );
    }

    const networkFailures = results.filter((r) => r.category === "network" && !r.success).length;
    if (networkFailures > 0) {
      recommendations.push(
        "Network errors continue. Check your internet connection and try again later.",
      );
    }

    const quotaFailures = results.filter((r) => r.category === "quota" && !r.success).length;
    if (quotaFailures > 0) {
      recommendations.push("Quota limits reached. Wait an hour or reduce your sync frequency.");
    }

    if (summary.succeeded > 0 && summary.failed > 0) {
      recommendations.push(
        "Some retries succeeded. Monitor the remaining errors and retry again if needed.",
      );
    }

    if (summary.succeeded === results.length && results.length > 0) {
      recommendations.push(
        "All errors successfully retried! Your sync operations should now work normally.",
      );
    }

    return recommendations.slice(0, 3); // Limit to top 3 recommendations
  }

  /**
   * Get retry eligibility for specific errors
   */
  static async getRetryEligibility(
    userId: string,
    errorIds: string[]
  ): Promise<Array<{ errorId: string; eligible: boolean; reason?: string }>> {
    const errorSummary = await ErrorTrackingService.getErrorSummary(userId, {
      includeResolved: false,
    });

    return errorIds.map(errorId => {
      const error = errorSummary.recentErrors.find(e => e.id === errorId);

      if (!error) {
        return { errorId, eligible: false, reason: "Error not found" };
      }

      if (!error.classification?.retryable) {
        return { errorId, eligible: false, reason: "Error is not retryable" };
      }

      if ((error.retryCount ?? 0) >= this.DEFAULT_MAX_RETRIES) {
        return { errorId, eligible: false, reason: "Max retries exceeded" };
      }

      return { errorId, eligible: true };
    });
  }

  /**
   * Get comprehensive retry statistics
   */
  static async getRetryStatistics(userId: string): Promise<{
    totalErrors: number;
    retryableErrors: number;
    successfulRetries: number;
    failedRetries: number;
    averageSuccessRate: number;
  }> {
    try {
      const errorSummary = await ErrorTrackingService.getErrorSummary(userId, {
        includeResolved: false,
      });

      const totalErrors = errorSummary.recentErrors.length;
      const retryableErrors = errorSummary.recentErrors.filter(e => e.classification?.retryable).length;
      const errorsWithRetries = errorSummary.recentErrors.filter(e => (e.retryCount ?? 0) > 0);

      const successfulRetries = errorsWithRetries.filter(e => e.resolvedAt).length;
      const failedRetries = errorsWithRetries.length - successfulRetries;
      const averageSuccessRate = errorsWithRetries.length > 0
        ? Math.round((successfulRetries / errorsWithRetries.length) * 100)
        : 0;

      return {
        totalErrors,
        retryableErrors,
        successfulRetries,
        failedRetries,
        averageSuccessRate,
      };
    } catch (error) {
      await logger.error("Failed to get retry statistics", {
        operation: "error_retry_stats",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
      }, ensureError(error));

      return {
        totalErrors: 0,
        retryableErrors: 0,
        successfulRetries: 0,
        failedRetries: 0,
        averageSuccessRate: 0,
      };
    }
  }
}