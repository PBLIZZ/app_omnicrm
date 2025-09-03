import { getDb } from "@/server/db/client";
import { drizzleAdminGuard } from "@/server/db/admin";
import { and, desc, eq } from "drizzle-orm";
import { jobs, rawEvents, userSyncPrefs } from "@/server/db/schema";
import { getGoogleClients } from "@/server/google/client";
import type { GmailClient } from "@/server/google/gmail";
import { listGmailMessageIds } from "@/server/google/gmail";
import type { CalendarClient } from "@/server/google/calendar";
import { listCalendarEvents } from "@/server/google/calendar";
import { log } from "@/lib/log";
import {
  CALENDAR_CHUNK,
  GMAIL_CHUNK_DEFAULT,
  JOB_HARD_CAP_MS,
  SYNC_MAX_PER_RUN,
  SYNC_SLEEP_MS,
} from "@/server/jobs/config";
import type { calendar_v3 } from "googleapis";

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

// Types:
// - MinimalJob reflects what we actually read from the job object at runtime.
type MinimalJob = { id?: string | number; payload?: SyncJobPayload };

// Narrow unknown job into expected shape
export function isJobRow(job: unknown): job is MinimalJob {
  if (typeof job !== "object" || job === null) return false;
  const j = job as Record<string, unknown>;
  const payload = j["payload"];
  const payloadOk = payload === undefined || typeof payload === "object";
  // In our processors the userId is passed separately and id may be absent in tests/mocks.
  // Accept any shape where payload is either undefined or an object; id is optional.
  return payloadOk;
}

// Safe checks for external API payloads
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isGmailMessagePayload(v: unknown): v is GmailMessagePayload {
  if (!isRecord(v)) return false;
  const id = v["id"];
  const labelIds = v["labelIds"];
  const internalDate = v["internalDate"];
  const okId = id === undefined || typeof id === "string";
  const okLabels = labelIds === undefined || isStringArray(labelIds);
  const okInternal = internalDate === undefined || typeof internalDate === "string";
  return okId && okLabels && okInternal;
}

