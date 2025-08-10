import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { and, eq } from "drizzle-orm";
import { jobs } from "@/server/db/schema";
import { runCalendarSync, runGmailSync } from "@/server/jobs/processors/sync";
import {
  runNormalizeGoogleEmail,
  runNormalizeGoogleEvent,
} from "@/server/jobs/processors/normalize";
import { getServerUserId } from "@/server/auth/user";

export async function POST() {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: any) {
    const status = e?.status ?? 401;
    return NextResponse.json({ error: e.message ?? "Unauthorized" }, { status });
  }

  // pull queued jobs for this user
  const queued = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.status, "queued")))
    .limit(25);
  let processed = 0;

  for (const job of queued) {
    try {
      switch (job.kind) {
        case "google_gmail_sync":
          await runGmailSync(job, userId);
          break;
        case "google_calendar_sync":
          await runCalendarSync(job, userId);
          break;
        case "normalize_google_email":
          await runNormalizeGoogleEmail(job, userId);
          break;
        case "normalize_google_event":
          await runNormalizeGoogleEvent(job, userId);
          break;
        default:
          // unknown job, mark error
          throw new Error(`unknown_job:${job.kind}`);
      }
      await db
        .update(jobs)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      processed += 1;
    } catch {
      await db
        .update(jobs)
        .set({ status: "error", attempts: job.attempts + 1, updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
    }
  }

  return NextResponse.json({ processed });
}
