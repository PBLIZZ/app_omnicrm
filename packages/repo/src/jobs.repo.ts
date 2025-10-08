import { and, count, desc, eq, inArray, sql, type InferSelectModel } from "drizzle-orm";

import { jobs, type CreateJob, type Job } from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

type JobRow = InferSelectModel<typeof jobs>;
type CreateJobDTO = CreateJob;

export class JobsRepository {
  /**
   * Create a single job for a user.
   */
  static async createJob(
    db: DbClient,
    data: CreateJobDTO & { userId: string },
  ): Promise<Job> {
    if (!data.userId?.trim() || !data.kind?.trim()) {
      throw new Error("userId and kind are required");
    }

    const [created] = (await db
      .insert(jobs)
      .values({
        userId: data.userId,
        kind: data.kind,
        payload: data.payload,
        batchId: data.batchId ?? null,
        status: "queued",
        attempts: data.attempts ?? 0,
        lastError: data.lastError ?? null,
      })
      .returning()) as JobRow[];

    if (!created) {
      throw new Error("Failed to create job");
    }

    return created;
  }

  /**
   * Fetch a job by identifier.
   */
  static async getJobById(
    db: DbClient,
    userId: string,
    jobId: string,
  ): Promise<Job | null> {
    const rows = (await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
      .limit(1)) as JobRow[];

    return rows[0] ?? null;
  }

  /**
   * List jobs with optional filtering and pagination.
   */
  static async listJobs(
    db: DbClient,
    userId: string,
    options: {
      status?: string[];
      kind?: string[];
      batchId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<Job[]> {
    const { status, kind, batchId, limit = 50, offset = 0 } = options;

    const conditions = [eq(jobs.userId, userId)];

    if (status?.length) {
      conditions.push(inArray(jobs.status, status));
    }

    if (kind?.length) {
      conditions.push(inArray(jobs.kind, kind));
    }

    if (batchId) {
      conditions.push(eq(jobs.batchId, batchId));
    }

    const rows = (await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.updatedAt))
      .limit(limit)
      .offset(offset)) as JobRow[];

    return rows;
  }

  /**
   * Aggregate counts for dashboard summaries.
   */
  static async getJobCounts(
    db: DbClient,
    userId: string,
    batchId?: string,
  ): Promise<{
    statusCounts: Record<string, number>;
    kindCounts: Record<string, number>;
  }> {
    const conditions = [eq(jobs.userId, userId)];

    if (batchId) {
      conditions.push(eq(jobs.batchId, batchId));
    }

    const rows = (await db
      .select({
        status: jobs.status,
        kind: jobs.kind,
        value: count(),
      })
      .from(jobs)
      .where(and(...conditions))
      .groupBy(jobs.status, jobs.kind)) as Array<{ status: string; kind: string; value: number | bigint }>;

    const statusCounts: Record<string, number> = {};
    const kindCounts: Record<string, number> = {};

    for (const row of rows) {
      statusCounts[row.status] = (statusCounts[row.status] ?? 0) + Number(row.value ?? 0);
      kindCounts[row.kind] = (kindCounts[row.kind] ?? 0) + Number(row.value ?? 0);
    }

    return { statusCounts, kindCounts };
  }

  /**
   * Retrieve jobs pending execution.
   */
  static async getPendingJobs(
    db: DbClient,
    userId: string,
    options: {
      batchId?: string;
      kinds?: string[];
      statuses?: string[];
      limit?: number;
      orderBy?: "createdAt" | "updatedAt";
      direction?: "asc" | "desc";
    } = {},
  ): Promise<Job[]> {
    const {
      batchId,
      kinds,
      statuses = ["queued", "retrying"],
      limit = 50,
      orderBy = "createdAt",
      direction = "asc",
    } = options;

    const conditions = [eq(jobs.userId, userId)];

    if (statuses.length > 0) {
      conditions.push(inArray(jobs.status, statuses));
    }

    if (batchId) {
      conditions.push(eq(jobs.batchId, batchId));
    }

    if (kinds?.length) {
      conditions.push(inArray(jobs.kind, kinds));
    }

    const orderColumn = orderBy === "updatedAt" ? jobs.updatedAt : jobs.createdAt;
    const orderExpression = direction === "desc" ? desc(orderColumn) : orderColumn;

    const rows = (await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(orderExpression)
      .limit(limit)) as JobRow[];

    return rows;
  }