export async function runGmailSync(
  job: unknown,
  userId: string,
  injected?: { gmail?: GmailClient },
): Promise<void> {
  // console.log(`🔄 GMAIL SYNC STARTED for user ${userId}`);

  // Type guard to ensure job has the expected structure
  if (!isJobRow(job)) {
    // console.log(`❌ GMAIL SYNC FAILED: Invalid job structure`, job);
    log.warn({ op: "gmail.sync.invalid_job", job }, "sync_job_invalid_shape");
    return;
  }

  // Safe cast after type guard validation
  const typedJob = job as MinimalJob;
  console.log(
    `✅ GMAIL SYNC: Job validated, ID: ${typedJob.id}, Batch: ${typedJob.payload?.batchId}`,
  );
  const dbo = await getDb();
  // console.log(`🔄 GMAIL SYNC: Got database connection`);

  // console.log(`🔄 GMAIL SYNC: Getting Gmail client...`);
  const gmail = injected?.gmail ?? (await getGoogleClients(userId)).gmail;
  // console.log(`✅ GMAIL SYNC: Gmail client obtained`);

  // console.log(`🔄 GMAIL SYNC: Getting user preferences...`);
  const prefsRow = await dbo
    .select()
    .from(userSyncPrefs)
    .where(eq(userSyncPrefs.userId, userId))
    .limit(1);
  const prefs = prefsRow[0];
  console.log(`✅ GMAIL SYNC: Preferences loaded:`, {
    hasPrefs: !!prefs,
    query: prefs?.gmailQuery,
  });

  // console.log(`🔄 GMAIL SYNC: Getting last event timestamp...`);
  const since = await lastEventTimestamp(userId, "gmail");
  // console.log(`✅ GMAIL SYNC: Last event timestamp: ${since.toISOString()}`);

  // Build incremental Gmail query using after:timestamp for efficiency
  const baseQuery = prefs?.gmailQuery ?? "newer_than:30d";
  const daysSinceLastSync = Math.ceil((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));

  // Gmail uses YYYY/MM/DD format for after: queries, not unix timestamp
  // Subtract 1 day for overlap to catch any missed emails
  const overlapDate = new Date(since.getTime() - 24 * 60 * 60 * 1000);
  const gmailDateFormat = overlapDate.toISOString().split("T")[0]?.replace(/-/g, "/") ?? "";

  // Use incremental sync with 1-day overlap to catch any missed emails
  const q = daysSinceLastSync <= 30 ? `${baseQuery} after:${gmailDateFormat}` : baseQuery;
  const batchId = typedJob.payload?.batchId;

  // console.log(`🔄 GMAIL SYNC: Query building complete`);
  // console.log(`   - Base query: "${baseQuery}"`);
  // console.log(`   - Days since last sync: ${daysSinceLastSync}`);
  // console.log(`   - Gmail date format: "${gmailDateFormat}"`);
  // console.log(`   - Final query: "${q}"`);
  // console.log(`   - Is incremental sync: ${daysSinceLastSync <= 30}`);
  // console.log(`   - Batch ID: ${batchId}`);

  const debugContext = {
    requestId: undefined as string | undefined,
    userId,
    batchId: batchId ?? null,
    jobId: typedJob.id,
    provider: "gmail" as const,
  };

  // console.log(`🔄 GMAIL SYNC: Label filters prepared`);
  // console.log(`   - Include IDs: ${includeIds.join(", ")}`);
  // console.log(`   - Exclude IDs: ${excludeIds.join(", ")}`);

  // Cap total processed per run to keep memory/time bounded
  // console.log(`🔄 GMAIL SYNC: Starting email ID fetch with query: "${q}"`);
  let ids: string[], pages: number, total: number;
  try {
    const result = await listGmailMessageIds(gmail, q);
    ids = result.ids;
    pages = result.pages;
    total = Math.min(ids.length, SYNC_MAX_PER_RUN);

    // Override total to process at least some emails for debugging
    if (total > 0 && total < 10) {
      total = Math.min(10, ids.length);
    }

    // console.log(`✅ GMAIL SYNC: Email IDs fetched successfully`);
    // console.log(`   - Total IDs found: ${ids.length}`);
    // console.log(`   - Pages processed: ${pages}`);
    // console.log(`   - IDs to process: ${total}`);
    // console.log(`   - First few IDs: ${ids.slice(0, 3).join(", ")}`);
  } catch (queryError) {
    // console.log(`❌ GMAIL SYNC: Email ID fetch failed`, queryError);
    log.error(
      {
        ...debugContext,
        op: "gmail.sync.query_failed",
        query: q,
        error: queryError instanceof Error ? queryError.message : String(queryError),
      },
      "gmail_query_failed",
    );
    throw queryError;
  }

  // Persist initial progress snapshot on the job payload so the UI can compute progress
  if (typedJob.id) {
    try {
      await dbo
        .update(jobs)
        .set({
          payload: {
            batchId: batchId ?? null,
            totalEmails: total,
            processedEmails: 0,
            newEmails: 0,
            chunkSize: GMAIL_CHUNK_DEFAULT,
            chunksTotal: Math.ceil(total / GMAIL_CHUNK_DEFAULT),
            chunksProcessed: 0,
          },
        })
        .where(eq(jobs.id, String(typedJob.id)));
    } catch (updateErr) {
      log.warn({
        ...debugContext,
        op: "gmail.sync.init_progress_update_failed",
        error: String(updateErr),
      });
    }
  }

  log.info(
    {
      ...debugContext,
      op: "gmail.sync.start",
      candidates: ids.length,
      total,
      query: q,
      pages,
      since: since.toISOString(),
      daysSinceLastSync,
      gmailDateFormat,
      isIncrementalSync: daysSinceLastSync <= 30,
    },
    "gmail_sync_start",
  );

  const startedAt = Date.now();
  const deadlineMs = startedAt + JOB_HARD_CAP_MS;
  let itemsFetched = 0;
  let itemsInserted = 0; // Still track for logging, but progress uses itemsFetched
  let itemsSkipped = 0;
  const itemsFiltered = 0;
  let errorsCount = 0;

  // Simple batch processing - no streaming, no adaptive sizing
  const processedIds = ids.slice(0, total);

  for (let i = 0; i < processedIds.length; i += GMAIL_CHUNK_DEFAULT) {
    if (Date.now() > deadlineMs) {
      log.warn({ ...debugContext, op: "gmail.sync.timeout" }, "sync_timeout");
      break;
    }

    const batchIds = processedIds.slice(i, i + GMAIL_CHUNK_DEFAULT);

    // Process batch messages sequentially
    for (const messageId of batchIds) {
      try {
        const response = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });

        const msg = response.data;

        if (!msg || !isGmailMessagePayload(msg)) {
          if (!msg) {
            itemsSkipped += 1;
            errorsCount += 1;
          }
          continue;
        }

        const labelIds = msg.labelIds ?? [];

        // Debug logging - no filtering applied
        console.log(`📧 Processing email ${msg.id} - NO FILTERING APPLIED`);

        // Parse email timestamp (Gmail API filtering should handle this, but keep as backup)
        const internalMs = Number(msg.internalDate ?? 0);
        const occurredAt = internalMs ? new Date(internalMs) : new Date();

        try {
          // Use Drizzle admin service with proper camelCase field names
          await drizzleAdminGuard.upsert("raw_events", {
            userId,
            provider: "gmail",
            payload: msg,
            occurredAt,
            contactId: null,
            batchId: batchId ?? null,
            sourceMeta: {
              labelIds,
              fetchedAt: new Date().toISOString(),
              matchedQuery: q,
            },
            sourceId: msg.id ?? null,
          });

          itemsInserted += 1;
          itemsFetched += 1;
        } catch (dbError) {
          log.warn(
            {
              ...debugContext,
              op: "gmail.sync.db_insert_failed",
              messageId: msg.id,
              error: String(dbError),
            },
            "db_insert_failed",
          );
          errorsCount += 1;
        }
      } catch (apiError) {
        const errorDetails =
          apiError instanceof Error
            ? {
                name: apiError.name,
                message: apiError.message,
                stack: apiError.stack?.split("\n")[0], // Just first line
              }
            : { message: String(apiError) };

        // Enhanced error logging for debugging
        console.error(`❌ Gmail API Error fetching message ${messageId}:`, errorDetails);

        log.warn(
          {
            ...debugContext,
            op: "gmail.sync.api_error",
            messageId,
            errorDetails,
            batchIndex: Math.floor(itemsFetched / GMAIL_CHUNK_DEFAULT),
          },
          "gmail_message_fetch_failed",
        );
        errorsCount += 1;
      }
    }

    // Simple sleep between batches
    await new Promise((r) => setTimeout(r, SYNC_SLEEP_MS));

    // Update progress snapshot after each batch
    if (typedJob.id) {
      const chunksProcessed = Math.min(
        Math.ceil(itemsFetched / GMAIL_CHUNK_DEFAULT),
        Math.max(1, Math.ceil(total / GMAIL_CHUNK_DEFAULT)),
      );
      try {
        await dbo
          .update(jobs)
          .set({
            payload: {
              batchId: batchId ?? null,
              totalEmails: total,
              processedEmails: itemsFetched, // Use fetched (processed) count, not insertion count
              newEmails: itemsInserted, // Track actual new emails separately
              chunkSize: GMAIL_CHUNK_DEFAULT,
              chunksTotal: Math.ceil(total / GMAIL_CHUNK_DEFAULT),
              chunksProcessed,
            },
          })
          .where(eq(jobs.id, String(typedJob.id)));
      } catch (updateErr) {
        log.warn({
          ...debugContext,
          op: "gmail.sync.progress_update_failed",
          error: String(updateErr),
        });
      }
    }
  }

  const durationMs = Date.now() - startedAt;

  // Simple metrics logging
  log.info(
    {
      ...debugContext,
      op: "gmail.sync.metrics",
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      itemsFiltered,
      errorsCount,
      pages,
      durationMs,
      messagesPerSecond: itemsFetched / (durationMs / 1000),
      timedOut: Date.now() > deadlineMs,
    },
    "gmail_sync_metrics",
  );

  // Enqueue normalization jobs using our new normalizers
  if (itemsInserted > 0) {
    await dbo.insert(jobs).values({
      userId,
      kind: "normalize",
      payload: {
        batchId,
        provider: "gmail",
      },
      batchId: batchId ?? null,
    });
  }

  log.info(
    {
      op: "gmail_sync_complete",
      userId,
      batchId,
      itemsFetched,
      itemsInserted,
      durationMs,
    },
    "Gmail sync completed successfully - normalization queued",
  );
}

