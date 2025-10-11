/**
 * Job Processing Service
 *
 * Centralises background job metrics and orchestration helpers.
 * Manual job processing flows were removed in favour of the
 * fully asynchronous sync pipeline.
 */

import { createJobsRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { JobRunner } from "@/server/jobs/runner";
import { logger } from "@/lib/observability";
import type { Job } from "@/server/db/schema";

export type JobStatusSummary = {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  retrying: number;
  total: number;
};

/**
 * Aggregate job counts for admin dashboards.
 */
export async function getJobSummaryService(
  userId: string,
  batchId?: string,
): Promise<JobStatusSummary> {
  const db = await getDb();
  const repo = createJobsRepository(db);
  const { statusCounts } = await repo.getJobCounts(userId, batchId);

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
export async function listRecentJobsService(
  userId: string,
  options: { batchId?: string; limit?: number } = {},
): Promise<Job[]> {
  const db = await getDb();
  const repo = createJobsRepository(db);
  return await repo.getRecentJobs(userId, options.batchId, options.limit ?? 20);
}

/**
 * Return currently queued or retrying jobs for the user.
 */
export async function listPendingJobsService(
  userId: string,
  options: {
    batchId?: string;
    kinds?: string[];
    statuses?: string[];
    limit?: number;
  } = {},
): Promise<Job[]> {
  const db = await getDb();
  const repo = createJobsRepository(db);
  return await repo.getPendingJobs(userId, options);
}

/**
 * Return jobs considered "stuck" based on last update timestamp.
 */
export async function listStuckJobsService(
  userId: string,
  thresholdMinutes: number = 10,
): Promise<Job[]> {
  const db = await getDb();
  const repo = createJobsRepository(db);
  return await repo.getStuckJobs(userId, thresholdMinutes);
}

/**
 * Background processor entry point for CRON or supervisor systems.
 */
export async function processAllPendingJobsService(
  batchSize: number = 25,
): Promise<{ processed: number; succeeded: number; failed: number; errors: string[] }> {
  const jobRunner = new JobRunner();
  return jobRunner.processJobs(batchSize);
}

/**
 * Scoped processor for a specific user, used by the /api/jobs/runner route.
 */
export async function processUserSpecificJobsService(
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
