import { db } from "@/server/db/client";
import { and, desc, eq } from "drizzle-orm";
import { jobs, rawEvents, userSyncPrefs } from "@/server/db/schema";
import { getGoogleClients } from "@/server/google/client";
import { listGmailMessageIds } from "@/server/google/gmail";
import { listCalendarEvents } from "@/server/google/calendar";

export async function lastEventTimestamp(userId: string, provider: "gmail" | "calendar") {
  const rows = await db
    .select({ occurredAt: rawEvents.occurredAt })
    .from(rawEvents)
    .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, provider)))
    .orderBy(desc(rawEvents.occurredAt))
    .limit(1);
  return rows[0]?.occurredAt ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
}

type JobRow = typeof jobs.$inferSelect & { payload: any };

export async function runGmailSync(job: JobRow, userId: string) {
  const { gmail } = await getGoogleClients(userId);
  const prefsRow = await db
    .select()
    .from(userSyncPrefs)
    .where(eq(userSyncPrefs.userId, userId))
    .limit(1);
  const prefs = prefsRow[0];
  const since = await lastEventTimestamp(userId, "gmail");

  const CATEGORY_LABEL_MAP: Record<string, string> = {
    Promotions: "CATEGORY_PROMOTIONS",
    Social: "CATEGORY_SOCIAL",
    Forums: "CATEGORY_FORUMS",
    Updates: "CATEGORY_UPDATES",
    Primary: "CATEGORY_PERSONAL",
  };
  const toLabelId = (name: string) => CATEGORY_LABEL_MAP[name] ?? name;

  const q = `${prefs?.gmailQuery ?? "newer_than:30d"}`;
  const batchId = (job.payload?.batchId as string | undefined) ?? undefined;
  const includeIds = (prefs?.gmailLabelIncludes ?? []).map(toLabelId);
  const excludeIds = (prefs?.gmailLabelExcludes ?? []).map(toLabelId);

  const ids = await listGmailMessageIds(gmail as any, q);
  // fetch in small chunks to avoid 429s
  const chunk = 25;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const results = await Promise.allSettled(
      slice.map((id) => gmail.users.messages.get({ userId: "me", id, format: "full" })),
    );
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const msg = r.value.data;
      const labelIds = msg.labelIds ?? [];
      if (includeIds.length > 0 && !labelIds.some((l) => includeIds.includes(l))) continue;
      if (excludeIds.length > 0 && labelIds.some((l) => excludeIds.includes(l))) continue;

      const internalMs = Number(msg.internalDate ?? 0);
      const occurredAt = internalMs ? new Date(internalMs) : new Date();
      if (occurredAt < since) continue;

      await db.insert(rawEvents).values({
        userId,
        provider: "gmail",
        payload: msg as any,
        occurredAt,
        contactId: null,
        batchId: batchId ?? null,
        sourceMeta: { labelIds, fetchedAt: new Date().toISOString(), matchedQuery: q },
      });
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  await db.insert(jobs).values({
    userId,
    kind: "normalize_google_email",
    payload: { batchId },
    batchId: batchId ?? null,
  });
}

export async function runCalendarSync(job: JobRow, userId: string) {
  const { calendar } = await getGoogleClients(userId);
  const prefsRow = await db
    .select()
    .from(userSyncPrefs)
    .where(eq(userSyncPrefs.userId, userId))
    .limit(1);
  const prefs = prefsRow[0];

  const now = new Date();
  const days = prefs?.calendarTimeWindowDays ?? 60;
  const timeMin = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const batchId = (job.payload?.batchId as string | undefined) ?? undefined;

  const items = await listCalendarEvents(calendar as any, timeMin, timeMax);
  for (const e of items) {
    if (
      (prefs?.calendarIncludeOrganizerSelf ?? "true") === "true" &&
      e.organizer &&
      e.organizer.self === false
    ) {
      continue;
    }
    if ((prefs?.calendarIncludePrivate ?? "false") === "false" && e.visibility === "private") {
      continue;
    }
    const startStr = e.start?.dateTime ?? e.start?.date;
    if (!startStr) continue;
    const occurredAt = new Date(startStr);
    await db.insert(rawEvents).values({
      userId,
      provider: "calendar",
      payload: e as any,
      occurredAt,
      contactId: null,
      batchId: batchId ?? null,
      sourceMeta: { fetchedAt: new Date().toISOString() },
    });
  }

  await db.insert(jobs).values({
    userId,
    kind: "normalize_google_event",
    payload: { batchId },
    batchId: batchId ?? null,
  });
}
