import { JobRecord } from "@/server/jobs/types";
import { log } from "@/lib/log";
import { getDb } from "@/server/db/client";
import { rawEvents, calendarEvents } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { drizzleAdminGuard } from "@/server/db/admin";
import type { RawEvent } from "@/server/db/schema";

// Type guards for safe payload parsing
interface BatchJobPayload {
  batchId?: string;
}

interface GmailPayload {
  payload?: {
    headers?: Array<{ name?: string | null; value?: string | null }>;
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
      parts?: Array<any>;
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

  log.info(
    {
      op: "normalize_google_email.start",
      jobId: job.id,
      userId: job.userId,
      batchId,
    },
    "normalize_google_email_start",
  );

  try {
    const typedPayload = job.payload as GmailPayload;
    if (!isGmailPayload(typedPayload)) {
      throw new Error("Invalid Gmail payload structure");
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

    // Create the raw event record
    const r = {
      userId: job.userId,
      source: "gmail",
      sourceId: messageId,
      occurredAt: new Date(),
      sourceMeta: enrichedSourceMeta,
      batchId,
    };

    // Upsert the interaction with rich metadata
    const upsertRes = await drizzleAdminGuard.upsert("interactions", {
      userId: job.userId,
      contactId: null,
      type: "email",
      subject: subject ?? undefined,
      bodyText: bodyText ?? undefined,
      bodyRaw: null,
      occurredAt: r.occurredAt instanceof Date ? r.occurredAt : new Date(String(r.occurredAt)),
      source: "gmail",
      sourceId: messageId ?? undefined,
      sourceMeta: r.sourceMeta as Record<string, unknown> | null | undefined,
      batchId: (r.batchId ?? undefined) as string | undefined,
    });

    log.info(
      {
        op: "normalize_google_email.complete",
        jobId: job.id,
        userId: job.userId,
        messageId,
        threadId,
        subject: subject?.substring(0, 50),
        fromEmail,
        toEmailsCount: toEmails.length,
        labelsCount: labels.length,
        isOutbound,
        upserted: upsertRes.length > 0,
        durationMs: Date.now() - startedAt,
        batchId,
      },
      "normalize_google_email_complete",
    );
  } catch (error) {
    log.error(
      {
        op: "normalize_google_email.error",
        jobId: job.id,
        userId: job.userId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
        batchId,
      },
      "normalize_google_email_error",
    );
    throw error;
  }
}

// Enhanced extraction functions from gmail-normalizer.ts
function extractMessageId(message: GmailPayload): string {
  return message.id || "";
}

function extractThreadId(message: GmailPayload): string | null {
  return message.threadId || null;
}

function extractFromEmail(message: GmailPayload): string | null {
  const headers = message.payload?.headers || message.headers || [];
  const fromHeader = headers.find((h: any) => h.name && h.name.toLowerCase() === "from");
  if (!fromHeader || !fromHeader.value) return null;

  // Extract email from "Name <email>" format
  const emailMatch = fromHeader.value.match(/<([^>]+)>/);
  return emailMatch?.[1] ?? fromHeader.value;
}

function extractToEmails(message: GmailPayload): string[] {
  const headers = message.payload?.headers || message.headers || [];
  const toHeader = headers.find((h: any) => h.name && h.name.toLowerCase() === "to");
  if (!toHeader || !toHeader.value) return [];

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
  const headers = message.payload?.headers || message.headers || [];
  const subjectHeader = headers.find((h: any) => h.name && h.name.toLowerCase() === "subject");
  return subjectHeader?.value ?? null;
}

function extractBodyText(message: GmailPayload): string | null {
  // Start with snippet as fallback
  let bodyText = message.snippet || "";

  // Extract from message parts if available
  const parts = message.payload?.parts || [];
  const textParts = extractTextFromParts(parts);

  if (textParts.length > 0) {
    bodyText = textParts.join("\n\n");
  }

  // Clean up and return
  return bodyText.trim() || null;
}

function extractTextFromParts(parts: any[]): string[] {
  const textParts: string[] = [];

  for (const part of parts) {
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
        console.warn("Failed to decode Gmail message part:", error);
      }
    }
  }

  return textParts;
}

function extractLabels(message: GmailPayload): string[] {
  return message.labelIds || [];
}

