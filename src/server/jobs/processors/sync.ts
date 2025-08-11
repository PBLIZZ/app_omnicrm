import { db } from "@/server/db/client";
import { supaAdminGuard } from "@/server/db/supabase-admin";
import { and, desc, eq } from "drizzle-orm";
import { jobs, rawEvents, userSyncPrefs } from "@/server/db/schema";
import { getGoogleClients } from "@/server/google/client";
import type { GmailClient } from "@/server/google/gmail";
import { listGmailMessageIds } from "@/server/google/gmail";
import { toLabelId } from "@/server/google/constants";
import type { CalendarClient } from "@/server/google/calendar";
import { listCalendarEvents } from "@/server/google/calendar";
// Note: logging kept minimal to avoid noise during tight loops

export async function lastEventTimestamp(userId: string, provider: "gmail" | "calendar") {
  const rows = await db
    .select({ occurredAt: rawEvents.occurredAt })
    .from(rawEvents)
    .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, provider)))
    .orderBy(desc(rawEvents.occurredAt))
    .limit(1);
  return rows[0]?.occurredAt ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
}

type JobRow = typeof jobs.$inferSelect & { payload: Record<string, unknown> };

export async function runGmailSync(
  job: JobRow,
  userId: string,
  injected?: { gmail?: GmailClient },
) {
  const gmail = injected?.gmail ?? (await getGoogleClients(userId)).gmail;
  const prefsRow = await db
    .select()
    .from(userSyncPrefs)
    .where(eq(userSyncPrefs.userId, userId))
    .limit(1);
  const prefs = prefsRow[0];
  const since = await lastEventTimestamp(userId, "gmail");

  // label constants and transformer centralized

  const q = `${prefs?.gmailQuery ?? "newer_than:30d"}`;
  const batchId = (job.payload?.["batchId"] as string | undefined) ?? undefined;
  const includeIds = (prefs?.gmailLabelIncludes ?? []).map(toLabelId);
  const excludeIds = (prefs?.gmailLabelExcludes ?? []).map(toLabelId);

  // Cap total processed per run to keep memory/time bounded
  const ids = await listGmailMessageIds(gmail, q);
  const MAX_PER_RUN = 2000;
  const total = Math.min(ids.length, MAX_PER_RUN);
  // fetch in small chunks to avoid 429s
  const chunk = 25;
  const startedAt = Date.now();
  const deadlineMs = startedAt + 3 * 60 * 1000; // hard cap: 3 minutes per job to avoid runaways
  let itemsFetched = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;

  for (let i = 0; i < total; i += chunk) {
    if (Date.now() > deadlineMs) break; // why: protect against long-running loops when API is slow
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
      if (occurredAt < since) {
        itemsSkipped += 1;
        continue;
      }

      // service-role write: raw_events (allowed)
      await supaAdminGuard.insert("raw_events", {
        userId,
        provider: "gmail",
        payload: msg,
        occurredAt,
        contactId: null,
        batchId: batchId ?? null,
        sourceMeta: { labelIds, fetchedAt: new Date().toISOString(), matchedQuery: q },
      });
      itemsInserted += 1;
      itemsFetched += 1;
    }
    // brief sleep between batches for backpressure
    await new Promise((r) => setTimeout(r, 200));
  }

  const durationMs = Date.now() - startedAt;
  // Minimal structured metrics for Gmail sync run
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: "gmail_sync_metrics",
      userId,
      batchId: batchId ?? null,
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      durationMs,
    }),
  );

  await db.insert(jobs).values({
    userId,
    kind: "normalize_google_email",
    payload: { batchId },
    batchId: batchId ?? null,
  });
}

export async function runCalendarSync(
  job: JobRow,
  userId: string,
  injected?: { calendar?: CalendarClient },
) {
  const calendar = injected?.calendar ?? (await getGoogleClients(userId)).calendar;
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
  const batchId = (job.payload?.["batchId"] as string | undefined) ?? undefined;

  // Calendar: process paginated items with caps & light filtering
  const startedAt = Date.now();
  const deadlineMs = startedAt + 3 * 60 * 1000; // hard cap: 3 minutes per job
  let itemsFetched = 0;
  let itemsInserted = 0;
  const itemsSkipped = 0;
  const items = await listCalendarEvents(calendar, timeMin, timeMax);
  const MAX_PER_RUN = 2000;
  const total = Math.min(items.length, MAX_PER_RUN);
  for (let i = 0; i < total; i++) {
    if (Date.now() > deadlineMs) break; // why: avoid runaway jobs on large calendars
    const e = items[i]!;
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
    // service-role write: raw_events (allowed)
    await supaAdminGuard.insert("raw_events", {
      userId,
      provider: "calendar",
      payload: e,
      occurredAt,
      contactId: null,
      batchId: batchId ?? null,
      sourceMeta: { fetchedAt: new Date().toISOString() },
    });
    itemsFetched += 1;
    itemsInserted += 1;
    // light pacing
    if (i % 100 === 0) await new Promise((r) => setTimeout(r, 100));
  }

  const durationMs = Date.now() - startedAt;
  // Minimal structured metrics for Calendar sync run
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: "calendar_sync_metrics",
      userId,
      batchId: batchId ?? null,
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      durationMs,
    }),
  );

  await db.insert(jobs).values({
    userId,
    kind: "normalize_google_event",
    payload: { batchId },
    batchId: batchId ?? null,
  });
}
