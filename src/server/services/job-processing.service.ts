/**
 * Job Processing Service
 *
 * Consolidates all job processing business logic for API routes:
 * - /api/jobs/process-manual
 * - /api/jobs/process/calendar-events
 * - /api/jobs/process/raw-events
 * - /api/jobs/process/normalize
 * - /api/jobs/process
 *
 * Provides methods for manual job processing, specific job type processing,
 * and job management operations.
 */

import { getDb } from "@/server/db/client";
import { jobs, calendarEvents, rawEvents } from "@/server/db/schema";
import { eq, and, inArray, desc, count } from "drizzle-orm";
import { JobRunner } from "@/server/jobs/runner";
import { rawEventErrors } from "@/server/db/schema";
import { logger } from "@/lib/observability";
import { err } from "@/lib/utils/result";

export class JobProcessingService {
  private static readonly DEFAULT_MAX_JOBS = 25;
  private static readonly STUCK_JOB_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Process jobs manually with comprehensive filtering and feedback
   */
  static async processJobsManually(
    userId: string,
    options: JobProcessingOptions = {},
    requestId?: string
  ): Promise<JobProcessingResult> {
    const {
      jobTypes,
      batchId,
      maxJobs = this.DEFAULT_MAX_JOBS,
      includeRetrying = true,
      skipStuckJobs = false
    } = options;

    const processingStartTime = Date.now();
    const db = await getDb();

    // Build query conditions for jobs to process
    const baseConditions = [
      eq(jobs.userId, userId),
      inArray(jobs.status, includeRetrying ? ['queued', 'retrying'] : ['queued'])
    ];

    if (batchId) {
      baseConditions.push(eq(jobs.batchId, batchId));
    }

    if (jobTypes && jobTypes.length > 0) {
      baseConditions.push(inArray(jobs.kind, jobTypes));
    }

    // Get eligible jobs for processing
    const eligibleJobs = await db
      .select({
        id: jobs.id,
        kind: jobs.kind,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        lastError: jobs.lastError,
      })
      .from(jobs)
      .where(and(...baseConditions))
      .orderBy(jobs.createdAt)
      .limit(maxJobs);

    if (eligibleJobs.length === 0) {
      return {
        message: "No eligible jobs found for processing",
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        processingTimeMs: 0,
        jobs: [],
        errors: [],
        stats: {
          totalEligible: 0,
          alreadyProcessing: 0,
          stuckJobs: 0,
        },
        recommendations: ["No jobs were available for processing. Check the job status or try different filters."]
      };
    }

    // Filter out stuck jobs if requested
    let jobsToProcess = eligibleJobs;
    let skippedStuckJobs = 0;

    if (skipStuckJobs) {
      const now = Date.now();
      jobsToProcess = eligibleJobs.filter(job => {
        if (job.status !== 'processing') return true;

        const timeSinceUpdate = now - new Date(job.updatedAt).getTime();
        const isStuck = timeSinceUpdate > this.STUCK_JOB_THRESHOLD_MS;

        if (isStuck) {
          skippedStuckJobs++;
          return false;
        }
        return true;
      });
    }

    await logger.info("Manual job processing started", {
      operation: "manual_job_processing",
      additionalData: {
        userId,
        requestId,
        totalEligible: eligibleJobs.length,
        jobsToProcess: jobsToProcess.length,
        skippedStuckJobs,
        filters: { jobTypes, batchId, maxJobs, includeRetrying, skipStuckJobs }
      }
    });

    // Initialize the job runner and process jobs
    const jobRunner = new JobRunner();
    let processingErrors: Array<{ jobId: string; error: string }> = [];

    try {
      // Process the selected jobs with the runner
      const result = await jobRunner.processUserJobs(userId, jobsToProcess.length);

      // Calculate processing duration
      const processingDuration = Date.now() - processingStartTime;

      // Record any errors for error tracking
      if (result.errors.length > 0) {
        processingErrors = result.errors.map(errorMsg => {
          // Extract job ID from error message if possible
          const jobIdMatch = errorMsg.match(/Job ([a-f0-9-]+):/);
          return {
            jobId: jobIdMatch?.[1] || 'unknown',
            error: errorMsg
          };
        });

        // Log errors directly to database if there are any
        if (processingErrors.length > 0) {
          try {
            await Promise.all(
              processingErrors.map(async ({ jobId, error }) => {
                await db.insert(rawEventErrors).values({
                  userId,
                  provider: 'system',
                  stage: 'processing',
                  error: error,
                  context: {
                    operation: 'manual_job_processing',
                    itemId: jobId,
                    processingType: 'manual',
                    requestId,
                    filters: { jobTypes, batchId }
                  }
                });
              })
            );
          } catch (logError) {
            // Don't fail the main operation if error logging fails
            void logger.warn('Failed to log job processing errors', {
              operation: 'job_processing_error_log',
              additionalData: { userId, errorCount: processingErrors.length }
            });
          }
        }
      }

      // Get final job status for response
      const processedJobIds = jobsToProcess.slice(0, result.processed).map(j => j.id);
      const finalJobStatus = processedJobIds.length > 0 ? await db
        .select({
          id: jobs.id,
          kind: jobs.kind,
          status: jobs.status,
          attempts: jobs.attempts,
          lastError: jobs.lastError,
        })
        .from(jobs)
        .where(and(
          eq(jobs.userId, userId),
          inArray(jobs.id, processedJobIds)
        )) : [];

      await logger.info("Manual job processing completed", {
        operation: "manual_job_processing",
        additionalData: {
          userId,
          requestId,
          duration: processingDuration,
          result: {
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
            errors: result.errors.length
          }
        }
      });

      // Generate user-friendly message
      let message: string;
      if (result.failed === 0) {
        message = `Successfully processed ${result.succeeded} job${result.succeeded !== 1 ? 's' : ''}`;
      } else if (result.succeeded > 0) {
        message = `Processed ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed`;
      } else {
        message = `Processing failed: ${result.failed} job${result.failed !== 1 ? 's' : ''} encountered errors`;
      }

      return {
        message,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        skipped: skippedStuckJobs,
        processingTimeMs: processingDuration,
        jobs: finalJobStatus.map(job => ({
          id: job.id,
          kind: job.kind,
          status: job.status,
          attempts: job.attempts,
          hasError: !!job.lastError,
        })),
        errors: processingErrors.slice(0, 5), // Limit error details in response
        stats: {
          totalEligible: eligibleJobs.length,
          alreadyProcessing: eligibleJobs.filter(j => j.status === 'processing').length,
          stuckJobs: skippedStuckJobs,
        },
        recommendations: this.generateProcessingRecommendations({
          processed: result.processed,
          succeeded: result.succeeded,
          failed: result.failed,
          errors: result.errors,
          hasStuckJobs: skippedStuckJobs > 0
        })
      };

    } catch (processingError) {
      const errorMsg = processingError instanceof Error ? processingError.message : String(processingError);

      // Log the processing failure directly
      try {
        await db.insert(rawEventErrors).values({
          userId,
          provider: 'system',
          stage: 'processing',
          error: errorMsg,
          context: {
            operation: 'manual_job_processing_failure',
            processingType: 'manual',
            requestId,
            eligibleJobCount: eligibleJobs.length,
            filters: { jobTypes, batchId }
          }
        });
      } catch (logError) {
        // Don't fail if error logging fails
        void logger.warn('Failed to log job processing failure', {
          operation: 'job_processing_failure_log',
          additionalData: { userId, error: errorMsg }
        });
      }

      await logger.error("Manual job processing failed", {
        operation: "manual_job_processing",
        additionalData: {
          userId,
          requestId,
          eligibleJobCount: eligibleJobs.length,
          error: errorMsg
        }
      }, error);

      throw new Error(`Job processing failed unexpectedly: ${errorMsg}`);
    }
  }