function isOutboundMessage(message: GmailPayload): boolean {
  // Check if message is in sent folder or has outbound labels
  const labels = message.labelIds || [];

  // Gmail standard labels for sent items
  const sentLabels = ["SENT", "DRAFT"];
  return labels.some((label: string) => sentLabels.includes(label));
}

function extractHistoryId(message: GmailPayload): string | null {
  return message.historyId || null;
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

  log.info(
    {
      op: "normalize_google_event.start",
      jobId: job.id,
      userId: job.userId,
      totalRows: rows.length,
      batchId,
    },
    "normalize_google_event_start",
  );

  for (const row of rows) {
    if (Date.now() > deadlineMs) {
      log.warn(
        {
          op: "normalize_google_event.timeout",
          jobId: job.id,
          userId: job.userId,
          itemsFetched,
          itemsInserted,
          itemsSkipped,
        },
        "normalize_google_event_timeout",
      );
      break;
    }

    try {
      // Simple calendar event normalization
      const payload = row.payload as any;
      if (!payload || !payload.id) {
        itemsSkipped++;
        continue;
      }

      // Create enriched source metadata for interaction
      const enrichedSourceMeta = {
        ...(row.sourceMeta as Record<string, unknown>),
        // Add additional event details for timeline creation
        attendees: payload.attendees || [],
        location: payload.location || null,
        organizer: payload.organizer || null,
        timeZone: payload.start?.timeZone || null,
      };

      // Create interaction record
      await drizzleAdminGuard.upsert("interactions", {
        userId: job.userId,
        contactId: null,
        type: "calendar_event",
        subject: payload.summary || payload.title || "Untitled Event",
        bodyText: payload.description || null,
        bodyRaw: null,
        occurredAt: new Date(payload.start?.dateTime || payload.start?.date || row.occurredAt),
        source: "google_calendar",
        sourceId: payload.id,
        sourceMeta: enrichedSourceMeta,
        batchId: row.batchId,
      });

      // Also create calendar_events record using regular Drizzle ORM
      const db = await getDb();
      await db
        .insert(calendarEvents)
        .values({
          userId: job.userId,
          googleEventId: payload.id,
          title: payload.summary || payload.title || "Untitled Event",
          description: payload.description || null,
          startTime: new Date(payload.start?.dateTime || payload.start?.date || row.occurredAt),
          endTime: new Date(payload.end?.dateTime || payload.end?.date || row.occurredAt),
          attendees: payload.attendees || null,
          location: payload.location || null,
          status: payload.status || null,
          timeZone: payload.start?.timeZone || null,
          isAllDay: !payload.start?.dateTime, // All-day if no dateTime, just date
          visibility: payload.visibility || null,
          eventType: null, // Can be populated later by AI
          businessCategory: null, // Can be populated later by AI
          keywords: null, // Can be populated later by AI
          googleUpdated: payload.updated ? new Date(payload.updated) : null,
          lastSynced: new Date(),
        })
        .onConflictDoUpdate({
          target: [calendarEvents.userId, calendarEvents.googleEventId],
          set: {
            title: payload.summary || payload.title || "Untitled Event",
            description: payload.description || null,
            startTime: new Date(payload.start?.dateTime || payload.start?.date || row.occurredAt),
            endTime: new Date(payload.end?.dateTime || payload.end?.date || row.occurredAt),
            attendees: payload.attendees || null,
            location: payload.location || null,
            status: payload.status || null,
            lastSynced: new Date(),
          },
        });
      itemsInserted++;
      itemsFetched++;
    } catch (error) {
      log.error(
        {
          op: "normalize_google_event.item_error",
          jobId: job.id,
          userId: job.userId,
          rawEventId: row.id,
          error: error instanceof Error ? error.message : String(error),
        },
        "normalize_google_event_item_error",
      );
      itemsSkipped++;
    }
  }

  // Note: extract_contacts job is already enqueued by the sync API route
  // No need to create duplicate job here

  log.info(
    {
      op: "normalize_google_event.complete",
      jobId: job.id,
      userId: job.userId,
      itemsFetched,
      itemsInserted,
      itemsSkipped,
      durationMs: Date.now() - startedAt,
      batchId,
      embeddingJobEnqueued: itemsInserted > 0,
    },
    "normalize_google_event_complete",
  );
}
