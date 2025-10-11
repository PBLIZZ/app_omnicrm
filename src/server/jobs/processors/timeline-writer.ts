import { getDb } from "@/server/db/client";
import { and, eq, isNotNull, inArray } from "drizzle-orm";
import { interactions, contactTimeline } from "@/server/db/schema";
import { logger } from "@/lib/observability";
import type { JobRecord } from "../types";

// Type definitions for interactions used in timeline processing
interface InteractionData {
  id: string;
  userId: string;
  contactId: string | null;
  type: string;
  subject?: string | null;
  bodyText?: string | null;
  bodyRaw?: unknown;
  occurredAt: string | Date;
  source?: string | null;
  sourceId?: string | null;
  sourceMeta?: unknown;
}

// Type definitions

interface TimelineJobPayload {
  mode?: "single" | "batch";
  interactionId?: string;
  interactionIds?: string[];
  batchId?: string;
  maxItems?: number;
}

function isTimelineJobPayload(payload: unknown): payload is TimelineJobPayload {
  return typeof payload === "object" && payload !== null;
}

/**
 * Timeline processor - creates timeline events from interactions
 * Following established job processing patterns
 */
export async function runTimeline(job: JobRecord): Promise<void> {
  const startTime = Date.now();
  const payload = isTimelineJobPayload(job.payload) ? job.payload : {};

  try {
    await logger.info("Starting timeline generation", {
      operation: "timeline_write",
      additionalData: {
        userId: job.userId,
        mode: payload.mode ?? "batch",
        interactionId: payload.interactionId,
        batchId: payload.batchId ?? job.batchId,
        jobId: job.id,
      },
    });

    let processed = 0;
    let created = 0;
    let errors = 0;

    if (payload.mode === "single" && payload.interactionId) {
      // Process single interaction
      const result = await processSingleInteraction(job.userId, payload.interactionId);
      processed = 1;
      created = result ? 1 : 0;
    } else {
      // Process batch of interactions
      const result = await processBatchInteractions(job.userId, payload);
      processed = result.processed;
      created = result.created;
      errors = result.errors;
    }

    const duration = Date.now() - startTime;
    await logger.info("Timeline generation completed", {
      operation: "timeline_write",
      additionalData: {
        userId: job.userId,
        processed,
        created,
        errors,
        duration,
        jobId: job.id,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    await logger.error(
      "Timeline generation failed",
      {
        operation: "timeline_write",
        additionalData: {
          userId: job.userId,
          duration,
          jobId: job.id,
        },
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}

/**
 * Process a single interaction for timeline
 */
async function processSingleInteraction(userId: string, interactionId: string): Promise<boolean> {
  const db = await getDb();

  // Get the interaction
  const [interaction] = await db
    .select()
    .from(interactions)
    .where(and(eq(interactions.id, interactionId), eq(interactions.userId, userId)))
    .limit(1);

  if (!interaction?.contactId) {
    return false;
  }

  const timelineEvent = mapInteractionToTimeline(interaction);
  if (timelineEvent) {
    await insertTimelineEvent(timelineEvent);
    return true;
  }

  return false;
}

/**
 * Process batch of interactions for timeline
 */
async function processBatchInteractions(
  userId: string,
  payload: TimelineJobPayload,
): Promise<{ processed: number; created: number; errors: number }> {
  const db = await getDb();
  let processed = 0;
  let created = 0;
  let errors = 0;

  // Build query conditions
  const conditions = [eq(interactions.userId, userId), isNotNull(interactions.contactId)];

  // Add batch filter if provided
  if (payload.batchId) {
    conditions.push(eq(interactions.batchId, payload.batchId));
  }

  // Handle specific interaction IDs if provided
  if (payload.interactionIds?.length) {
    conditions.push(inArray(interactions.id, payload.interactionIds));
  }

  const linkedInteractions = await db
    .select()
    .from(interactions)
    .where(and(...conditions))
    .limit(payload.maxItems ?? 1000);

  // Process each interaction
  for (const interaction of linkedInteractions) {
    try {
      processed++;
      const timelineEvent = mapInteractionToTimeline(interaction);
      if (timelineEvent) {
        await insertTimelineEvent(timelineEvent);
        created++;
      }
    } catch (error) {
      errors++;
      await logger.error(
        "Failed to create timeline event for interaction",
        {
          operation: "timeline_write",
          additionalData: {
            userId,
            interactionId: interaction.id,
          },
        },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  return { processed, created, errors };
}

// Utility functions (moved from class methods)
function mapInteractionToTimeline(interaction: InteractionData): TimelineEvent | null {
  const eventTypeMapping = getEventTypeMapping();
  const timelineEventType = eventTypeMapping[interaction.type];

  if (!timelineEventType) {
    return null;
  }

  if (!interaction.contactId) {
    return null;
  }

  return {
    userId: interaction.userId,
    contactId: interaction.contactId,
    eventType: timelineEventType,
    title: generateTitle(interaction),
    description: generateDescription(interaction),
    eventData: extractEventData(interaction),
    occurredAt:
      interaction.occurredAt instanceof Date
        ? interaction.occurredAt.toISOString()
        : interaction.occurredAt,
  };
}

function getEventTypeMapping(): Record<string, string> {
  return {
    email_received: "email_received",
    email_sent: "email_sent",
    sms_received: "sms_received",
    sms_sent: "sms_sent",
    dm_received: "dm_received",
    dm_sent: "dm_sent",
    meeting_created: "meeting_scheduled",
    meeting_attended: "meeting_attended",
    call_logged: "call_completed",
    note_added: "note_created",
    form_submission: "form_submitted",
    web_chat: "chat_message",
  };
}

function generateTitle(interaction: InteractionData): string {
  const titleMappings: Record<string, string> = {
    email_received: `Email received: ${interaction.subject ?? "No subject"}`,
    email_sent: `Email sent: ${interaction.subject ?? "No subject"}`,
    sms_received: "SMS message received",
    sms_sent: "SMS message sent",
    dm_received: "Direct message received",
    dm_sent: "Direct message sent",
    meeting_created: `Meeting scheduled: ${interaction.subject ?? "Untitled meeting"}`,
    meeting_attended: `Attended: ${interaction.subject ?? "Meeting"}`,
    call_logged: `Call: ${interaction.subject ?? "Phone call"}`,
    note_added: `Note: ${interaction.subject ?? "Added note"}`,
    form_submission: "Form submission received",
    web_chat: "Web chat conversation",
  };

  return titleMappings[interaction.type] ?? `Activity: ${interaction.type}`;
}

function generateDescription(interaction: InteractionData): string | null {
  const descriptions: Record<string, string> = {
    email_received: "Email received via Gmail sync",
    email_sent: "Email sent via Gmail sync",
    sms_received: "SMS message received via provider sync",
    sms_sent: "SMS message sent via provider sync",
    dm_received: "Direct message received from social platform",
    dm_sent: "Direct message sent via social platform",
    meeting_created: "Meeting scheduled via Google Calendar",
    meeting_attended: "Meeting attendance confirmed",
    call_logged: "Phone call logged manually",
    note_added: "Note added manually",
    form_submission: "Contact form submitted on website",
    web_chat: "Web chat conversation initiated",
  };

  return descriptions[interaction.type] ?? null;
}

function extractEventData(interaction: InteractionData): Record<string, unknown> {
  const baseEventData = {
    source: interaction.source,
    source_id: interaction.sourceId,
    interaction_id: interaction.id,
  };

  // Safe property access helper
  const getMetaProperty = (key: string): unknown => {
    if (
      interaction.sourceMeta &&
      typeof interaction.sourceMeta === "object" &&
      interaction.sourceMeta !== null
    ) {
      return (interaction.sourceMeta as Record<string, unknown>)[key];
    }
    return undefined;
  };

  switch (interaction.type) {
    case "email_received":
    case "email_sent":
      return {
        ...baseEventData,
        subject: interaction.subject,
        thread_id: getMetaProperty("threadId"),
        message_id: getMetaProperty("messageId"),
        direction: interaction.type === "email_sent" ? "outbound" : "inbound",
        channel: "email",
      };

    case "meeting_created":
      return {
        ...baseEventData,
        title: interaction.subject,
        location: getMetaProperty("location"),
        start_time: getMetaProperty("startTime"),
        end_time: getMetaProperty("endTime"),
        duration_minutes: getMetaProperty("duration"),
        meet_url: getMetaProperty("meetUrl"),
        is_all_day: getMetaProperty("isAllDay"),
        channel: "calendar",
      };

    case "call_received":
    case "call_made":
      const from = getMetaProperty("from");
      const to = getMetaProperty("to");
      return {
        ...baseEventData,
        direction: interaction.type === "call_made" ? "outbound" : "inbound",
        participants: from && to ? [from, to] : [],
        channel: "phone",
        duration_minutes: getMetaProperty("durationMinutes"),
        phone_number: getMetaProperty("phoneNumber"),
        call_type: getMetaProperty("callType"),
      };

    default:
      return baseEventData;
  }
}

async function insertTimelineEvent(event: TimelineEvent): Promise<void> {
  const db = await getDb();

  await db.insert(contactTimeline).values({
    userId: event.userId,
    contactId: event.contactId,
    eventType: event.eventType,
    title: event.title,
    description: event.description,
    eventData: event.eventData ?? {},
    occurredAt: new Date(event.occurredAt),
  });
}

// Standalone utility functions (preferred over class methods)

/**
 * Get timeline events for a contact
 */
export async function getContactTimeline(
  userId: string,
  contactId: string,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  const db = await getDb();

  const result = await db
    .select()
    .from(contactTimeline)
    .where(and(eq(contactTimeline.userId, userId), eq(contactTimeline.contactId, contactId)))
    .orderBy(contactTimeline.occurredAt)
    .limit(limit);

  return result as Array<Record<string, unknown>>;
}

/**
 * Get recent timeline events for user dashboard
 */
export async function getRecentTimelineEvents(
  userId: string,
  limit = 20,
): Promise<Array<Record<string, unknown>>> {
  const db = await getDb();

  const result = await db
    .select({
      id: contactTimeline.id,
      eventType: contactTimeline.eventType,
      title: contactTimeline.title,
      description: contactTimeline.description,
      eventData: contactTimeline.eventData,
      occurredAt: contactTimeline.occurredAt,
      createdAt: contactTimeline.createdAt,
    })
    .from(contactTimeline)
    .where(eq(contactTimeline.userId, userId))
    .orderBy(contactTimeline.occurredAt)
    .limit(limit);

  return result as Array<Record<string, unknown>>;
}
