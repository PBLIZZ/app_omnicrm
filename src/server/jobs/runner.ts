import { getDb } from "@/server/db/client";
import { eq, and, inArray, lt } from "drizzle-orm";
import { jobs } from "@/server/db/schema";
import type { JobRecord } from "./types";
import { JobDispatcher } from "./dispatcher";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * JobRunner is responsible for processing queued jobs from the database.
 *
 * Features:
 * - Processes jobs in batches for efficiency
 * - Handles job status transitions (queued → processing → completed/failed)
 * - Implements retry logic with exponential backoff
 * - Provides comprehensive error handling and logging
 * - Supports job timeouts and failure recovery
 */
export class JobRunner {
  private static readonly DEFAULT_BATCH_SIZE = 10;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_BASE_MS = 1000; // 1 second base delay
  private static readonly JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Process pending jobs (alias for processJobs for cron compatibility)
   */
  async processPendingJobs(batchSize: number = JobRunner.DEFAULT_BATCH_SIZE): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> {
    return this.processJobs(batchSize);
  }

  /**
   * Process a batch of queued jobs
   */
  async processJobs(batchSize: number = JobRunner.DEFAULT_BATCH_SIZE): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> {
    const db = await getDb();
    const errors: string[] = [];
    let succeeded = 0;
    let failed = 0;

    try {
      // Fetch queued jobs, prioritizing older jobs first
      const queuedJobs = await db
        .select()
        .from(jobs)
        .where(eq(jobs.status, "queued"))
        .orderBy(jobs.createdAt)
        .limit(batchSize);

      if (queuedJobs.length === 0) {
        await logger.info("No queued jobs found", {
          operation: "runner_execute",
          additionalData: {
            batchSize,
          },
        });
        return { processed: 0, succeeded: 0, failed: 0, errors: [] };
      }

      await logger.info(`Starting batch processing of ${queuedJobs.length} jobs`, {
        operation: "runner_execute",
        additionalData: {
          jobCount: queuedJobs.length,
          batchSize,
        },
      });

      // Process jobs sequentially to avoid overwhelming external APIs
      for (const job of queuedJobs) {
        try {
          const result = await this.processJob(job as JobRecord);
          if (result.success) {
            succeeded++;
          } else {
            failed++;
            if (result.error) {
              errors.push(`Job ${job.id}: ${result.error}`);
            }
          }
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Job ${job.id}: ${errorMessage}`);

          await logger.error(
            "Unexpected error processing job",
            {
              operation: "runner_execute",
              additionalData: {
                jobId: job.id,
                jobKind: job.kind,
              },
            },
            ensureError(error),
          );
        }
      }

      await logger.info(`Batch processing complete: ${succeeded} succeeded, ${failed} failed`, {
        operation: "runner_execute",
        additionalData: {
          processed: queuedJobs.length,
          succeeded,
          failed,
          errorCount: errors.length,
        },
      });

      return {
        processed: queuedJobs.length,
        succeeded,
        failed,
        errors,
      };
    } catch (error) {
      await logger.error(
        "Failed to process job batch",
        {
          operation: "runner_execute",
          additionalData: {},
        },
        ensureError(error),
      );
      throw error;
    }
  }

  /**
   * Process a single job with proper status management and error handling
   */
  private async processJob(job: JobRecord): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    const startTime = Date.now();

    try {
      // Mark job as processing
      await db
        .update(jobs)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));

      await logger.info(`Starting job processing: ${job.kind}`, {
        operation: "runner_execute",
        additionalData: {
          jobId: job.id,
          jobKind: job.kind,
          userId: job.userId,
          attempts: job.attempts,
        },
      });

      // Set up timeout for job processing
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job timeout after ${JobRunner.JOB_TIMEOUT_MS}ms`));
        }, JobRunner.JOB_TIMEOUT_MS);
      });

      // Process the job with timeout
      await Promise.race([JobDispatcher.dispatch(job), timeoutPromise]);

      // Mark job as completed
      await db
        .update(jobs)
        .set({
          status: "done",
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));

      const duration = Date.now() - startTime;
      await logger.info(`Job completed successfully in ${duration}ms`, {
        operation: "runner_execute",
        additionalData: {
          jobId: job.id,
          jobKind: job.kind,
          userId: job.userId,
          duration,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;
      const newAttempts = job.attempts + 1;

      await logger.error(
        `Job failed after ${duration}ms`,
        {
          operation: "runner_execute",
          additionalData: {
            jobId: job.id,
            jobKind: job.kind,
            userId: job.userId,
            attempts: newAttempts,
            duration,
          },
        },
        ensureError(error),
      );

      // Determine if we should retry or mark as failed
      const shouldRetry = newAttempts < JobRunner.MAX_RETRY_ATTEMPTS;
      const newStatus = shouldRetry ? "queued" : "error";

      await db
        .update(jobs)
        .set({
          status: newStatus,
          attempts: newAttempts,
          lastError: errorMessage,
          updatedAt: new Date(),
          // Add exponential backoff delay for retries
          ...(shouldRetry && {
            scheduledAt: new Date(
              Date.now() + JobRunner.RETRY_DELAY_BASE_MS * Math.pow(2, newAttempts - 1),
            ),
          }),
        })
        .where(eq(jobs.id, job.id));

      if (shouldRetry) {
        await logger.info(
          `Job scheduled for retry (attempt ${newAttempts}/${JobRunner.MAX_RETRY_ATTEMPTS})`,
          {
            operation: "runner_execute",
            additionalData: {
              jobId: job.id,
              jobKind: job.kind,
              attempts: newAttempts,
              maxAttempts: JobRunner.MAX_RETRY_ATTEMPTS,
            },
          },
        );
      } else {
        await logger.error(`Job failed permanently after ${newAttempts} attempts`, {
          operation: "runner_execute",
          additionalData: {
            jobId: job.id,
            jobKind: job.kind,
            attempts: newAttempts,
          },
        });
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process jobs for a specific user
   */
  async processUserJobs(
    userId: string,
    batchSize: number = JobRunner.DEFAULT_BATCH_SIZE,
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> {
    const db = await getDb();
    const errors: string[] = [];
    let succeeded = 0;
    let failed = 0;

    try {
      // Fetch queued jobs for the specific user
      const userJobs = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.userId, userId), eq(jobs.status, "queued")))
        .orderBy(jobs.createdAt)
        .limit(batchSize);

      if (userJobs.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0, errors: [] };
      }

      // Process each job
      for (const job of userJobs) {
        try {
          const result = await this.processJob(job as JobRecord);
          if (result.success) {
            succeeded++;
          } else {
            failed++;
            if (result.error) {
              errors.push(`Job ${job.id}: ${result.error}`);
            }
          }
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Job ${job.id}: ${errorMessage}`);
        }
      }

      return {
        processed: userJobs.length,
        succeeded,
        failed,
        errors,
      };
    } catch (error) {
      await logger.error(
        "Failed to process user jobs",
        {
          operation: "runner_execute",
          additionalData: {
            userId,
          },
        },
        ensureError(error),
      );
      throw error;
    }
  }

  /**
   * Clean up old completed and failed jobs
   */
  async cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
    const db = await getDb();
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    try {
      const result = await db
        .delete(jobs)
        .where(and(inArray(jobs.status, ["done", "error"]), lt(jobs.updatedAt, cutoffDate)));

      const deletedCount = Array.isArray(result) ? result.length : 0;

      await logger.info(`Cleaned up ${deletedCount} old jobs`, {
        operation: "runner_execute",
        additionalData: {
          deletedCount,
          olderThanDays,
        },
      });

      return deletedCount;
    } catch (error) {
      await logger.error(
        "Failed to cleanup old jobs",
        {
          operation: "runner_execute",
          additionalData: {},
        },
        ensureError(error),
      );
      throw error;
    }
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const db = await getDb();

    try {
      const [queuedCount, processingCount, completedCount, failedCount] = await Promise.all([
        db.select({ count: jobs.id }).from(jobs).where(eq(jobs.status, "queued")),
        db.select({ count: jobs.id }).from(jobs).where(eq(jobs.status, "processing")),
        db.select({ count: jobs.id }).from(jobs).where(eq(jobs.status, "done")),
        db.select({ count: jobs.id }).from(jobs).where(eq(jobs.status, "error")),
      ]);

      return {
        queued: queuedCount.length,
        processing: processingCount.length,
        completed: completedCount.length,
        failed: failedCount.length,
      };
    } catch (error) {
      await logger.error(
        "Failed to get job statistics",
        {
          operation: "runner_execute",
          additionalData: {},
        },
        ensureError(error),
      );
      throw error;
    }
  }
}