  /**
   * Process calendar events jobs specifically
   */
  static async processCalendarEventJobs(userId: string): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    totalEvents: number;
  }> {
    const db = await getDb();

    // Get calendar event processing jobs for this user
    const calendarJobs = await db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.userId, userId),
        eq(jobs.kind, 'sync_calendar'),
        inArray(jobs.status, ['queued', 'retrying'])
      ))
      .orderBy(jobs.createdAt)
      .limit(50);

    if (calendarJobs.length === 0) {
      // Get total calendar events for stats
      const eventsCount = await db
        .select({ count: count() })
        .from(calendarEvents)
        .where(eq(calendarEvents.userId, userId));

      const totalEvents = Number(eventsCount[0]?.count ?? 0);
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        totalEvents,
      };
    }

    const jobRunner = new JobRunner();
    const result = await jobRunner.processUserJobs(userId, calendarJobs.length);

    // Get total calendar events for stats
    const eventsCount = await db
      .select({ count: count() })
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId));

    await logger.info("Calendar event jobs processed", {
      operation: "calendar_event_processing",
      additionalData: {
        userId,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        totalEvents: eventsCount[0]?.count || 0,
      }
    });

    const totalEvents = Number(eventsCount[0]?.count ?? 0);
    return {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      totalEvents,
    };
  }

  /**
   * Process raw events jobs specifically
   */
  static async processRawEventJobs(userId: string): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    totalRawEvents: number;
  }> {
    const db = await getDb();

    // Get raw event normalization jobs for this user
    const rawEventJobs = await db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.userId, userId),
        eq(jobs.kind, 'normalize'),
        inArray(jobs.status, ['queued', 'retrying'])
      ))
      .orderBy(jobs.createdAt)
      .limit(50);

    if (rawEventJobs.length === 0) {
      // Get total raw events for stats
      const rawEventsCount = await db
        .select({ count: count() })
        .from(rawEvents)
        .where(eq(rawEvents.userId, userId));

      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        totalRawEvents: rawEventsCount[0]?.count || 0,
      };
    }

    const jobRunner = new JobRunner();
    const result = await jobRunner.processUserJobs(userId, rawEventJobs.length);

    // Get total raw events for stats
    const rawEventsCount = await db
      .select({ count: count() })
      .from(rawEvents)
      .where(eq(rawEvents.userId, userId));

    await logger.info("Raw event jobs processed", {
      operation: "raw_event_processing",
      additionalData: {
        userId,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        totalRawEvents: rawEventsCount[0]?.count || 0,
      }
    });

    return {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      totalRawEvents: rawEventsCount[0]?.count || 0,
    };
  }

  /**
   * Process normalization jobs specifically (replaces normalize route business logic)
   */
  static async processNormalizationJobs(userId: string, limit: number = 20): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    message: string;
  }> {
    try {
      const db = await getDb();
      const jobRunner = new JobRunner();

      // Get queued normalize jobs for this user (exactly like the original route)
      const normalizeJobs = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, userId),
            eq(jobs.status, "queued"),
            inArray(jobs.kind, ["normalize", "normalize_google_email", "normalize_google_event"])
          )
        )
        .limit(limit);

      if (normalizeJobs.length === 0) {
        return {
          processed: 0,
          succeeded: 0,
          failed: 0,
          message: "No normalize jobs found to process",
        };
      }

      await logger.info(`Starting manual normalize processing for ${normalizeJobs.length} jobs`, {
        operation: "manual_normalize_processor",
        additionalData: {
          userId: userId,
          jobCount: normalizeJobs.length,
        },
      });

      // Process the normalize jobs
      const result = await jobRunner.processUserJobs(userId, normalizeJobs.length);

      await logger.info(`Manual normalize processing complete`, {
        operation: "manual_normalize_processor",
        additionalData: {
          userId: userId,
          ...result,
        },
      });

      const message = `Processed ${result.processed} normalize jobs. Success: ${result.succeeded}, Failed: ${result.failed}`;

      return {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        message,
      };
    } catch (error) {
      await logger.error(
        "Failed to process normalize jobs",
        {
          operation: "manual_normalize_processor",
          additionalData: {
            userId: userId,
          },
        },
        error instanceof Error ? error : new Error(String(error)),
      );

      throw new Error("Failed to process normalize jobs");
    }
  }

  /**
   * Get comprehensive job status for a user
   */
  static async getJobStatus(userId: string): Promise<JobStatusSummary> {
    const db = await getDb();

    const [
      queuedJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      retryingJobs
    ] = await Promise.all([
      db.select({ count: count() }).from(jobs).where(and(eq(jobs.userId, userId), eq(jobs.status, 'queued'))),
      db.select({ count: count() }).from(jobs).where(and(eq(jobs.userId, userId), eq(jobs.status, 'processing'))),
      db.select({ count: count() }).from(jobs).where(and(eq(jobs.userId, userId), eq(jobs.status, 'done'))),
      db.select({ count: count() }).from(jobs).where(and(eq(jobs.userId, userId), eq(jobs.status, 'error'))),
      db.select({ count: count() }).from(jobs).where(and(eq(jobs.userId, userId), eq(jobs.status, 'retrying')))
    ]);

    const queued = queuedJobs[0]?.count || 0;
    const processing = processingJobs[0]?.count || 0;
    const completed = completedJobs[0]?.count || 0;
    const failed = failedJobs[0]?.count || 0;
    const retrying = retryingJobs[0]?.count || 0;

    return {
      queued,
      processing,
      completed,
      failed,
      retrying,
      totalJobs: queued + processing + completed + failed + retrying,
    };
  }

  /**
   * Get detailed job information for debugging
   */
  static async getJobDetails(userId: string, limit: number = 50): Promise<Array<{
    id: string;
    kind: string;
    status: string;
    attempts: number;
    batchId: string | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const db = await getDb();

    const recentJobs = await db
      .select({
        id: jobs.id,
        kind: jobs.kind,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        lastError: jobs.lastError,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.updatedAt))
      .limit(limit);

    return recentJobs;
  }

  /**
   * Process all pending jobs (main processing entry point)
   */
  static async processAllPendingJobs(batchSize: number = 25): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> {
    const jobRunner = new JobRunner();
    return jobRunner.processJobs(batchSize);
  }

  /**
   * Process user-specific jobs (for /api/jobs/runner route)
   */
  static async processUserSpecificJobs(
    userId: string,
    requestId?: string
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> {
    await logger.info("Job runner processing started", {
      operation: "job_runner.start",
      additionalData: {
        userId,
        requestId,
      },
    });

    const jobRunner = new JobRunner();
    const result = await jobRunner.processUserJobs(userId);

    await logger.info("Job runner processing completed", {
      operation: "job_runner.complete",
      additionalData: {
        userId,
        requestId,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        errorCount: result.errors.length,
      },
    });

    return result;
  }

  /**
   * Generate recommendations based on processing results
   */
  private static generateProcessingRecommendations(results: {
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
    hasStuckJobs: boolean;
  }): string[] {
    const recommendations: string[] = [];

    if (results.succeeded === results.processed && results.processed > 0) {
      recommendations.push("All jobs processed successfully! Your data is now up to date.");
    }

    if (results.failed > 0) {
      recommendations.push("Some jobs failed to process. Check the error details for specific issues.");

      if (results.errors.some(e => e.includes('network') || e.includes('timeout'))) {
        recommendations.push("Network issues detected. Try processing again in a few minutes.");
      }

      if (results.errors.some(e => e.includes('quota') || e.includes('rate limit'))) {
        recommendations.push("API limits reached. Wait an hour before processing more jobs.");
      }

      if (results.errors.some(e => e.includes('permission') || e.includes('unauthorized'))) {
        recommendations.push("Permission issues detected. Check your Google account connection.");
      }
    }

    if (results.hasStuckJobs) {
      recommendations.push("Some jobs appear to be stuck. Consider restarting job processing or contact support.");
    }

    if (results.processed === 0) {
      recommendations.push("No jobs were available for processing. Check the job status or try different filters.");
    }

    // General tips
    if (results.processed > 0 && results.succeeded < results.processed) {
      recommendations.push("For better results, try processing jobs in smaller batches during off-peak hours.");
    }

    return recommendations;
  }
}