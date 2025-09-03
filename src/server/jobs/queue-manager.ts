import { getDb } from "@/server/db/client";
import { jobs } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { enqueue } from "./enqueue";
import type { JobKind, JobPayloadByKind } from "./types";
import { v4 as uuidv4 } from "uuid";
import { log } from "@/lib/log";

export interface BatchJobOptions {
  priority?: 'low' | 'medium' | 'high';
  delay?: number; // delay in milliseconds
  maxRetries?: number;
}

export interface BatchJob {
  payload: any;
  options?: BatchJobOptions;
}

export interface BatchStatus {
  batchId: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export class QueueManager {
  /**
   * Enqueue multiple jobs as a batch
   */
  async enqueueBatchJob<K extends JobKind>(
    userId: string,
    kind: K,
    batchJobs: BatchJob[],
    batchId?: string
  ): Promise<string[]> {
    if (batchJobs.length === 0) {
      return [];
    }

    const generatedBatchId = batchId || `batch_${uuidv4().replace(/-/g, '').substring(0, 8)}_${Date.now()}`;
    const jobIds: string[] = [];

    try {
      // Enqueue all jobs in the batch
      for (let i = 0; i < batchJobs.length; i++) {
        const batchJob = batchJobs[i];
        if (!batchJob) continue;
        const jobId = `${generatedBatchId}_${i}`;
        
        await enqueue(
          kind,
          batchJob.payload as JobPayloadByKind[K],
          userId,
          generatedBatchId
        );
        
        jobIds.push(jobId);
      }

      log.info(
        {
          op: "queue_manager.enqueue_batch",
          batchId: generatedBatchId,
          jobKind: kind,
          jobCount: batchJobs.length,
          userId,
        },
        `Enqueued batch of ${batchJobs.length} ${kind} jobs`
      );

      return jobIds;
    } catch (error) {
      log.error(
        {
          op: "queue_manager.enqueue_batch_error",
          batchId: generatedBatchId,
          jobKind: kind,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to enqueue batch jobs`
      );
      throw error;
    }
  }

  /**
   * Get the status of a batch of jobs
   */
  async getBatchStatus(batchId: string): Promise<BatchStatus | null> {
    const db = await getDb();

    try {
      const batchJobs = await db
        .select({
          id: jobs.id,
          status: jobs.status,
          createdAt: jobs.createdAt,
          updatedAt: jobs.updatedAt,
        })
        .from(jobs)
        .where(eq(jobs.batchId, batchId));

      if (batchJobs.length === 0) {
        return null;
      }

      const total = batchJobs.length;
      const completed = batchJobs.filter(job => job.status === 'completed').length;
      const failed = batchJobs.filter(job => job.status === 'failed').length;
      const pending = batchJobs.filter(job => ['queued', 'running'].includes(job.status)).length;

      let overallStatus: 'in_progress' | 'completed' | 'failed' | 'cancelled' = 'in_progress';
      
      if (completed === total) {
        overallStatus = 'completed';
      } else if (failed > 0 && (completed + failed) === total) {
        overallStatus = 'failed';
      } else if (pending === 0 && completed + failed === total) {
        overallStatus = failed > completed / 2 ? 'failed' : 'completed';
      }

      const createdAt = new Date(Math.min(...batchJobs.map(job => job.createdAt.getTime())));
      const updatedAt = new Date(Math.max(...batchJobs.map(job => job.updatedAt.getTime())));

      return {
        batchId,
        total,
        completed,
        failed,
        pending,
        status: overallStatus,
        createdAt,
        updatedAt,
      };
    } catch (error) {
      log.error(
        {
          op: "queue_manager.get_batch_status_error",
          batchId,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to get batch status`
      );
      return null;
    }
  }

  /**
   * Cancel all jobs in a batch
   */
  async cancelBatch(batchId: string, userId: string): Promise<number> {
    const db = await getDb();

    try {
      const result = await db
        .update(jobs)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(jobs.batchId, batchId),
            eq(jobs.userId, userId),
            inArray(jobs.status, ['queued'])
          )
        );

      const cancelledCount = (result as any).rowCount || 0;
      log.info(
        {
          op: "queue_manager.cancel_batch",
          batchId,
          userId,
          cancelledCount,
        },
        `Cancelled ${cancelledCount} jobs in batch`
      );

      return (result as any).rowCount || 0;
    } catch (error) {
      log.error(
        {
          op: "queue_manager.cancel_batch_error",
          batchId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to cancel batch`
      );
      throw error;
    }
  }

  /**
   * Get job statistics for a user
   */
  async getJobStats(userId: string): Promise<Record<string, number>> {
    const db = await getDb();

    try {
      const stats = await db
        .select({
          status: jobs.status,
          count: jobs.id, // This will be aggregated
        })
        .from(jobs)
        .where(eq(jobs.userId, userId));

      // Simple aggregation in memory since Drizzle doesn't have great aggregation support yet
      const statCounts: Record<string, number> = {};
      stats.forEach(stat => {
        statCounts[stat.status] = (statCounts[stat.status] || 0) + 1;
      });

      return statCounts;
    } catch (error) {
      log.error(
        {
          op: "queue_manager.get_job_stats_error",
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to get job stats`
      );
      return {};
    }
  }
}
