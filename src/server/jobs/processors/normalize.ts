import { getDb } from "@/server/db/client";
import { supaAdminGuard } from "@/server/db/supabase-admin";
import { and, eq } from "drizzle-orm";
import { rawEvents } from "@/server/db/schema";
import type { JobRecord } from "../types";
import type { RawEvent } from "@/server/db/schema";
import { log } from "@/server/log";
// No verbose logging here to keep normalization fast and predictable
/**
 * Processor constraints:
 * - API call timeout: 10 seconds (applies when external calls added)
 * - Retries: 3 with jitter (callWithRetry when applicable)
 * - Hard cap: 3 minutes per job to avoid runaways
 */

export async function runNormalizeGoogleEmail(job: JobRecord): Promise<void> {
  const dbo = await getDb();
  const batchId = (job.payload as { batchId?: string })?.batchId;
  const startedAt = Date.now();
  const deadlineMs = startedAt + 3 * 60 * 1000; // hard cap: 3 minutes per job to avoid runaways
  let itemsFetched = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;
  const rows: RawEvent[] = await dbo
    .select()
    .from(rawEvents)
    .where(
      and(
        eq(rawEvents.userId, job.userId),
        eq(rawEvents.provider, "gmail"),
        batchId ? eq(rawEvents.batchId, batchId) : eq(rawEvents.batchId, rawEvents.batchId),
      ),
    );

  for (const r of rows) {
    if (Date.now() > deadlineMs) break; // why: protect against unexpectedly large batches
    itemsFetched += 1;
    const payload = r.payload as unknown as {
      payload?: { headers?: Array<{ name?: string | null; value?: string | null }> };
      snippet?: string | null;
      id?: string | null;
    };
    const headers: Array<{ name?: string | null; value?: string | null }> =
      payload?.payload?.headers ?? [];
    const subject = headers.find((h) => (h.name ?? "").toLowerCase() === "subject")?.value ?? null;
    const snippet = payload?.snippet ?? null;
    const messageId = payload?.id ?? null;
    // service-role write: interactions (allowed). Upsert to skip duplicates via unique index.
    const upsertRes = await supaAdminGuard.upsert(
      "interactions",
      {
        userId: job.userId,
        contactId: null,
        type: "email",
        subject: subject ?? undefined,
        bodyText: snippet ?? undefined,
        bodyRaw: null,
        occurredAt: r.occurredAt instanceof Date ? r.occurredAt : new Date(String(r.occurredAt)),
        source: "gmail",
        sourceId: messageId ?? undefined,
        sourceMeta: r.sourceMeta as Record<string, unknown> | null | undefined,
        batchId: (r.batchId ?? undefined) as string | undefined,
      },
      { onConflict: "user_id,source,source_id", ignoreDuplicates: true },
    );
    // If conflict ignored, many PostgREST setups return empty array; treat that as skipped
    if (Array.isArray(upsertRes) && upsertRes.length > 0) {
      itemsInserted += 1;
    } else {
      itemsSkipped += 1;
    }
  }
  const durationMs = Date.now() - startedAt;
  log.info(
    {
      op: "normalize.gmail.metrics",
      userId: job.userId,
      batchId: batchId ?? null,
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      itemsFiltered: 0,
      pages: 1,
      durationMs,
      timedOut: Date.now() > deadlineMs,
    },
    "normalize_gmail_metrics",
  );
}

export async function runNormalizeGoogleEvent(job: JobRecord): Promise<void> {
  const dbo = await getDb();
  const batchId = (job.payload as { batchId?: string })?.batchId;
  const startedAt = Date.now();
  const deadlineMs = startedAt + 3 * 60 * 1000; // hard cap: 3 minutes per job
  let itemsFetched = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;
  const rows: RawEvent[] = await dbo
    .select()
    .from(rawEvents)
    .where(
      and(
        eq(rawEvents.userId, job.userId),
        eq(rawEvents.provider, "calendar"),
        batchId ? eq(rawEvents.batchId, batchId) : eq(rawEvents.batchId, rawEvents.batchId),
      ),
    );

  for (const r of rows) {
    if (Date.now() > deadlineMs) break; // why: avoid runaway normalization
    itemsFetched += 1;
    const payload = r.payload as unknown as {
      summary?: string | null;
      description?: string | null;
      location?: string | null;
      id?: string | null;
    };
    const summary = payload?.summary ?? null;
    const desc = payload?.description ?? payload?.location ?? null;
    const eventId = payload?.id ?? null;
    // service-role write: interactions (allowed). Upsert to skip duplicates via unique index.
    const upsertRes = await supaAdminGuard.upsert(
      "interactions",
      {
        userId: job.userId,
        contactId: null,
        type: "meeting",
        subject: summary ?? undefined,
        bodyText: desc ?? undefined,
        bodyRaw: null,
        occurredAt: r.occurredAt instanceof Date ? r.occurredAt : new Date(String(r.occurredAt)),
        source: "calendar",
        sourceId: eventId ?? undefined,
        sourceMeta: r.sourceMeta as Record<string, unknown> | null | undefined,
        batchId: (r.batchId ?? undefined) as string | undefined,
      },
      { onConflict: "user_id,source,source_id", ignoreDuplicates: true },
    );
    if (Array.isArray(upsertRes) && upsertRes.length > 0) {
      itemsInserted += 1;
    } else {
      itemsSkipped += 1;
    }
  }
  const durationMs = Date.now() - startedAt;
  log.info(
    {
      op: "normalize.calendar.metrics",
      userId: job.userId,
      batchId: batchId ?? null,
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      itemsFiltered: 0,
      pages: 1,
      durationMs,
      timedOut: Date.now() > deadlineMs,
    },
    "normalize_calendar_metrics",
  );
}
