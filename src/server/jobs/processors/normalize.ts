import { db } from "@/server/db/client";
import { and, eq } from "drizzle-orm";
import { interactions, rawEvents } from "@/server/db/schema";

export async function runNormalizeGoogleEmail(job: any, userId: string) {
  const batchId = job.payload?.batchId as string | undefined;
  const rows = await db
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
    const payload: any = r.payload;
    const headers: Array<{ name?: string | null; value?: string | null }> =
      payload?.payload?.headers ?? [];
    const subject = headers.find((h) => (h.name || "").toLowerCase() === "subject")?.value ?? null;
    const snippet = payload?.snippet ?? null;
    const messageId = payload?.id ?? null;
    await db.insert(interactions).values({
      userId,
      contactId: null,
      type: "email",
      subject: subject ?? undefined,
      bodyText: snippet ?? undefined,
      bodyRaw: null,
      occurredAt: r.occurredAt,
      source: "gmail",
      sourceId: messageId ?? undefined,
      sourceMeta: r.sourceMeta,
      batchId: r.batchId ?? undefined,
    });
  }
}

export async function runNormalizeGoogleEvent(job: any, userId: string) {
  const batchId = job.payload?.batchId as string | undefined;
  const rows = await db
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
    const payload: any = r.payload;
    const summary = payload?.summary ?? null;
    const desc = payload?.description ?? payload?.location ?? null;
    const eventId = payload?.id ?? null;
    await db.insert(interactions).values({
      userId,
      contactId: null,
      type: "meeting",
      subject: summary ?? undefined,
      bodyText: desc ?? undefined,
      bodyRaw: null,
      occurredAt: r.occurredAt,
      source: "calendar",
      sourceId: eventId ?? undefined,
      sourceMeta: r.sourceMeta,
      batchId: r.batchId ?? undefined,
    });
  }
}
