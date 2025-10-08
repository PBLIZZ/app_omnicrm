/**
 * Job Processing Service
 *
 * Centralises background job metrics and orchestration helpers.
 * Manual job processing flows were removed in favour of the
 * fully asynchronous sync pipeline.
 */

import { JobsRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { JobRunner } from "@/server/jobs/runner";
import { logger } from "@/lib/observability";
import type { Job } from "@/server/db/schema";

type JobStatusSummary = {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  retrying: number;
  total: number;
};

export class JobProcessingService {
  /**
   * Aggregate job counts for admin dashboards.
   */
  static async getJobSummary(userId: string, batchId?: string): Promise<JobStatusSummary> {
    const db = await getDb();
    const { statusCounts } = await JobsRepository.getJobCounts(db, userId, batchId);

    const pending = statusCounts["queued"] ?? 0;
    const processing = statusCounts["processing"] ?? 0;
    const failed = statusCounts["error"] ?? statusCounts["failed"] ?? 0;
    const completed = statusCounts["done"] ?? statusCounts["completed"] ?? 0;
    const retrying = statusCounts["retrying"] ?? 0;
    const total = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);

    return { pending, processing, failed, completed, retrying, total };
  }

  /**
   * Return the most recent jobs for diagnostics or audit views.
   */
  static async listRecentJobs(
    userId: string,
    options: { batchId?: string; limit?: number } = {},
  ): Promise<Job[]> {
    const db = await getDb();
    return JobsRepository.getRecentJobs(db, userId, options.batchId, options.limit ?? 20);
  }

  /**
   * Return currently queued or retrying jobs for the user.
   */
  static async listPendingJobs(
    userId: string,
    options: {
      batchId?: string;
      kinds?: string[];
      statuses?: string[];
      limit?: number;
    } = {},
  ): Promise<Job[]> {
    const db = await getDb();
    return JobsRepository.getPendingJobs(db, userId, options);
  }

  /**
   * Return jobs considered "stuck" based on last update timestamp.
   */
  static async listStuckJobs(userId: string, thresholdMinutes: number = 10): Promise<Job[]> {
    const db = await getDb();
    return JobsRepository.getStuckJobs(db, userId, thresholdMinutes);
  }

  /**
   * Background processor entry point for CRON or supervisor systems.
   */
  static async processAllPendingJobs(
    batchSize: number = 25,
  ): Promise<{ processed: number; succeeded: number; failed: number; errors: string[] }> {
    const jobRunner = new JobRunner();
    return jobRunner.processJobs(batchSize);
  }

  /**
   * Scoped processor for a specific user, used by the /api/jobs/runner route.
   */
  static async processUserSpecificJobs(
    userId: string,
    requestId?: string,
  ): Promise<{ processed: number; succeeded: number; failed: number; errors: unknown[] }> {
    await logger.info("Job runner processing started", {
      operation: "job_runner.start",
      additionalData: { userId, requestId },
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
}

export type { JobStatusSummary };
