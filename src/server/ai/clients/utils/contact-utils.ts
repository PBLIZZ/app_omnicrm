// Utility for getting contact context

import { getDb } from "@/server/db/client";
import { contacts, interactions, notes, calendarEvents, contactTimeline } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "@/lib/observability";
import type { InferSelectModel } from "drizzle-orm";

export interface ContactWithContext {
  contact: InferSelectModel<typeof contacts> | null;
  calendarEvents: InferSelectModel<typeof calendarEvents>[];
  interactions: InferSelectModel<typeof interactions>[];
  notes: InferSelectModel<typeof notes>[];
  timeline: InferSelectModel<typeof contactTimeline>[];
}

export interface FetchOptions {
  includeEvents?: boolean;
  includeInteractions?: boolean;
  includeNotes?: boolean;
  includeTimeline?: boolean;
  limit?: number;
}

export async function getContactData( // Renamed for generality
  userId: string,
  contactId: string,
  options: FetchOptions = {
    includeEvents: true,
    includeInteractions: true,
    includeNotes: true,
    includeTimeline: true,
    limit: 20,
  },
): Promise<ContactWithContext> {
  const db = await getDb();

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact || contact.userId !== userId) {
    return { contact: null, calendarEvents: [], interactions: [], notes: [], timeline: [] };
  }

  // Calendar events query (adapted from raw SQL)
  const eventsResult = contact.primaryEmail
    ? await db.execute(sql`
        SELECT 
          ce.title,
          ce.description,
          ce.location,
          ce.start_time,
          ce.end_time,
          ce.event_type,
          ce.business_category,
          ce.attendees,
          ce.created_at
        FROM calendar_events ce
        WHERE ce.user_id = ${userId}
          AND ce.attendees IS NOT NULL
          AND ce.attendees::text LIKE ${`%${contact.primaryEmail}%`}
        ORDER BY ce.start_time DESC
        LIMIT 20
      `)
    : await db.execute(sql`
        SELECT 
          ce.title,
          ce.description,
          ce.location,
          ce.start_time,
          ce.end_time,
          ce.event_type,
          ce.business_category,
          ce.attendees,
          ce.created_at
        FROM calendar_events ce
        WHERE ce.user_id = ${userId}
          AND ce.attendees IS NOT NULL
        ORDER BY ce.start_time DESC
        LIMIT 20
      `);

  const contactInteractions = await db.query.interactions.findMany({
    where: sql`user_id = ${userId} AND contact_id = ${contactId}`,
    orderBy: sql`occurred_at DESC`,
    limit: 20,
  });

  const contactNotes = await db.query.notes.findMany({
    where: sql`user_id = ${userId} AND contact_id = ${contactId}`,
    orderBy: sql`created_at DESC`,
    limit: 10,
  });

  const timeline = await db.query.contactTimeline.findMany({
    where: sql`contact_id = ${contactId}`,
    orderBy: sql`occurred_at DESC`,
    limit: 15,
  });

  logger.info("Contact data loaded", {
    operation: "load_contact_context",
  });

  return {
    contact,
    calendarEvents: (eventsResult as any) || [],
    interactions: contactInteractions,
    notes: contactNotes,
    timeline,
  };
}
