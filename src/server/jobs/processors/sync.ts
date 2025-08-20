import { getDb } from "@/server/db/client";
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
import { log } from "@/server/log";
import { callWithRetry } from "@/server/google/utils";

/**
 * Processor constraints (documented for operators and future maintainers):
 * - API call timeout: 10 seconds per external request
 * - Retries: 3 attempts with exponential backoff + jitter (see callWithRetry)
 * - Hard wall-clock cap: 3 minutes per job to prevent runaway executions
 */

export async function lastEventTimestamp(
  userId: string,
  provider: "gmail" | "calendar",
): Promise<Date> {
  const dbo = await getDb();
  const rows = await dbo
    .select({ occurredAt: rawEvents.occurredAt })
    .from(rawEvents)
    .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, provider)))
    .orderBy(desc(rawEvents.occurredAt))
    .limit(1);
  return rows[0]?.occurredAt ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
}

// Define proper types for job payloads
interface SyncJobPayload {
  batchId?: string;
}

interface GmailMessagePayload {
  id?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
  };
}

// Type for jobs with properly typed payload
type JobRow = typeof jobs.$inferSelect & { payload: SyncJobPayload };

export async function runGmailSync(
  job: unknown,
  userId: string,
  injected?: { gmail?: GmailClient },
): Promise<void> {
  // Type guard to ensure job has the expected structure
  const typedJob = job as JobRow;
  const dbo = await getDb();
  const gmail = injected?.gmail ?? (await getGoogleClients(userId)).gmail;
  const prefsRow = await dbo
    .select()
    .from(userSyncPrefs)
    .where(eq(userSyncPrefs.userId, userId))
    .limit(1);
  const prefs = prefsRow[0];
  const since = await lastEventTimestamp(userId, "gmail");

  // label constants and transformer centralized

  const q = `${prefs?.gmailQuery ?? "newer_than:30d"}`;
  const batchId = typedJob.payload?.batchId;
  const debugContext = {
    requestId: undefined as string | undefined, // request-scoped id not available inside job processor
    userId,
    batchId: batchId ?? null,
    jobId: typedJob.id,
    provider: "gmail" as const,
  };
  const includeIds = (prefs?.gmailLabelIncludes ?? []).map(toLabelId);
  const excludeIds = (prefs?.gmailLabelExcludes ?? []).map(toLabelId);

  // Cap total processed per run to keep memory/time bounded
  const { ids, pages } = await listGmailMessageIds(gmail, q);
  const MAX_PER_RUN = 2000;
  const total = Math.min(ids.length, MAX_PER_RUN);
  log.info(
    {
      ...debugContext,
      op: "gmail.sync.start",
      candidates: ids.length,
      total,
      query: q,
      pages,
    },
    "gmail_sync_start",
  );
  // fetch in small chunks to avoid 429s
  const chunk = 25;
  const startedAt = Date.now();
  const deadlineMs = startedAt + 3 * 60 * 1000; // hard cap: 3 minutes per job to avoid runaways
  let itemsFetched = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;
  let itemsFiltered = 0;

  for (let i = 0; i < total; i += chunk) {
    if (Date.now() > deadlineMs) break; // why: protect against long-running loops when API is slow
    const slice = ids.slice(i, i + chunk);
    const results = await Promise.allSettled(
      slice.map((id: string) =>
        callWithRetry(
          () => gmail.users.messages.get({ userId: "me", id, format: "full" }, { timeout: 10_000 }),
          "gmail.messages.get",
        ),
      ),
    );
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const msg = r.value.data as GmailMessagePayload;
      const labelIds = msg.labelIds ?? [];
      if (includeIds.length > 0 && !labelIds.some((l: string) => includeIds.includes(l))) {
        itemsFiltered += 1;
        continue;
      }
      if (excludeIds.length > 0 && labelIds.some((l: string) => excludeIds.includes(l))) {
        itemsFiltered += 1;
        continue;
      }

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
        occurredAt, // Date object
        contactId: null,
        batchId: batchId ?? null,
        sourceMeta: { labelIds, fetchedAt: new Date().toISOString(), matchedQuery: q },
        sourceId: msg.id ?? null,
      });
      itemsInserted += 1;
      itemsFetched += 1;
    }
    // brief sleep between batches for backpressure
    await new Promise((r) => setTimeout(r, 200));
  }

  const durationMs = Date.now() - startedAt;
  // Minimal structured metrics for Gmail sync run
  log.info(
    {
      ...debugContext,
      op: "gmail.sync.metrics",
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      itemsFiltered,
      pages,
      durationMs,
      timedOut: Date.now() > deadlineMs,
    },
    "gmail_sync_metrics",
  );

  await dbo.insert(jobs).values({
    userId,
    kind: "normalize_google_email",
    payload: { batchId },
    batchId: batchId ?? null,
  });
}

