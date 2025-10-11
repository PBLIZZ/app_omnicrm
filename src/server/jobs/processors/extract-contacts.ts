import { logger } from "@/lib/observability";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { contactTimeline } from "@/server/db/schema";
import type { JobRecord, ContactExtractionPayload } from "../types";

function isContactExtractionPayload(payload: unknown): payload is ContactExtractionPayload {
  return typeof payload === "object" && payload !== null;
}

interface CandidateIdentity {
  kind: string; // 'email', 'phone', 'handle', etc.
  value: string;
  provider?: string;
}

interface ContactResolutionResult {
  contactId: string | null;
  confidence: number;
  matchedBy: string | null;
  newIdentities?: CandidateIdentity[];
}

// Type definitions for interaction source metadata
interface GmailSourceMeta {
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  threadId?: string;
  messageId?: string;
}

interface CalendarSourceMeta {
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
    name?: string;
  };
  eventId?: string;
  calendarId?: string;
  summary?: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  recurring?: boolean;
  status?: string;
}

interface InteractionWithMeta {
  id: string;
  source: string;
  source_id: string;
  source_meta: GmailSourceMeta | CalendarSourceMeta | Record<string, unknown>;
  body_text: string | null;
  subject: string | null;
}

/**
 * Contact extraction processor - extracts and links contacts from interactions.
 * Migrated from contact-resolver.ts to follow the new job processing pattern.
 */
