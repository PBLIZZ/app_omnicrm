import { getDb } from "@/server/db/client";
import { and, desc, eq } from "drizzle-orm";
import { jobs } from "@/server/db/schema";
import { runCalendarSync, runGmailSync } from "@/server/jobs/processors/sync";
import {
  runNormalizeGoogleEmail,
  runNormalizeGoogleEvent,
} from "@/server/jobs/processors/normalize";
import { runEmbed } from "@/server/jobs/processors/embed";
import { runInsight } from "@/server/jobs/processors/insight";
import { getServerUserId } from "@/server/auth/user";
import type { JobKind, JobRecord, JobHandler, JobError } from "@/server/jobs/types";
import { log } from "@/server/log";
import { ok, err } from "@/server/http/responses";

export async function POST() {
  const dbo = await getDb();
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const jobError = error as JobError;
    const status = jobError.status ?? 401;
    return err(status, jobError.message ?? "Unauthorized");
  }

  // pull queued jobs for this user
  const queued = await dbo
    .select()
    .from(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.status, "queued")))
    // why: aligns with (user_id, status, updated_at desc) index for predictable scheduling
    .orderBy(desc(jobs.updatedAt))
    .limit(25);
  let processed = 0;

  const MAX_ATTEMPTS = 5;
  const BASE_DELAY_MS = 200; // base jitter between jobs to avoid spikes
  const MAX_BACKOFF_MS = 60_000; // cap backoff to 60s

  const handlers: Record<JobKind, JobHandler> = {
    google_gmail_sync: runGmailSync as unknown as JobHandler,
    google_calendar_sync: runCalendarSync as unknown as JobHandler,
    normalize: async () => {},
    embed: runEmbed as unknown as JobHandler,
    insight: runInsight as unknown as JobHandler,
    normalize_google_email: runNormalizeGoogleEmail as unknown as JobHandler,
    normalize_google_event: runNormalizeGoogleEvent as unknown as JobHandler,
  };

  for (const job of queued as JobRecord[]) {
    // Exponential backoff: skip too-soon retries based on updatedAt + backoff(attempts)
    const attempts = Number(job.attempts ?? 0);
    const backoffMs = Math.min(BASE_DELAY_MS * 2 ** attempts, MAX_BACKOFF_MS);
    const lastUpdated = job.updatedAt ? new Date(job.updatedAt).getTime() : 0;
    const now = Date.now();
    if (attempts > 0 && now - lastUpdated < backoffMs) {
      // not ready yet; leave queued
      continue;
    }

    try {
      const handler = handlers[job.kind as JobKind];
      if (!handler) {
        await dbo
          .update(jobs)
          .set({ status: "error", attempts: job.attempts + 1, updatedAt: new Date() })
          .where(eq(jobs.id, job.id));
        continue;
      }

      // Atomically claim the job for this user to avoid races
      const claimed = await dbo
        .update(jobs)
        .set({ status: "processing", updatedAt: new Date() })
        .where(and(eq(jobs.id, job.id), eq(jobs.userId, userId), eq(jobs.status, "queued")))
        .returning({ id: jobs.id });
      if (claimed.length === 0) {
        // another worker/user claimed or job no longer queued
        continue;
      }

      await handler(job as unknown, userId);
      await dbo
        .update(jobs)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      processed += 1;
      // small inter-job delay to smooth throughput
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS));
    } catch (error: unknown) {
      const nextAttempts = attempts + 1;
      const willRetry = nextAttempts < MAX_ATTEMPTS;

      if (willRetry) {
        // Re-queue with incremented attempts; runner enforces time-based backoff using updatedAt
        await dbo
          .update(jobs)
          .set({
            status: "queued",
            attempts: nextAttempts,
            updatedAt: new Date(),
            lastError: (error as { message?: string }).message ?? "unknown_error",
          })
          .where(eq(jobs.id, job.id));
      } else {
        await dbo
          .update(jobs)
          .set({
            status: "error",
            attempts: nextAttempts,
            updatedAt: new Date(),
            lastError: (error as { message?: string }).message ?? "unknown_error",
          })
          .where(eq(jobs.id, job.id));
      }

      const jobError = error as JobError;
      log.warn(
        {
          jobId: job.id,
          kind: job.kind,
          attempts: nextAttempts,
          willRetry,
          error: jobError.message ?? "Unknown error",
        },
        "job_failed",
      );
    }
  }

  return ok({ processed });
}
