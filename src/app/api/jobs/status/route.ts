/** GET /api/jobs/status — get current job status for polling (auth required). Errors: 401 Unauthorized */
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { and, desc, eq, sql } from "drizzle-orm";
import { jobs, rawEvents } from "@/server/db/schema";
import { err, ok } from "@/lib/api/http";
import { log } from "@/lib/log";
import { toApiError } from "@/server/jobs/types";

interface JobStatusResponse {
  id: string;
  kind: string;
  status: "queued" | "running" | "completed" | "error";
  progress?: number | undefined;
  message?: string | undefined;
  batchId?: string | undefined;
  createdAt: string;
  updatedAt: string;
  totalEmails?: number | undefined;
  processedEmails?: number | undefined;
  newEmails?: number | undefined;
  chunkSize?: number | undefined;
  chunksTotal?: number | undefined;
  chunksProcessed?: number | undefined;
}

export async function GET(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  try {
    const dbo = await getDb();

    // Get recent jobs for this user (limit to most recent 50)
    const recentJobs = await dbo
      .select({
        id: jobs.id,
        kind: jobs.kind,
        status: jobs.status,
        batchId: jobs.batchId,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        payload: jobs.payload,
        error: jobs.lastError,
      })
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt))
      .limit(50);

    // Determine current batch if any job is queued/running
    const currentBatch =
      recentJobs.find((job) => job.status === "queued" || job.status === "running")?.batchId ??
      null;

    let totalEmails = 0;
    let processedEmails = 0;

    if (currentBatch) {
      // Count raw gmail events written for progress
      const eventStats = await dbo
        .select({ count: sql<number>`COUNT(*)` })
        .from(rawEvents)
        .where(
          and(
            eq(rawEvents.userId, userId),
            eq(rawEvents.batchId, currentBatch),
            eq(rawEvents.provider, "gmail"),
          ),
        );

      processedEmails = eventStats[0]?.count ?? 0;

      // Try to read an estimated total from the gmail sync job payload if present
      const gmailSyncJob = recentJobs.find(
        (job) => job.kind === "google_gmail_sync" && job.batchId === currentBatch,
      );
      if (gmailSyncJob?.payload && typeof gmailSyncJob.payload === "object") {
        const payload = gmailSyncJob.payload as Record<string, unknown>;
        const n = payload?.["totalEmails"];
        if (typeof n === "number") totalEmails = n;
      }
    }

    // Serialize for client
    const jobStatuses: JobStatusResponse[] = recentJobs.map((job) => {
      const createdAt =
        job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt ?? "");
      const updatedAt =
        job.updatedAt instanceof Date ? job.updatedAt.toISOString() : String(job.updatedAt ?? "");
      let extras: Partial<JobStatusResponse> = {};
      if (job.kind === "google_gmail_sync" && job.payload && typeof job.payload === "object") {
        const p = job.payload as Record<string, unknown>;
        const total = typeof p["totalEmails"] === "number" ? p["totalEmails"] : undefined;
        const done = typeof p["processedEmails"] === "number" ? p["processedEmails"] : undefined;
        const newEmails = typeof p["newEmails"] === "number" ? p["newEmails"] : undefined;
        const chunkSize = typeof p["chunkSize"] === "number" ? p["chunkSize"] : undefined;
        const chunksTotal = typeof p["chunksTotal"] === "number" ? p["chunksTotal"] : undefined;
        const chunksProcessed =
          typeof p["chunksProcessed"] === "number" ? p["chunksProcessed"] : undefined;
        const progress =
          total && done ? Math.max(1, Math.min(99, Math.round((done / total) * 100))) : undefined;
        extras = {
          totalEmails: total,
          processedEmails: done,
          newEmails,
          chunkSize,
          chunksTotal,
          chunksProcessed,
          progress,
        };
      }
      return {
        id: job.id,
        kind: job.kind,
        status: job.status as JobStatusResponse["status"],
        batchId: job.batchId ?? undefined,
        createdAt,
        updatedAt,
        message: typeof job.error === "string" ? job.error : undefined,
        ...extras,
      };
    });

    return ok({
      jobs: jobStatuses,
      currentBatch,
      totalEmails: totalEmails > 0 ? totalEmails : undefined,
      processedEmails: processedEmails > 0 ? processedEmails : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.warn({ op: "jobs.status.error", userId, error: msg });
    // Return a safe, empty state so the UI does not break
    return ok({ jobs: [], currentBatch: null });
  }
}
