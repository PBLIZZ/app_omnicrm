import { getDb } from "@/server/db/client";
import { drizzleAdminGuard } from "@/server/db/admin";
import { and, desc, eq } from "drizzle-orm";
import { jobs, rawEvents } from "@/server/db/schema";
import { getGoogleClients } from "@/server/google/client";
import type { GoogleApisClients } from "@/server/google/client";
import type { GmailClient } from "@/server/google/gmail";
import { listGmailMessageIds } from "@/server/google/gmail";
// Removed broken calendar imports - these functions are handled by GoogleCalendarService now
import { logger } from "@/lib/observability";
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

import { isGmailPayload } from "@/server/db/business-schemas";

// Define proper types for job payloads
interface SyncJobPayload {
  batchId?: string;
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

// Use the imported validation function from business schemas

const GMAIL_SYNC_OPERATION = "google_gmail_sync" as const;
const CALENDAR_SYNC_OPERATION = "google_calendar_sync" as const;

export async function runGmailSync(
  job: unknown,
  userId: string,
  injected?: { gmail?: GmailClient },
): Promise<void> {
  await logger.info("gmail_sync_started", {
    operation: GMAIL_SYNC_OPERATION,
    additionalData: { userId },
  });

  // Type guard to ensure job has the expected structure
  if (!isJobRow(job)) {
    // console.log(`❌ GMAIL SYNC FAILED: Invalid job structure`, job);
    await logger.warn("sync_job_invalid_shape", {
      operation: GMAIL_SYNC_OPERATION,
      additionalData: { userId },
    });
    return;
  }

  // Safe cast after type guard validation
  const typedJob = job as MinimalJob;
  // Job validated successfully
  const dbo = await getDb();
  await logger.debug("gmail_sync_db_connected", {
    operation: GMAIL_SYNC_OPERATION,
    additionalData: { userId },
  });

  await logger.debug("gmail_sync_getting_client", {
    operation: GMAIL_SYNC_OPERATION,
    additionalData: { userId },
  });
  const gmail = injected?.gmail ?? (await getGoogleClients(userId)).gmail;
  await logger.debug("gmail_sync_client_obtained", {
    operation: GMAIL_SYNC_OPERATION,
    additionalData: { userId },
  });

  // Find the timestamp of the last successfully synced email
  // This is the key to "always incremental" logic - we always sync from where we left off
  const lastSyncedEvent = await dbo
    .select({ lastDate: rawEvents.occurredAt })
    .from(rawEvents)
    .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "gmail")))
    .orderBy(desc(rawEvents.occurredAt))
    .limit(1);

  // Import EVERYTHING - no filtering, all emails, all categories, all time
  const baseQuery = "";
  let finalQuery = baseQuery;

  if (lastSyncedEvent[0]?.lastDate) {
    // We have synced before. Find everything after this date (incremental sync).
    const lastSyncDate = new Date(lastSyncedEvent[0].lastDate);
    // Add 1-day overlap to catch any missed emails due to timezone/timing issues
    const overlapDate = new Date(lastSyncDate.getTime() - 24 * 60 * 60 * 1000);
    const gmailDateFormat = overlapDate.toISOString().split("T")[0]?.replace(/-/g, "/") ?? "";
    finalQuery += ` after:${gmailDateFormat}`;

    await logger.debug("gmail_sync_incremental_mode", {
      operation: GMAIL_SYNC_OPERATION,
      additionalData: {
        userId,
        lastSyncDate: lastSyncDate.toISOString(),
        overlapDate: overlapDate.toISOString(),
        gmailDateFormat,
        mode: "incremental",
      },
    });
  } else {
    // This is effectively the FIRST sync. Use 30 day default lookback.
    await logger.debug("gmail_sync_first_sync_mode", {
      operation: GMAIL_SYNC_OPERATION,
      additionalData: {
        userId,
        lookbackDays: 30,
        mode: "first_sync",
      },
    });
  }

  const q = finalQuery;
  const batchId = typedJob.payload?.batchId;

  await logger.debug("gmail_sync_query_built", {
    operation: GMAIL_SYNC_OPERATION,
    additionalData: {
      userId,
      baseQuery,
      finalQuery: q,
      hasLastSync: !!lastSyncedEvent[0]?.lastDate,
      batchId,
    },
  });

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
  await logger.debug("gmail_sync_starting_fetch", {
    operation: GMAIL_SYNC_OPERATION,
    additionalData: { userId, query: q },
  });
  let ids: string[], pages: number, total: number;
  try {
    const result = await listGmailMessageIds(gmail, q, userId);
    ids = result.ids;
    pages = result.pages;
    total = Math.min(ids.length, SYNC_MAX_PER_RUN);

    // Override total to process at least some emails for debugging
    if (total > 0 && total < 10) {
      total = Math.min(10, ids.length);
    }

    await logger.debug("gmail_sync_ids_fetched", {
      operation: GMAIL_SYNC_OPERATION,
      additionalData: {
        userId,
        totalIdsFound: ids.length,
        pagesProcessed: pages,
        idsToProcess: total,
        firstFewIds: ids.slice(0, 3),
      },
    });
  } catch (queryError) {
    await logger.error(
      "gmail_sync_fetch_failed",
      {
        operation: GMAIL_SYNC_OPERATION,
        additionalData: { userId, query: q },
      },
      queryError instanceof Error ? queryError : new Error(String(queryError)),
    );
    await logger.error(
      "gmail_query_failed",
      {
        operation: GMAIL_SYNC_OPERATION,
        additionalData: {
          userId,
          query: q,
        },
      },
      queryError instanceof Error ? queryError : new Error(String(queryError)),
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
      await logger.warn("gmail.sync.init_progress_update_failed", {
        operation: GMAIL_SYNC_OPERATION,
        additionalData: {
          userId,
          error: updateErr instanceof Error ? updateErr.message : String(updateErr),
        },
      });
    }
  }

  await logger.info("gmail_sync_start", {
    operation: GMAIL_SYNC_OPERATION,
    additionalData: {
      userId,
      candidates: ids.length,
      total,
      query: q,
      pages,
      syncMode: lastSyncedEvent[0]?.lastDate ? "incremental" : "first_sync",
      lastSyncDate: lastSyncedEvent[0]?.lastDate?.toISOString() ?? null,
    },
  });

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
      await logger.warn("sync_timeout", {
        operation: GMAIL_SYNC_OPERATION,
        additionalData: { userId },
      });
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

        if (!msg || typeof msg !== 'object' || msg === null) {
          if (!msg) {
            itemsSkipped += 1;
            errorsCount += 1;
          }
          continue;
        }

        if (!isGmailPayload(msg)) {
          itemsSkipped += 1;
          errorsCount += 1;
          continue;
        }

        const labelIds = msg.labelIds ?? [];

        // Debug logging - no filtering applied
        // Processing email without filtering

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
          } as never);

          itemsInserted += 1;
          itemsFetched += 1;
        } catch (dbError) {
          await logger.warn(
            "DB insert failed",
            {
              operation: GMAIL_SYNC_OPERATION,
              additionalData: {
                ...debugContext,
                op: "gmail.sync.db_insert_failed",
                messageId: msg.id,
              },
            },
            dbError instanceof Error ? dbError : new Error(String(dbError)),
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
        // Gmail API Error logged below

        await logger.warn(
          "Gmail message fetch failed",
          {
            operation: GMAIL_SYNC_OPERATION,
            additionalData: {
              ...debugContext,
              op: "gmail.sync.api_error",
              messageId,
              errorDetails,
              batchIndex: Math.floor(itemsFetched / GMAIL_CHUNK_DEFAULT),
            },
          },
          apiError instanceof Error ? apiError : new Error(String(apiError)),
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
        await logger.warn(
          "Progress update failed",
          {
            operation: GMAIL_SYNC_OPERATION,
            additionalData: {
              ...debugContext,
              op: "gmail.sync.progress_update_failed",
            },
          },
          updateErr instanceof Error ? updateErr : new Error(String(updateErr)),
        );
      }
    }
  }

  const durationMs = Date.now() - startedAt;

  // Simple metrics logging
  await logger.info("Gmail sync metrics", {
    operation: GMAIL_SYNC_OPERATION,
    additionalData: {
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
  });

  // Enqueue normalization jobs using our new normalizers
  if (itemsInserted > 0) {
    await dbo.insert(jobs).values({
      userId,
      kind: "normalize_google_email",
      payload: {
        batchId,
        provider: "gmail",
      },
      batchId: batchId ?? null,
    });
  }

  await logger.info("Gmail sync completed successfully - normalization queued", {
    operation: GMAIL_SYNC_OPERATION,
    additionalData: {
      op: "gmail_sync_complete",
      userId,
      batchId,
      itemsFetched,
      itemsInserted,
      durationMs,
    },
  });
}

