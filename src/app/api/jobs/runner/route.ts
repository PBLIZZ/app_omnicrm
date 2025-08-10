import { db } from "@/server/db/client";
import { and, eq } from "drizzle-orm";
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
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const jobError = error as JobError;
    const status = jobError.status ?? 401;
    return err(status, jobError.message ?? "Unauthorized");
  }

  // pull queued jobs for this user
  const queued = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.status, "queued")))
    .limit(25);
  let processed = 0;

  const MAX_ATTEMPTS = 5;
  const BASE_DELAY_MS = 200; // base jitter between jobs to avoid spikes
  const MAX_BACKOFF_MS = 60_000; // cap backoff to 60s

  const handlers: Record<JobKind, JobHandler> = {
    google_gmail_sync: runGmailSync,
    google_calendar_sync: runCalendarSync,
    normalize: async () => {},
    embed: runEmbed,
    insight: runInsight,
    normalize_google_email: runNormalizeGoogleEmail,
    normalize_google_event: runNormalizeGoogleEvent,
  };

  for (const job of queued as JobRecord[]) {
    // Defensive: ensure job belongs to the authenticated user
    if (job.userId !== userId) {
      await db
        .update(jobs)
        .set({ status: "error", attempts: job.attempts + 1, updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      continue;
    }

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
        await db
          .update(jobs)
          .set({ status: "error", attempts: job.attempts + 1, updatedAt: new Date() })
          .where(eq(jobs.id, job.id));
        continue;
      }

      // mark processing
      await db
        .update(jobs)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));

      await handler(job, userId);
      await db
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
        await db
          .update(jobs)
          .set({ status: "queued", attempts: nextAttempts, updatedAt: new Date() })
          .where(eq(jobs.id, job.id));
      } else {
        await db
          .update(jobs)
          .set({ status: "error", attempts: nextAttempts, updatedAt: new Date() })
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