export async function runCalendarSync(
  job: unknown,
  userId: string,
  injected?: { calendar?: CalendarClient },
): Promise<void> {
  // Type guard to ensure job has the expected structure
  const typedJob = job as JobRow;
  const dbo = await getDb();
  const calendar = injected?.calendar ?? (await getGoogleClients(userId)).calendar;
  const prefsRow = await dbo
    .select()
    .from(userSyncPrefs)
    .where(eq(userSyncPrefs.userId, userId))
    .limit(1);
  const prefs = prefsRow[0];

  const now = new Date();
  const days = prefs?.calendarTimeWindowDays ?? 60;
  const timeMin = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const batchId = typedJob.payload?.batchId;
  const debugContext = {
    requestId: undefined as string | undefined,
    userId,
    batchId: batchId ?? null,
    jobId: typedJob.id,
    provider: "calendar" as const,
  };

  // Calendar: process paginated items with caps & light filtering
  const startedAt = Date.now();
  const deadlineMs = startedAt + 3 * 60 * 1000; // hard cap: 3 minutes per job
  let itemsFetched = 0;
  let itemsInserted = 0;
  const itemsSkipped = 0;
  let itemsFiltered = 0;
  const { items, pages } = await listCalendarEvents(calendar, timeMin, timeMax);
  const MAX_PER_RUN = 2000;
  const total = Math.min(items.length, MAX_PER_RUN);
  log.info(
    {
      ...debugContext,
      op: "calendar.sync.start",
      candidates: items.length,
      total,
      windowDays: days,
      pages,
    },
    "calendar_sync_start",
  );
  for (let i = 0; i < total; i++) {
    if (Date.now() > deadlineMs) break; // why: avoid runaway jobs on large calendars
    const e = items[i];
    if (!e) continue;
    if (prefs?.calendarIncludeOrganizerSelf === true && e.organizer && e.organizer.self === false) {
      itemsFiltered += 1;
      continue;
    }
    if (prefs?.calendarIncludePrivate === false && e.visibility === "private") {
      itemsFiltered += 1;
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
      occurredAt, // Date object
      contactId: null,
      batchId: batchId ?? null,
      sourceMeta: { fetchedAt: new Date().toISOString() },
      sourceId: e.id ?? null,
    });
    itemsFetched += 1;
    itemsInserted += 1;
    // light pacing
    if (i % 100 === 0) await new Promise((r) => setTimeout(r, 100));
  }

  const durationMs = Date.now() - startedAt;
  // Minimal structured metrics for Calendar sync run
  log.info(
    {
      ...debugContext,
      op: "calendar.sync.metrics",
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      itemsFiltered,
      pages,
      durationMs,
      timedOut: Date.now() > deadlineMs,
    },
    "calendar_sync_metrics",
  );

  await dbo.insert(jobs).values({
    userId,
    kind: "normalize_google_event",
    payload: { batchId },
    batchId: batchId ?? null,
  });
}