  /**
   * Retrieve recently updated jobs.
   */
  static async getRecentJobs(
    db: DbClient,
    userId: string,
    batchId: string | undefined,
    limit: number = 20,
  ): Promise<Job[]> {
    const conditions = [eq(jobs.userId, userId)];

    if (batchId) {
      conditions.push(eq(jobs.batchId, batchId));
    }

    const rows = (await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.updatedAt))
      .limit(limit)) as JobRow[];

    return rows;
  }

  /**
   * Fetch multiple jobs by identifiers.
   */
  static async getJobsByIds(
    db: DbClient,
    userId: string,
    jobIds: string[],
  ): Promise<Job[]> {
    if (jobIds.length === 0) {
      return [];
    }

    const rows = (await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, userId), inArray(jobs.id, jobIds)))) as JobRow[];

    return rows;
  }

  /**
   * Update status metadata for a job.
   */
  static async updateJobStatus(
    db: DbClient,
    userId: string,
    jobId: string,
    updates: {
      status?: string;
      attempts?: number;
      lastError?: string | null;
    },
  ): Promise<Job | null> {
    if (
      updates.status === undefined &&
      updates.attempts === undefined &&
      updates.lastError === undefined
    ) {
      throw new Error("No job updates specified");
    }

    const [updated] = (await db
      .update(jobs)
      .set({
        updatedAt: new Date(),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(updates.attempts !== undefined ? { attempts: updates.attempts } : {}),
        ...(updates.lastError !== undefined ? { lastError: updates.lastError } : {}),
      })
      .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
      .returning()) as JobRow[];

    return updated ?? null;
  }

  /**
   * Delete jobs associated with a batch.
   */
  static async deleteJobsByBatch(
    db: DbClient,
    userId: string,
    batchId: string,
  ): Promise<number> {
    const deleted = (await db
      .delete(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.batchId, batchId)))
      .returning({ id: jobs.id })) as Array<{ id: string }>;

    return deleted.length;
  }

  /**
   * Count total jobs for a user (optionally scoped to a batch).
   */
  static async countJobs(
    db: DbClient,
    userId: string,
    batchId?: string,
  ): Promise<number> {
    const conditions = [eq(jobs.userId, userId)];

    if (batchId) {
      conditions.push(eq(jobs.batchId, batchId));
    }

    const [row] = (await db
      .select({ value: count() })
      .from(jobs)
      .where(and(...conditions))) as Array<{ value: number | bigint }>;

    return Number(row?.value ?? 0);
  }

  /**
   * Find jobs that appear to be stuck in processing.
   */
  static async getStuckJobs(
    db: DbClient,
    userId: string,
    thresholdMinutes: number = 10,
  ): Promise<Job[]> {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const rows = (await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          eq(jobs.status, "processing"),
          sql`${jobs.updatedAt} < ${threshold}`,
        ),
      )) as JobRow[];

    return rows;
  }

  /**
   * Bulk create jobs for batch operations.
   */
  static async createBulkJobs(
    db: DbClient,
    jobsData: Array<CreateJobDTO & { userId: string }>,
  ): Promise<Job[]> {
    if (jobsData.length === 0) {
      return [];
    }

    const rows = (await db
      .insert(jobs)
      .values(
        jobsData.map((job) => ({
          userId: job.userId,
          kind: job.kind,
          payload: job.payload,
          batchId: job.batchId ?? null,
          status: "queued",
          attempts: job.attempts ?? 0,
          lastError: job.lastError ?? null,
        })),
      )
      .returning()) as JobRow[];

    return rows;
  }
}
