import type { JobRecord } from "@/server/jobs/types";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { rawEvents, calendarEvents } from "@/server/db/schema";
import { logger } from "@/lib/observability";
import { drizzleAdminGuard } from "@/server/db/admin";
import type { RawEvent } from "@/server/db/types";
import { ErrorHandler } from "@/lib/errors/app-error";

// Type guards for safe payload parsing
interface BatchJobPayload {
  batchId?: string;
  provider?: string;
}

interface GmailPayload {
  payload?: {
    headers?: Array<{ name?: string | null; value?: string | null }>;
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
      parts?: Array<{
        mimeType?: string;
        body?: { data?: string };
        parts?: unknown[];
      }>;
    }>;
  };
  snippet?: string | null;
  id?: string | null;
  threadId?: string | null;
  labelIds?: string[];
  historyId?: string | null;
  headers?: Array<{ name?: string | null; value?: string | null }>;
}

function isBatchJobPayload(payload: unknown): payload is BatchJobPayload {
  return typeof payload === "object" && payload !== null;
}

function isGmailPayload(payload: unknown): payload is GmailPayload {
  return typeof payload === "object" && payload !== null;
}

// No verbose logging here to keep normalization fast and predictable
/**
 * Processor constraints:
 * - API call timeout: 10 seconds (applies when external calls added)
 * - Retries: 3 with jitter (callWithRetry when applicable)
 * - Hard cap: 3 minutes per job to avoid runaways
 */

export async function runNormalizeGoogleEmail(job: JobRecord): Promise<void> {
  const batchId = isBatchJobPayload(job.payload) ? job.payload.batchId : undefined;
  const startedAt = Date.now();
  const deadlineMs = startedAt + 3 * 60 * 1000; // hard cap: 3 minutes per job
  const maxItems = 1000; // Default batch size limit
  let itemsFetched = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;

  await logger.info("normalize_google_email_start", {
    operation: "normalize_data",
    additionalData: {
      jobId: job.id,
      userId: job.userId,
      batchId,
    },
  });

  try {
    const db = await getDb();

    // Build query conditions for batch processing, filtering out undefined
    const conditions = [eq(rawEvents.userId, job.userId), eq(rawEvents.provider, "gmail")];

    if (batchId) {
      conditions.push(eq(rawEvents.batchId, batchId));
    }

    const rows: RawEvent[] = await db
      .select()
      .from(rawEvents)
      .where(and(...conditions))
      .limit(Math.min(1000, maxItems));

    await logger.info("normalize_google_email_processing", {
      operation: "normalize_data",
      additionalData: {
        jobId: job.id,
        userId: job.userId,
        totalRows: rows.length,
        batchId,
      },
    });

    for (const event of rows) {
      if (Date.now() > deadlineMs) {
        await logger.warn("normalize_google_email_timeout", {
          operation: "normalize_data",
          additionalData: {
            jobId: job.id,
            userId: job.userId,
            itemsFetched,
            itemsInserted,
            itemsSkipped,
          },
        });
        break;
      }

      try {
        const typedPayload = event.payload as GmailPayload;

        if (!isGmailPayload(typedPayload)) {
          await logger.warn("normalize_google_email_invalid_payload", {
            operation: "normalize_data",
            additionalData: {
              jobId: job.id,
              userId: job.userId,
              rawEventId: event.id,
            },
          });
          itemsSkipped++;
          continue;
        }

        // Extract rich metadata using enhanced extraction methods
        const messageId = extractMessageId(typedPayload);
        const threadId = extractThreadId(typedPayload);
        const subject = extractSubject(typedPayload);
        const bodyText = extractBodyText(typedPayload);
        const fromEmail = extractFromEmail(typedPayload);
        const toEmails = extractToEmails(typedPayload);
        const labels = extractLabels(typedPayload);
        const isOutbound = isOutboundMessage(typedPayload);
        const historyId = extractHistoryId(typedPayload);

        // Create enriched source metadata
        const enrichedSourceMeta = {
          ...typedPayload,
          extractedMetadata: {
            threadId,
            fromEmail,
            toEmails,
            labels,
            isOutbound,
            historyId,
            extractedAt: new Date().toISOString(),
          },
        };

        // Upsert the interaction with rich metadata
        await drizzleAdminGuard.upsert("interactions", {
          userId: job.userId,
          contactId: null,
          type: "email",
          subject: subject ?? undefined,
          bodyText: bodyText ?? undefined,
          bodyRaw: null,
          occurredAt:
            event.occurredAt instanceof Date
              ? event.occurredAt
              : new Date(String(event.occurredAt)),
          source: "gmail",
          sourceId: messageId ?? undefined,
          sourceMeta: enrichedSourceMeta as Record<string, unknown> | null | undefined,
          batchId: event.batchId ?? undefined,
        });

        itemsInserted++;
        itemsFetched++;
      } catch (error) {
        await logger.error(
          "normalize_google_email_item_error",
          {
            operation: "normalize_data",
            additionalData: {
              jobId: job.id,
              userId: job.userId,
              rawEventId: event.id,
            },
          },
          error instanceof Error ? error : new Error(String(error)),
        );
        itemsSkipped++;
      }
    }

    await logger.info("normalize_google_email_complete", {
      operation: "normalize_data",
      additionalData: {
        jobId: job.id,
        userId: job.userId,
        itemsFetched,
        itemsInserted,
        itemsSkipped,
        durationMs: Date.now() - startedAt,
        batchId,
      },
    });
  } catch (error) {
    await logger.error(
      "normalize_google_email_error",
      {
        operation: "normalize_data",
        additionalData: {
          jobId: job.id,
          userId: job.userId,
          durationMs: Date.now() - startedAt,
          batchId,
        },
      },
      ErrorHandler.fromError(error),
    );
    throw error;
  }
}