export async function runExtractContacts(job: JobRecord<"extract_contacts">): Promise<void> {
  const startedAt = Date.now();
  const payload = isContactExtractionPayload(job.payload) ? job.payload : {};

  await logger.info("Starting contact extraction job", {
    operation: "extract_contacts",
    additionalData: {
      jobId: job.id,
      userId: job.userId,
      mode: payload.mode ?? "batch",
      interactionId: payload.interactionId ?? null,
      maxItems: payload.maxItems ?? null,
      batchId: payload.batchId ?? job.batchId ?? null,
    },
  });

  let processed = 0;
  let linked = 0;
  let errors = 0;
  let timelineCreated = 0;

  try {
    if (payload.mode === "single" && payload.interactionId) {
      // Process single interaction
      const result = await processInteraction(job.userId, payload.interactionId);
      processed = 1;
      if (result.success) {
        linked = 1;
        if (result.timelineCreated) timelineCreated = 1;
      } else {
        errors = 1;
      }
    } else {
      // Process batch of unlinked interactions
      const interactions = await getUnlinkedInteractions(job.userId, payload.maxItems ?? 100);

      for (const interaction of interactions) {
        const result = await processInteraction(job.userId, interaction.id);
        processed++;
        if (result.success) {
          linked++;
          if (result.timelineCreated) timelineCreated++;
        } else {
          errors++;
          await logger.warn("Failed to process interaction for contact extraction", {
            operation: "extract_contacts",
            additionalData: {
              jobId: job.id,
              userId: job.userId,
              interactionId: interaction.id,
              error: result.error,
            },
          });
        }
      }
    }

    const durationMs = Date.now() - startedAt;
    await logger.info(
      `Contact extraction completed: ${linked}/${processed} interactions linked, ${timelineCreated} timeline entries created`,
      {
        operation: "extract_contacts",
        additionalData: {
          jobId: job.id,
          userId: job.userId,
          durationMs,
          processed,
          linked,
          timelineCreated,
          errors,
        },
      },
    );

    // Enqueue embed job (final step in the pipeline)
    if (linked > 0 || processed > 0) {
      const db = await getDb();
      await db.execute(sql`
        INSERT INTO jobs (user_id, kind, payload, batch_id, status)
        VALUES (
          ${job.userId},
          'embed',
          ${'{"batchId": "' + (payload.batchId ?? job.batchId ?? "") + '", "ownerType": "interaction", "source": "extract_contacts"}'},
          ${payload.batchId ?? job.batchId ?? null},
          'queued'
        )
      `);

      await logger.info("Embed job enqueued after contact extraction", {
        operation: "extract_contacts",
        additionalData: {
          jobId: job.id,
          userId: job.userId,
          batchId: payload.batchId ?? job.batchId ?? null,
        },
      });
    }
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    await logger.error(
      "Contact extraction job failed",
      {
        operation: "extract_contacts",
        additionalData: {
          jobId: job.id,
          userId: job.userId,
          durationMs,
        },
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}

/**
 * Process a single interaction for contact extraction
 */
async function processInteraction(
  userId: string,
  interactionId: string,
): Promise<{ success: boolean; error?: string; timelineCreated?: boolean }> {
  try {
    const db = await getDb();

    // Get interaction details
    const interactionResult = await db.execute(sql`
      SELECT id, source, source_id, source_meta, body_text, subject
      FROM interactions
      WHERE id = ${interactionId} AND user_id = ${userId} AND contact_id IS NULL
      LIMIT 1
    `);

    if (interactionResult.length === 0) {
      return { success: false, error: "Interaction not found or already linked" };
    }

    const interactionData = interactionResult[0];
    if (!interactionData || typeof interactionData !== "object") {
      return { success: false, error: "Invalid interaction data" };
    }

    const interaction = interactionData as unknown as InteractionWithMeta;

    // Extract candidate identities from interaction
    const candidateIdentities = extractCandidateIdentities(interaction);

    if (candidateIdentities.length === 0) {
      return { success: false, error: "No candidate identities found" };
    }

    // Resolve contact
    const resolution = await resolveContact(userId, candidateIdentities);

    if (resolution.contactId) {
      // Link interaction to contact
      await linkInteraction(interactionId, resolution.contactId);

      // Store new identities if any
      if (resolution.newIdentities) {
        await storeCandidateIdentities(userId, resolution.contactId, resolution.newIdentities);
      }

      // Create timeline entry for calendar events
      let timelineCreated = false;
      if (interaction.source === "google_calendar") {
        try {
          await createCalendarTimelineEntry(userId, resolution.contactId, interaction);
          timelineCreated = true;
        } catch (error) {
          await logger.warn("Failed to create timeline entry for calendar event", {
            operation: "extract_contacts",
            additionalData: {
              userId,
              contactId: resolution.contactId,
              interactionId: interaction.id,
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      return { success: true, timelineCreated };
    }

    return { success: false, error: "No matching contact found" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Extract candidate identities from interaction data
 */
function extractCandidateIdentities(interaction: InteractionWithMeta): CandidateIdentity[] {
  const identities: CandidateIdentity[] = [];

  // Extract from Gmail source_meta
  if (interaction.source === "gmail" && interaction.source_meta) {
    const meta = interaction.source_meta as GmailSourceMeta;

    if (meta.from) {
      identities.push({ kind: "email", value: meta.from.toLowerCase(), provider: "gmail" });
    }

    if (meta.to && Array.isArray(meta.to)) {
      meta.to.forEach((email: string) => {
        identities.push({ kind: "email", value: email.toLowerCase(), provider: "gmail" });
      });
    }
  }

  // Extract from Calendar source_meta
  if (interaction.source === "google_calendar" && interaction.source_meta) {
    const meta = interaction.source_meta as CalendarSourceMeta;

    if (meta.attendees && Array.isArray(meta.attendees)) {
      meta.attendees.forEach((attendee) => {
        if (attendee.email) {
          identities.push({
            kind: "email",
            value: attendee.email.toLowerCase(),
            provider: "google_calendar",
          });
        }
      });
    }

    if (meta.organizer?.email) {
      identities.push({
        kind: "email",
        value: meta.organizer.email.toLowerCase(),
        provider: "google_calendar",
      });
    }
  }

  return identities;
}

/**
 * Resolve contact ID from candidate identities
 */
async function resolveContact(
  userId: string,
  candidateIdentities: CandidateIdentity[],
): Promise<ContactResolutionResult> {
  if (!candidateIdentities || candidateIdentities.length === 0) {
    return { contactId: null, confidence: 0, matchedBy: null };
  }

  // Try to find existing contact via contact_identities
  for (const identity of candidateIdentities) {
    const result = await findContactByIdentity(userId, identity);
    if (result.contactId) {
      return result;
    }
  }

  // If no match found via identities, try direct contact fields
  for (const identity of candidateIdentities) {
    if (identity.kind === "email") {
      const contactId = await findContactByEmail(userId, identity.value);
      if (contactId) {
        return {
          contactId,
          confidence: 0.9,
          matchedBy: "email",
          newIdentities: candidateIdentities,
        };
      }
    }

    if (identity.kind === "phone") {
      const contactId = await findContactByPhone(userId, identity.value);
      if (contactId) {
        return {
          contactId,
          confidence: 0.8,
          matchedBy: "phone",
          newIdentities: candidateIdentities,
        };
      }
    }
  }

  return {
    contactId: null,
    confidence: 0,
    matchedBy: null,
    newIdentities: candidateIdentities,
  };
}

async function findContactByIdentity(
  userId: string,
  identity: CandidateIdentity,
): Promise<ContactResolutionResult> {
  const db = await getDb();

  const result = await db.execute(sql`
    SELECT contact_id 
    FROM contact_identities
    WHERE user_id = ${userId}
      AND kind = ${identity.kind}
      AND value = ${identity.value}
      AND coalesce(provider, '') = ${identity.provider ?? ""}
    LIMIT 1
  `);

  if (result.length > 0) {
    const row = result[0] as { contact_id: string };
    return {
      contactId: row.contact_id,
      confidence: 1.0,
      matchedBy: identity.kind,
    };
  }

  return { contactId: null, confidence: 0, matchedBy: null };
}

async function findContactByEmail(userId: string, email: string): Promise<string | null> {
  const db = await getDb();

  const result = await db.execute(sql`
    SELECT id 
    FROM contacts
    WHERE user_id = ${userId}
      AND primary_email = ${email.toLowerCase()}
    LIMIT 1
  `);

  if (result.length > 0) {
    const row = result[0] as { id: string };
    return row.id;
  }

  return null;
}

async function findContactByPhone(userId: string, phone: string): Promise<string | null> {
  const db = await getDb();
  const normalizedPhone = phone.replace(/\D/g, ""); // Basic phone normalization

  const result = await db.execute(sql`
    SELECT id 
    FROM contacts
    WHERE user_id = ${userId}
      AND primary_phone = ${normalizedPhone}
    LIMIT 1
  `);

  if (result.length > 0) {
    const row = result[0] as { id: string };
    return row.id;
  }

  return null;
}

async function linkInteraction(interactionId: string, contactId: string): Promise<void> {
  const db = await getDb();

  await db.execute(sql`
    UPDATE interactions 
    SET contact_id = ${contactId}
    WHERE id = ${interactionId}
  `);
}

async function storeCandidateIdentities(
  userId: string,
  contactId: string,
  identities: CandidateIdentity[],
): Promise<void> {
  if (!identities || identities.length === 0) return;

  const db = await getDb();

  for (const identity of identities) {
    await db.execute(sql`
      INSERT INTO contact_identities (user_id, contact_id, kind, value, provider)
      VALUES (${userId}, ${contactId}, ${identity.kind}, ${identity.value}, ${identity.provider ?? null})
      ON CONFLICT (user_id, kind, value, coalesce(provider, ''))
      DO NOTHING
    `);
  }
}

async function getUnlinkedInteractions(
  userId: string,
  limit = 100,
): Promise<Array<{ id: string; source: string; sourceId: string }>> {
  const db = await getDb();

  const result = await db.execute(sql`
    SELECT id, source, source_id
    FROM interactions
    WHERE user_id = ${userId}
      AND contact_id IS NULL
      AND created_at > now() - interval '7 days'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  const typedResult = result as unknown as Array<{ id: string; source: string; source_id: string }>;
  return typedResult.map((item) => ({
    id: item.id,
    source: item.source,
    sourceId: item.source_id,
  }));
}

/**
 * Create a timeline entry for a calendar event
 */
async function createCalendarTimelineEntry(
  userId: string,
  contactId: string,
  interaction: InteractionWithMeta,
): Promise<void> {
  const db = await getDb();

  // Extract event details from source_meta
  const sourceMeta = interaction.source_meta as CalendarSourceMeta;
  const calendarId = sourceMeta.calendarId ?? null;
  const eventId = sourceMeta.eventId ?? interaction.source_id;
  const startTime = sourceMeta.startTime ?? null;
  const endTime = sourceMeta.endTime ?? null;
  const isAllDay = sourceMeta.isAllDay ?? false;
  const recurring = sourceMeta.recurring ?? false;
  const status = sourceMeta.status ?? "confirmed";

  // Determine event type based on event metadata
  let eventType = "appointment_scheduled";
  const subject = interaction.subject?.toLowerCase() ?? "";

  if (subject.includes("meeting") || subject.includes("call")) {
    eventType = "meeting_attended";
  } else if (
    subject.includes("workshop") ||
    subject.includes("class") ||
    subject.includes("training")
  ) {
    eventType = "class_attended";
  } else if (subject.includes("consultation") || subject.includes("session")) {
    eventType = "consultation_completed";
  }

  // Build event data
  const eventData = {
    googleEventId: eventId,
    calendarId,
    interactionId: interaction.id,
    location: sourceMeta.location ?? null,
    startTime,
    endTime,
    duration: calculateDuration(startTime, endTime),
    isAllDay,
    recurring,
    status,
    attendees: sourceMeta.attendees ?? [],
  };

  // Create timeline entry with proper conflict handling
  try {
    await db.insert(contactTimeline).values({
      userId: userId,
      contactId: contactId,
      eventType: eventType,
      title: interaction.subject ?? "Calendar Event",
      description:
        interaction.body_text ??
        `${eventType.replace(/_/g, " ").charAt(0).toUpperCase() + eventType.replace(/_/g, " ").slice(1)}`,
      eventData: eventData,
      occurredAt: startTime ? new Date(startTime) : new Date(),
    });
  } catch (error: unknown) {
    // If it's a unique constraint violation, that's fine - the timeline entry already exists
    if ((error as { code?: string }).code !== "23505") {
      throw error; // Re-throw if it's not a unique constraint violation
    }
  }
}

/**
 * Calculate duration in minutes between two timestamps
 */
function calculateDuration(startTime: string | null, endTime: string | null): number | null {
  if (!startTime || !endTime) return null;

  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    return Math.round(durationMs / 60000); // Convert to minutes
  } catch {
    return null;
  }
}
