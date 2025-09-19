/**
 * POST /api/jobs/process-manual — Manual job processing trigger with real-time feedback
 *
 * Allows users to manually trigger processing of pending jobs when sync shows
 * "150 imported, 120 processed" and they need to process the remaining 30.
 *
 * Features:
 * - Immediate processing with progress tracking
 * - Selective processing by job type or batch
 * - Real-time feedback and error handling
 * - Integration with error tracking system
 * - Safe execution with proper rate limiting
 */

import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { jobs } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { JobRunner } from "@/server/jobs/runner";
import { ErrorTrackingService } from "@/server/services/error-tracking.service";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { z } from "zod";

const processManualSchema = z.object({
  // Optional filters for selective processing
  jobTypes: z.array(z.enum(['normalize', 'embed', 'insight', 'sync_gmail', 'sync_calendar'])).optional(),
  batchId: z.string().optional(), // Process only jobs from specific batch
  maxJobs: z.number().int().min(1).max(100).optional().default(25), // Limit for safety

  // Processing options
  includeRetrying: z.boolean().optional().default(true), // Include jobs in retrying state
  skipStuckJobs: z.boolean().optional().default(false), // Skip jobs stuck in processing

  // Feedback options
  realTimeUpdates: z.boolean().optional().default(true), // Enable progress tracking
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "manual_job_processing" }, // Use default rate limiting
  validation: { body: processManualSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("jobs.process-manual", requestId);
  const {
    jobTypes,
    batchId,
    maxJobs,
    includeRetrying,
    skipStuckJobs
  } = validated.body;

  try {
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
      .orderBy(jobs.createdAt) // Process oldest first
      .limit(maxJobs);

    if (eligibleJobs.length === 0) {
      return api.success({
        message: "No eligible jobs found for processing",
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        jobs: [],
        stats: {
          totalEligible: 0,
          alreadyProcessing: 0,
          stuckJobs: 0,
        }
      });
    }

    // Filter out stuck jobs if requested
    let jobsToProcess = eligibleJobs;
    let skippedStuckJobs = 0;

    if (skipStuckJobs) {
      const stuckJobThresholdMs = 10 * 60 * 1000; // 10 minutes
      const now = Date.now();

      jobsToProcess = eligibleJobs.filter(job => {
        if (job.status !== 'processing') return true;

        const timeSinceUpdate = now - new Date(job.updatedAt).getTime();
        const isStuck = timeSinceUpdate > stuckJobThresholdMs;

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

    // Record processing attempt for error tracking
    const processingStartTime = Date.now();
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

        // Record errors in the error tracking system
        await Promise.all(
          processingErrors.map(({ jobId, error }) =>
            ErrorTrackingService.recordError(userId, error, {
              provider: 'gmail', // Default, could be refined based on job type
              stage: 'processing',
              operation: 'manual_job_processing',
              itemId: jobId,
              additionalMeta: {
                processingType: 'manual',
                requestId,
                filters: { jobTypes, batchId }
              }
            })
          )
        );
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

      // Generate user-friendly messages
      let message: string;
      if (result.failed === 0) {
        message = `Successfully processed ${result.succeeded} job${result.succeeded !== 1 ? 's' : ''}`;
      } else if (result.succeeded > 0) {
        message = `Processed ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed`;
      } else {
        message = `Processing failed: ${result.failed} job${result.failed !== 1 ? 's' : ''} encountered errors`;
      }

      return api.success({
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
        recommendations: generateProcessingRecommendations({
          processed: result.processed,
          succeeded: result.succeeded,
          failed: result.failed,
          errors: result.errors,
          hasStuckJobs: skippedStuckJobs > 0
        })
      });

    } catch (processingError) {
      const errorMsg = processingError instanceof Error ? processingError.message : String(processingError);

      // Record the processing failure
      await ErrorTrackingService.recordError(userId, ensureError(processingError), {
        provider: 'gmail',
        stage: 'processing',
        operation: 'manual_job_processing_failure',
        additionalMeta: {
          processingType: 'manual',
          requestId,
          eligibleJobCount: eligibleJobs.length,
          filters: { jobTypes, batchId }
        }
      });

      await logger.error("Manual job processing failed", {
        operation: "manual_job_processing",
        additionalData: {
          userId,
          requestId,
          eligibleJobCount: eligibleJobs.length,
          error: errorMsg
        }
      }, ensureError(processingError));

      return api.error(
        "Job processing failed unexpectedly",
        "INTERNAL_ERROR",
        {
          details: "The job processing system encountered an error. Please try again or contact support if the problem persists.",
          eligibleJobs: eligibleJobs.length,
          suggestions: [
            "Wait a few minutes and try again",
            "Try processing fewer jobs at once",
            "Check the job status for stuck jobs",
            "Contact support if errors persist"
          ]
        },
        ensureError(processingError)
      );
    }

  } catch (error) {
    await logger.error("Manual job processing setup failed", {
      operation: "manual_job_processing",
      additionalData: { userId, requestId }
    }, ensureError(error));

    return api.error(
      "Failed to start job processing",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error)
    );
  }
});

/**
 * Generate recommendations based on processing results
 */
function generateProcessingRecommendations(results: {
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