// Enhanced extraction functions from gmail-normalizer.ts
function extractMessageId(message: GmailPayload): string {
  return message.id ?? "";
}

function extractThreadId(message: GmailPayload): string | null {
  return message.threadId ?? null;
}

function extractFromEmail(message: GmailPayload): string | null {
  const headers = message.payload?.headers ?? message.headers ?? [];
  const fromHeader = headers.find((h) => h.name && h.name.toLowerCase() === "from");
  if (!fromHeader?.value) return null;

  // Extract email from "Name <email>" format
  const emailMatch = fromHeader.value.match(/<([^>]+)>/);
  return emailMatch?.[1] ?? fromHeader.value;
}

function extractToEmails(message: GmailPayload): string[] {
  const headers = message.payload?.headers ?? message.headers ?? [];
  const toHeader = headers.find((h) => h.name && h.name.toLowerCase() === "to");
  if (!toHeader?.value) return [];

  // Parse comma-separated emails, handling "Name <email>" format
  return toHeader.value
    .split(",")
    .map((email: string) => {
      const trimmed = email.trim();
      const emailMatch = trimmed.match(/<([^>]+)>/);
      return emailMatch?.[1] ?? trimmed;
    })
    .filter((email): email is string => Boolean(email));
}

function extractSubject(message: GmailPayload): string | null {
  const headers = message.payload?.headers ?? message.headers ?? [];
  const subjectHeader = headers.find((h) => h.name && h.name.toLowerCase() === "subject");
  return subjectHeader?.value ?? null;
}

function extractBodyText(message: GmailPayload): string | null {
  // Start with snippet as fallback
  let bodyText = message.snippet ?? "";

  // Extract from message parts if available
  const parts = message.payload?.parts ?? [];
  const textParts = extractTextFromParts(parts);

  if (textParts.length > 0) {
    bodyText = textParts.join("\n\n");
  }

  // Clean up and return
  return bodyText.trim() || null;
}

interface EmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: EmailPart[];
}

