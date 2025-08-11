import { getDb } from "@/server/db/client";
import { supaAdminGuard } from "@/server/db/supabase-admin";
import { and, eq } from "drizzle-orm";
import { interactions, rawEvents } from "@/server/db/schema";
// No verbose logging here to keep normalization fast and predictable

export async function runNormalizeGoogleEmail(
  job: { payload?: { batchId?: string } },
  userId: string,
) {
  const dbo = await getDb();
  const batchId = job.payload?.batchId as string | undefined;
  const startedAt = Date.now();
  const deadlineMs = startedAt + 3 * 60 * 1000; // hard cap: 3 minutes per job to avoid runaways
  let itemsFetched = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;
  const rows = await dbo
    .select()
    .from(rawEvents)
    .where(
      and(
        eq(rawEvents.userId, userId),
        eq(rawEvents.provider, "gmail"),
        batchId ? eq(rawEvents.batchId, batchId) : eq(rawEvents.batchId, rawEvents.batchId),
      ),
    );

  for (const r of rows) {
    if (Date.now() > deadlineMs) break; // why: protect against unexpectedly large batches
    itemsFetched += 1;
    const payload = r.payload as {
      payload?: { headers?: Array<{ name?: string | null; value?: string | null }> };
      snippet?: string | null;
      id?: string | null;
    };
    const headers: Array<{ name?: string | null; value?: string | null }> =
      payload?.payload?.headers ?? [];
    const subject = headers.find((h) => (h.name || "").toLowerCase() === "subject")?.value ?? null;
    const snippet = payload?.snippet ?? null;
    const messageId = payload?.id ?? null;
    // Idempotency: if interaction with same (user_id, source, source_id) exists for this batch, skip
    if (messageId) {
      const existing = await dbo
        .select({ id: interactions.id })
        .from(interactions)
        .where(
          and(
            eq(interactions.userId, userId),
            eq(interactions.source, "gmail"),
            eq(interactions.sourceId, messageId),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        itemsSkipped += 1;
        continue;
      }
    }

    // service-role write: interactions (allowed). Upsert to skip duplicates via unique index.
    await supaAdminGuard.insert("interactions", {
      user_id: userId,
      contact_id: null,
      type: "email",
      subject: subject ?? undefined,
      body_text: snippet ?? undefined,
      body_raw: null,
      occurred_at: r.occurredAt as unknown as string,
      source: "gmail",
      source_id: messageId ?? undefined,
      source_meta: r.sourceMeta,
      batch_id: r.batchId ?? undefined,
    });
    itemsInserted += 1;
  }
  const durationMs = Date.now() - startedAt;
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: "normalize_gmail_metrics",
      userId,
      batchId: batchId ?? null,
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      durationMs,
      timedOut: Date.now() > deadlineMs,
    }),
  );
}

export async function runNormalizeGoogleEvent(
  job: { payload?: { batchId?: string } },
  userId: string,
) {
  const dbo = await getDb();
  const batchId = job.payload?.batchId as string | undefined;
  const startedAt = Date.now();
  const deadlineMs = startedAt + 3 * 60 * 1000; // hard cap: 3 minutes per job
  let itemsFetched = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;
  const rows = await dbo
    .select()
    .from(rawEvents)
    .where(
      and(
        eq(rawEvents.userId, userId),
        eq(rawEvents.provider, "calendar"),
        batchId ? eq(rawEvents.batchId, batchId) : eq(rawEvents.batchId, rawEvents.batchId),
      ),
    );

  for (const r of rows) {
    if (Date.now() > deadlineMs) break; // why: avoid runaway normalization
    itemsFetched += 1;
    const payload = r.payload as {
      summary?: string | null;
      description?: string | null;
      location?: string | null;
      id?: string | null;
    };
    const summary = payload?.summary ?? null;
    const desc = payload?.description ?? payload?.location ?? null;
    const eventId = payload?.id ?? null;
    if (eventId) {
      const existing = await dbo
        .select({ id: interactions.id })
        .from(interactions)
        .where(
          and(
            eq(interactions.userId, userId),
            eq(interactions.source, "calendar"),
            eq(interactions.sourceId, eventId),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        itemsSkipped += 1;
        continue;
      }
    }

    // service-role write: interactions (allowed). Upsert to skip duplicates via unique index.
    await supaAdminGuard.insert("interactions", {
      user_id: userId,
      contact_id: null,
      type: "meeting",
      subject: summary ?? undefined,
      body_text: desc ?? undefined,
      body_raw: null,
      occurred_at: r.occurredAt as unknown as string,
      source: "calendar",
      source_id: eventId ?? undefined,
      source_meta: r.sourceMeta,
      batch_id: r.batchId ?? undefined,
    });
    itemsInserted += 1;
  }
  const durationMs = Date.now() - startedAt;
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: "normalize_calendar_metrics",
      userId,
      batchId: batchId ?? null,
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      durationMs,
      timedOut: Date.now() > deadlineMs,
    }),
  );
}