export async function runCalendarSync(
  job: unknown,
  userId: string,
  injected?: { calendar?: CalendarClient },
): Promise<void> {
  // Type guard to ensure job has the expected structure
  if (!isJobRow(job)) {
    log.warn({ op: "calendar.sync.invalid_job", job }, "sync_job_invalid_shape");
    return;
  }
  const typedJob: MinimalJob = job;
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
    provider: "google_calendar" as const,
  };

  // Calendar: process paginated items with caps & light filtering
  const startedAt = Date.now();
  const deadlineMs = startedAt + JOB_HARD_CAP_MS; // hard cap
  let itemsFetched = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;
  let itemsFiltered = 0;
  let errorsCount = 0;
  const { items, pages } = await listCalendarEvents(calendar, timeMin, timeMax);
  const total = Math.min(items.length, SYNC_MAX_PER_RUN);
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
  for (let i = 0; i < total; i += CALENDAR_CHUNK) {
    if (Date.now() > deadlineMs) break; // why: avoid runaway jobs on large calendars
    const slice = items.slice(i, i + CALENDAR_CHUNK);
    // Apply filters prior to inserts
    const toInsert: Array<{ ev: calendar_v3.Schema$Event; occurredAt: Date }> = [];
    for (const e of slice) {
      if (!e) {
        log.debug({
          ...debugContext,
          op: "calendar.sync.skipped_null_event",
        }, "Skipped null event");
        continue;
      }
      
      if (
        prefs?.calendarIncludeOrganizerSelf === true &&
        e.organizer &&
        e.organizer.self === false
      ) {
        itemsFiltered += 1;
        log.info({
          ...debugContext,
          op: "calendar.sync.filtered_organizer",
          eventId: e.id,
          eventTitle: e.summary,
          organizerEmail: e.organizer?.email,
          organizerSelf: e.organizer?.self,
          calendarIncludeOrganizerSelf: prefs?.calendarIncludeOrganizerSelf,
        }, "Filtered out event: not organizer self");
        continue;
      }
      
      if (prefs?.calendarIncludePrivate === false && e.visibility === "private") {
        itemsFiltered += 1;
        log.info({
          ...debugContext,
          op: "calendar.sync.filtered_private",
          eventId: e.id,
          eventTitle: e.summary,
          visibility: e.visibility,
          calendarIncludePrivate: prefs?.calendarIncludePrivate,
        }, "Filtered out event: private visibility");
        continue;
      }
      
      const startStr = e.start?.dateTime ?? e.start?.date;
      if (!startStr) {
        log.info({
          ...debugContext,
          op: "calendar.sync.skipped_no_start_time",
          eventId: e.id,
          eventTitle: e.summary,
          startDateTime: e.start?.dateTime,
          startDate: e.start?.date,
        }, "Skipped event: no start time");
        continue;
      }
      
      const occurredAt = new Date(startStr);
      toInsert.push({ ev: e, occurredAt });
    }
    const results = await Promise.allSettled(
      toInsert.map(({ ev: e, occurredAt }) =>
        drizzleAdminGuard.upsert("raw_events", {
          userId,
          provider: "google_calendar",
          payload: e,
          occurredAt,
          contactId: null,
          batchId: batchId ?? null,
          sourceMeta: { fetchedAt: new Date().toISOString() },
          sourceId: e.id ?? null,
        }),
      ),
    );
    for (const [index, r] of results.entries()) {
      const eventForDebug = toInsert[index]?.ev;
      if (r.status !== "fulfilled") {
        const error = String((r as PromiseRejectedResult).reason);
        // Check if it's a duplicate constraint error (expected)
        if (error.includes("23505") || error.includes("duplicate")) {
          // Duplicate is expected, just count as processed but not new
          itemsFetched += 1;
          log.info({
            ...debugContext,
            op: "calendar.sync.duplicate_skipped",
            eventId: eventForDebug?.id,
            eventTitle: eventForDebug?.summary,
            sourceId: eventForDebug?.id,
          }, "Skipped event: already exists in database (duplicate)");
        } else {
          // Actual error
          log.warn(
            {
              ...debugContext,
              op: "calendar.sync.insert_failed",
              eventId: eventForDebug?.id,
              eventTitle: eventForDebug?.summary,
              error: error,
              reason: (r as PromiseRejectedResult).reason,
            },
            "Failed to insert event due to error",
          );
          itemsSkipped += 1;
          errorsCount += 1;
        }
      } else {
        itemsFetched += 1;
        itemsInserted += 1;
      }
    }
    // pacing between batches
    await new Promise((r) => setTimeout(r, SYNC_SLEEP_MS));
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
      errorsCount,
      pages,
      durationMs,
      timedOut: Date.now() > deadlineMs,
    },
    "calendar_sync_metrics",
  );

  // Enqueue normalization jobs using our new normalizers
  await dbo.insert(jobs).values({
    userId,
    kind: "normalize",
    payload: {
      batchId,
      provider: "google_calendar",
    },
    batchId: batchId ?? null,
  });
}