function isEmailPart(part: unknown): part is EmailPart {
  return typeof part === "object" && part !== null;
}

function extractTextFromParts(parts: unknown[]): string[] {
  const textParts: string[] = [];

  for (const part of parts) {
    if (!isEmailPart(part)) continue;

    // Handle nested parts (multipart messages)
    if (part.parts && Array.isArray(part.parts)) {
      textParts.push(...extractTextFromParts(part.parts));
      continue;
    }

    // Extract text/plain content
    if (part.mimeType === "text/plain" && part.body?.data) {
      try {
        // Gmail API returns base64url encoded data
        const decoded = Buffer.from(part.body.data, "base64url").toString("utf-8");
        textParts.push(decoded);
      } catch (error) {
        // Log decode warning with proper error handling
        // Use void for fire-and-forget logging - errors here shouldn't block processing
        void (async () => {
          try {
            await logger.warn("Failed to decode Gmail message part", {
              operation: "jobs.normalize.decode_message",
              additionalData: {
                mimeType: part.mimeType,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              },
            });
          } catch (loggingError) {
            // Fallback diagnostic when logging fails
            console.error("Failed to log decode warning:", {
              originalError: error instanceof Error ? error.message : String(error),
              loggingError:
                loggingError instanceof Error ? loggingError.message : String(loggingError),
              mimeType: part.mimeType,
              operation: "jobs.normalize.decode_message",
            });
          }
        })();
      }
    }
  }

  return textParts;
}

function extractLabels(message: GmailPayload): string[] {
  return message.labelIds ?? [];
}

function isOutboundMessage(message: GmailPayload): boolean {
  // Check if message is in sent folder or has outbound labels
  const labels = message.labelIds ?? [];

  // Gmail standard labels for sent items
  const sentLabels = ["SENT", "DRAFT"];
  return labels.some((label: string) => sentLabels.includes(label));
}

function extractHistoryId(message: GmailPayload): string | null {
  return message.historyId ?? null;
}

