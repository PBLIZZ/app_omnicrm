import { eq, and, desc, inArray, count, sql } from "drizzle-orm";
import { jobs } from "@/server/db/schema";
import { getDb } from "./db";
import type {
  Job,
  CreateJob
} from "@/server/db/schema";

// Local type aliases for repository layer
type JobDTO = Job;
type CreateJobDTO = CreateJob;

export class JobsRepository {
  /**
   * Create a new job
   */
  static async createJob(data: CreateJobDTO & { userId: string }): Promise<JobDTO> {
    const db = await getDb();

    const insertValues = {
      userId: data.userId,
      kind: data.kind,
      payload: data.payload,
      batchId: data.batchId ?? null,
      status: "queued" as const,
      attempts: 0,
      lastError: null,
    };

    const [newJob] = await db
      .insert(jobs)
      .values(insertValues)
      .returning({
        id: jobs.id,
        userId: jobs.userId,
        kind: jobs.kind,
        payload: jobs.payload,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        lastError: jobs.lastError,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      });

    return newJob;
  }

  /**
   * Get a job by ID
   */
  static async getJobById(userId: string, jobId: string): Promise<JobDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: jobs.id,
        userId: jobs.userId,
        kind: jobs.kind,
        payload: jobs.payload,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        lastError: jobs.lastError,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * List jobs for a user with optional filtering
   */
  static async listJobs(
    userId: string,
    options: {
      status?: string[];
      kind?: string[];
      batchId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<JobDTO[]> {
    const db = await getDb();
    const { status, kind, batchId, limit = 50, offset = 0 } = options;

    const conditions = [eq(jobs.userId, userId)];

    if (status && status.length > 0) {
      conditions.push(inArray(jobs.status, status));
    }

    if (kind && kind.length > 0) {
      conditions.push(inArray(jobs.kind, kind));
    }

    if (batchId) {
      conditions.push(eq(jobs.batchId, batchId));
    }

    const rows = await db
      .select({
        id: jobs.id,
        userId: jobs.userId,
        kind: jobs.kind,
        payload: jobs.payload,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        lastError: jobs.lastError,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.updatedAt))
      .limit(limit)
      .offset(offset);

    return rows.map(row => row);
  }

  /**
   * Get job counts by status and kind
   */
  static async getJobCounts(userId: string, batchId?: string): Promise<{
    statusCounts: Record<string, number>;
    kindCounts: Record<string, number>;
  }> {
    const db = await getDb();

    const conditions = [eq(jobs.userId, userId)];
    if (batchId) {
      conditions.push(eq(jobs.batchId, batchId));
    }

    const jobCounts = await db
      .select({
        status: jobs.status,
        kind: jobs.kind,
        count: count(),
      })
      .from(jobs)
      .where(and(...conditions))
      .groupBy(jobs.status, jobs.kind);

    const statusCounts = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      retrying: 0,
    };

    const kindCounts = {
      normalize: 0,
      embed: 0,
      insight: 0,
      sync_gmail: 0,
      sync_calendar: 0,
      google_gmail_sync: 0,
    };

    jobCounts.forEach(({ status, kind, count: jobCount }) => {
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts] += jobCount;
      }
      if (kind in kindCounts) {
        kindCounts[kind as keyof typeof kindCounts] += jobCount;
      }
    });

    return { statusCounts, kindCounts };
  }

  /**
   * Get pending jobs (queued, processing, retrying)
   */
  static async getPendingJobs(userId: string, batchId?: string, limit: number = 50): Promise<JobDTO[]> {
    const db = await getDb();

    const conditions = [
      eq(jobs.userId, userId),
      inArray(jobs.status, ['queued', 'processing', 'retrying'])
    ];

    if (batchId) {
      conditions.push(eq(jobs.batchId, batchId));
    }

    const rows = await db
      .select({
        id: jobs.id,
        userId: jobs.userId,
        kind: jobs.kind,
        payload: jobs.payload,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        lastError: jobs.lastError,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(and(...conditions))
      .orderBy(jobs.createdAt)
      .limit(limit);

    return rows.map(row => row);
  }

  /**
   * Get recent jobs for history/monitoring
   */
  static async getRecentJobs(userId: string, batchId?: string, limit: number = 20): Promise<JobDTO[]> {
    const db = await getDb();

    const conditions = [eq(jobs.userId, userId)];
    if (batchId) {
      conditions.push(eq(jobs.batchId, batchId));
    }

    const rows = await db
      .select({
        id: jobs.id,
        userId: jobs.userId,
        kind: jobs.kind,
        payload: jobs.payload,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        lastError: jobs.lastError,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.updatedAt))
      .limit(limit);

    return rows.map(row => row);
  }

  /**
   * Update job status and error information
   */
  static async updateJobStatus(
    userId: string,
    jobId: string,
    updates: {
      status?: string;
      attempts?: number;
      lastError?: string | null;
    }
  ): Promise<JobDTO | null> {
    const db = await getDb();

    const updateValues = {
      updatedAt: new Date(),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.attempts !== undefined && { attempts: updates.attempts }),
      ...(updates.lastError !== undefined && { lastError: updates.lastError }),
    };

    const [updatedJob] = await db
      .update(jobs)
      .set(updateValues)
      .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
      .returning({
        id: jobs.id,
        userId: jobs.userId,
        kind: jobs.kind,
        payload: jobs.payload,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        lastError: jobs.lastError,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      });

    if (!updatedJob) {
      return null;
    }

    return updatedJob;
  }

  /**
   * Delete jobs by batch ID
   */
  static async deleteJobsByBatch(userId: string, batchId: string): Promise<number> {
    const db = await getDb();

    const result = await db
      .delete(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.batchId, batchId)));

    return result.length;
  }

  /**
   * Count total jobs for a user
   */
  static async countJobs(userId: string, batchId?: string): Promise<number> {
    const db = await getDb();

    const conditions = [eq(jobs.userId, userId)];
    if (batchId) {
      conditions.push(eq(jobs.batchId, batchId));
    }

    const result = await db
      .select({ count: count() })
      .from(jobs)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  /**
   * Get jobs that have been processing for too long (stuck jobs)
   */
  static async getStuckJobs(
    userId: string,
    thresholdMinutes: number = 10
  ): Promise<JobDTO[]> {
    const db = await getDb();

    const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const rows = await db
      .select({
        id: jobs.id,
        userId: jobs.userId,
        kind: jobs.kind,
        payload: jobs.payload,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        lastError: jobs.lastError,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          eq(jobs.status, 'processing'),
          sql`${jobs.updatedAt} < ${thresholdTime}`
        )
      );

    return rows.map(row => row);
  }

  /**
   * Bulk create jobs for batch operations
   */
  static async createBulkJobs(
    jobsData: Array<CreateJobDTO & { userId: string }>
  ): Promise<JobDTO[]> {
    if (jobsData.length === 0) {
      return [];
    }

    const db = await getDb();

    const insertValues = jobsData.map(job => ({
      userId: job.userId,
      kind: job.kind,
      payload: job.payload,
      batchId: job.batchId ?? null,
      status: "queued" as const,
      attempts: 0,
      lastError: null,
    }));

    const newJobs = await db
      .insert(jobs)
      .values(insertValues)
      .returning({
        id: jobs.id,
        userId: jobs.userId,
        kind: jobs.kind,
        payload: jobs.payload,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        lastError: jobs.lastError,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      });

    return newJobs.map(job => job);
  }
}