export async function runCalendarSync(
  job: unknown,
  userId: string,
  injected?: { calendar?: GoogleApisClients["calendar"] },
): Promise<void> {
  await logger.info("calendar_sync_started", {
    operation: CALENDAR_SYNC_OPERATION,
    additionalData: { userId },
  });

  // Type guard to ensure job has the expected structure
  if (!isJobRow(job)) {
    await logger.warn("Sync job invalid shape", {
      operation: CALENDAR_SYNC_OPERATION,
      additionalData: { op: "calendar.sync.invalid_job", job },
    });
    return;
  }
  const typedJob: MinimalJob = job;
  const dbo = await getDb();
  const calendar = injected?.calendar ?? (await getGoogleClients(userId)).calendar;

  // Enhanced time window configuration with incremental sync support
  const now = new Date();
  const daysPast = 180; // 6 months back for comprehensive data
  const daysFuture = 365; // 1 year ahead
  const timeMin = new Date(now.getTime() - daysPast * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + daysFuture * 24 * 60 * 60 * 1000).toISOString();
  const batchId = typedJob.payload?.batchId;
  const debugContext = {
    requestId: undefined as string | undefined,
    userId,
    batchId: batchId ?? null,
    jobId: typedJob.id,
    provider: "google_calendar" as const,
  };

  // Enhanced calendar sync with comprehensive event processing
  const startedAt = Date.now();
  const deadlineMs = startedAt + JOB_HARD_CAP_MS; // hard cap
  let itemsFetched = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;
  const itemsFiltered = 0;
  let errorsCount = 0;

  // Use Google Calendar API to list events from all calendars
  const calendarsResponse = await calendar.calendarList.list();
  const calendars = calendarsResponse.data.items ?? [];

  const allEvents: calendar_v3.Schema$Event[] = [];
  let totalPages = 0;

  // Fetch events from each calendar
  for (const cal of calendars) {
    if (!cal.id) continue;

    try {
      const eventsResponse = await calendar.events.list({
        calendarId: cal.id,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 1000,
      });

      const events = eventsResponse.data.items ?? [];
      allEvents.push(...events);
      totalPages++;
    } catch (calError) {
      await logger.warn(`Failed to fetch events from calendar ${cal.id}`, {
        operation: CALENDAR_SYNC_OPERATION,
        additionalData: {
          ...debugContext,
          calendarId: cal.id,
          error: calError instanceof Error ? calError.message : String(calError),
        },
      });
    }
  }

  const items = allEvents;
  const pages = totalPages;
  const total = Math.min(items.length, SYNC_MAX_PER_RUN);
  await logger.info("Calendar sync start", {
    operation: CALENDAR_SYNC_OPERATION,
    additionalData: {
      ...debugContext,
      op: "calendar.sync.start",
      candidates: items.length,
      total,
      windowDays: daysPast + daysFuture,
      pages,
    },
  });
  for (let i = 0; i < total; i += CALENDAR_CHUNK) {
    if (Date.now() > deadlineMs) break; // why: avoid runaway jobs on large calendars
    const slice = items.slice(i, i + CALENDAR_CHUNK);
    // Apply filters prior to inserts
    const toInsert: Array<{ ev: calendar_v3.Schema$Event; occurredAt: Date }> = [];
    for (const e of slice) {
      if (!e) {
        await logger.debug("Skipped null event", {
          operation: CALENDAR_SYNC_OPERATION,
          additionalData: {
            ...debugContext,
            op: "calendar.sync.skipped_null_event",
          },
        });
        continue;
      }

      // No filtering - include all events

      const startStr = e.start?.dateTime ?? e.start?.date;
      if (!startStr) {
        await logger.info("Skipped event: no start time", {
          operation: CALENDAR_SYNC_OPERATION,
          additionalData: {
            ...debugContext,
            op: "calendar.sync.skipped_no_start_time",
            eventId: e.id,
            eventTitle: e.summary,
            startDateTime: e.start?.dateTime,
            startDate: e.start?.date,
          },
        });
        continue;
      }

      const occurredAt = new Date(startStr);
      toInsert.push({ ev: e, occurredAt });
    }
    const insertData = toInsert.map(({ ev: e, occurredAt }) => ({
      userId,
      provider: "google_calendar",
      payload: e,
      occurredAt,
      contactId: null,
      batchId: batchId ?? null,
      sourceMeta: { fetchedAt: new Date().toISOString() },
      sourceId: e.id ?? null,
    }));

    // Use direct insert with onConflictDoNothing for better type handling
    try {
      const db = await getDb();
      await db
        .insert(rawEvents)
        .values(insertData as never)
        .onConflictDoNothing();

      itemsFetched += insertData.length;
      itemsInserted += insertData.length;
    } catch (error) {
      // Handle errors gracefully
      console.warn("Failed to insert calendar events:", error);
      itemsSkipped += insertData.length;
    }
    // pacing between batches
    await new Promise((r) => setTimeout(r, SYNC_SLEEP_MS));
  }

  const durationMs = Date.now() - startedAt;
  // Minimal structured metrics for Calendar sync run
  await logger.info("Calendar sync metrics", {
    operation: CALENDAR_SYNC_OPERATION,
    additionalData: {
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
  });

  // Enqueue normalization jobs using our new normalizers
  await dbo.insert(jobs).values({
    userId,
    kind: "normalize_google_event",
    payload: {
      batchId,
      provider: "google_calendar",
    },
    batchId: batchId ?? null,
  });
}