export async function runNormalizeGoogleEvent(job: JobRecord): Promise<void> {
  const dbo = await getDb();
  const batchId = isBatchJobPayload(job.payload) ? job.payload.batchId : undefined;
  const startedAt = Date.now();
  const deadlineMs = startedAt + 3 * 60 * 1000; // hard cap: 3 minutes per job
  const maxItems = 1000; // Default batch size limit
  let itemsFetched = 0;
  let itemsInserted = 0;
  let itemsSkipped = 0;
  // Build query conditions, filtering out undefined
  const conditions = [eq(rawEvents.userId, job.userId), eq(rawEvents.provider, "google_calendar")];

  if (batchId) {
    conditions.push(eq(rawEvents.batchId, batchId));
  }

  const rows: RawEvent[] = await dbo
    .select()
    .from(rawEvents)
    .where(and(...conditions))
    .limit(Math.min(1000, maxItems));

  await logger.info("normalize_google_event_start", {
    operation: "normalize_data",
    additionalData: {
      jobId: job.id,
      userId: job.userId,
      totalRows: rows.length,
      batchId,
    },
  });

  for (const row of rows) {
    if (Date.now() > deadlineMs) {
      await logger.warn("normalize_google_event_timeout", {
        operation: "normalize_data",
        additionalData: {
          jobId: job.id,
          userId: job.userId,
          itemsFetched,
          itemsInserted,
          itemsSkipped,
        },
      });
      break;
    }

    try {
      // Simple calendar event normalization
      const payload = row.payload as Record<string, unknown>;
      if (!payload?.["id"]) {
        itemsSkipped++;
        continue;
      }

      // Create enriched source metadata for interaction
      const enrichedSourceMeta = {
        ...(row.sourceMeta as Record<string, unknown>),
        // Add additional event details for timeline creation
        attendees: payload["attendees"] ?? [],
        location: payload["location"] ?? null,
        organizer: payload["organizer"] ?? null,
        timeZone: (payload["start"] as Record<string, unknown>)?.["timeZone"] ?? null,
      };

      // Create interaction record
      await drizzleAdminGuard.upsert("interactions", {
        userId: job.userId,
        contactId: null,
        type: "calendar_event",
        subject: (payload["summary"] as string) || (payload["title"] as string) || "Untitled Event",
        bodyText: (payload["description"] as string) || null,
        bodyRaw: null,
        occurredAt: new Date(
          ((payload["start"] as Record<string, unknown>)?.["dateTime"] as string) ||
            ((payload["start"] as Record<string, unknown>)?.["date"] as string) ||
            row.occurredAt,
        ),
        source: "google_calendar",
        sourceId: payload["id"] as string,
        sourceMeta: enrichedSourceMeta,
        batchId: row.batchId,
      });

      // Also create calendar_events record using regular Drizzle ORM
      const db = await getDb();
      await db
        .insert(calendarEvents)
        .values({
          userId: job.userId,
          googleEventId: payload["id"] as string,
          title: (payload["summary"] as string) || (payload["title"] as string) || "Untitled Event",
          description: (payload["description"] as string) || null,
          startTime: new Date(
            ((payload["start"] as Record<string, unknown>)?.["dateTime"] as string) ||
              ((payload["start"] as Record<string, unknown>)?.["date"] as string) ||
              row.occurredAt,
          ),
          endTime: new Date(
            ((payload["end"] as Record<string, unknown>)?.["dateTime"] as string) ||
              ((payload["end"] as Record<string, unknown>)?.["date"] as string) ||
              row.occurredAt,
          ),
          attendees: payload["attendees"] ?? null,
          location: (payload["location"] as string) || null,
          status: (payload["status"] as string) || null,
          timeZone: ((payload["start"] as Record<string, unknown>)?.["timeZone"] as string) || null,
          isAllDay: !(payload["start"] as Record<string, unknown>)?.["dateTime"], // All-day if no dateTime, just date
          visibility: (payload["visibility"] as string) || null,
          eventType: null, // Can be populated later by AI
          businessCategory: null, // Can be populated later by AI
          keywords: null, // Can be populated later by AI
          googleUpdated: payload["updated"] ? new Date(payload["updated"] as string) : null,
          lastSynced: new Date(),
        })
        .onConflictDoUpdate({
          target: [calendarEvents.userId, calendarEvents.googleEventId],
          set: {
            title:
              (payload["summary"] as string) || (payload["title"] as string) || "Untitled Event",
            description: (payload["description"] as string) || null,
            startTime: new Date(
              ((payload["start"] as Record<string, unknown>)?.["dateTime"] as string) ||
                ((payload["start"] as Record<string, unknown>)?.["date"] as string) ||
                row.occurredAt,
            ),
            endTime: new Date(
              ((payload["end"] as Record<string, unknown>)?.["dateTime"] as string) ||
                ((payload["end"] as Record<string, unknown>)?.["date"] as string) ||
                row.occurredAt,
            ),
            attendees: payload["attendees"] ?? null,
            location: (payload["location"] as string) || null,
            status: (payload["status"] as string) || null,
            lastSynced: new Date(),
          },
        });
      itemsInserted++;
      itemsFetched++;
    } catch (error) {
      await logger.error(
        "normalize_google_event_item_error",
        {
          operation: "normalize_data",
          additionalData: {
            jobId: job.id,
            userId: job.userId,
            rawEventId: row.id,
          },
        },
        ErrorHandler.fromError(error),
      );
      itemsSkipped++;
    }
  }

  // Note: extract_contacts job is already enqueued by the sync API route
  // No need to create duplicate job here

  await logger.info("normalize_google_event_complete", {
    operation: "normalize_data",
    additionalData: {
      jobId: job.id,
      userId: job.userId,
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      durationMs: Date.now() - startedAt,
      batchId,
      embeddingJobEnqueued: itemsInserted > 0,
    },
  });
}
