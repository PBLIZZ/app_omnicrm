/** GET /api/settings/sync/status — aggregated sync status (auth required). Errors: 401 Unauthorized */
// NextResponse not used; using helpers
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { jobs, rawEvents, syncAudit, userIntegrations } from "@/server/db/schema";
import { err, ok } from "@/server/http/responses";
import { toApiError } from "@/server/jobs/types";

export async function GET(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  const dbo = await getDb();
  // Connection status
  const integrations = await dbo
    .select()
    .from(userIntegrations)
    .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")))
    .limit(1);
  const googleConnected = !!integrations[0];

  // Last sync per provider (based on latest created_at of raw_events)
  const [gmailLast] = await dbo
    .select({ createdAt: rawEvents.createdAt })
    .from(rawEvents)
    .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "gmail")))
    .orderBy(desc(rawEvents.createdAt))
    .limit(1);
  const [calendarLast] = await dbo
    .select({ createdAt: rawEvents.createdAt })
    .from(rawEvents)
    .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "calendar")))
    .orderBy(desc(rawEvents.createdAt))
    .limit(1);

  // Last approved scopes from audit (optional badges)
  const [gmailApprove] = await dbo
    .select({ payload: syncAudit.payload })
    .from(syncAudit)
    .where(
      and(
        eq(syncAudit.userId, userId),
        eq(syncAudit.provider, "gmail"),
        eq(syncAudit.action, "approve"),
      ),
    )
    .orderBy(desc(syncAudit.createdAt))
    .limit(1);
  const [calendarApprove] = await dbo
    .select({ payload: syncAudit.payload })
    .from(syncAudit)
    .where(
      and(
        eq(syncAudit.userId, userId),
        eq(syncAudit.provider, "calendar"),
        eq(syncAudit.action, "approve"),
      ),
    )
    .orderBy(desc(syncAudit.createdAt))
    .limit(1);

  // Job counts for Google-related kinds
  const googleJobKinds = [
    "google_gmail_sync",
    "google_calendar_sync",
    "normalize_google_email",
    "normalize_google_event",
  ] as const;
  const [queued] = await dbo
    .select({ n: sql<number>`count(*)` })
    .from(jobs)
    .where(
      and(eq(jobs.userId, userId), eq(jobs.status, "queued"), inArray(jobs.kind, googleJobKinds)),
    )
    .limit(1);
  const [done] = await dbo
    .select({ n: sql<number>`count(*)` })
    .from(jobs)
    .where(
      and(eq(jobs.userId, userId), eq(jobs.status, "done"), inArray(jobs.kind, googleJobKinds)),
    )
    .limit(1);
  const [error] = await dbo
    .select({ n: sql<number>`count(*)` })
    .from(jobs)
    .where(
      and(eq(jobs.userId, userId), eq(jobs.status, "error"), inArray(jobs.kind, googleJobKinds)),
    )
    .limit(1);

  // Discover last batchId (most recent approved gmail/calendar approve audit won't always carry batchId; read from latest job)
  const [lastBatch] = await dbo
    .select({ batchId: jobs.batchId })
    .from(jobs)
    .where(and(eq(jobs.userId, userId)))
    .orderBy(desc(jobs.createdAt))
    .limit(1);

  return ok({
    googleConnected,
    flags: {
      gmail: process.env["FEATURE_GOOGLE_GMAIL_RO"] === "1",
      calendar: process.env["FEATURE_GOOGLE_CALENDAR_RO"] === "1",
    },
    lastSync: {
      gmail: gmailLast?.createdAt?.toISOString() ?? null,
      calendar: calendarLast?.createdAt?.toISOString() ?? null,
    },
    lastBatchId: lastBatch?.batchId ?? null,
    grantedScopes: {
      gmail: (gmailApprove?.payload as Record<string, unknown>)?.["grantedScopes"] ?? null,
      calendar: (calendarApprove?.payload as Record<string, unknown>)?.["grantedScopes"] ?? null,
    },
    jobs: {
      queued: queued?.n ?? 0,
      done: done?.n ?? 0,
      error: error?.n ?? 0,
    },
  });
}
