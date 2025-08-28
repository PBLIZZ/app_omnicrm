// Contacts storage layer
import { getDb } from "@/server/db/client";
import { contacts, notes, interactions, calendarEvents } from "@/server/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import type { Contact, NewContact, Note } from "@/server/db/schema";

export class ContactsStorage {
  // Contacts
  async createContact(userId: string, data: Omit<NewContact, 'userId'>): Promise<Contact> {
    const db = await getDb();
    const [contact] = await db
      .insert(contacts)
      .values({
        ...data,
        userId,
      })
      .returning();
    return contact!
  }

  async getContacts(userId: string): Promise<any[]> {
    const db = await getDb();
    
    // First get all contacts
    const contactsData = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        notes: contacts.notes,
        stage: contacts.stage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(desc(contacts.updatedAt));

    // Get interactions count for each contact
    const contactIds = contactsData.map(c => c.id);
    const interactionsCountQuery = contactIds.length > 0 
      ? await db
          .select({
            contactId: interactions.contactId,
            interactionCount: count(interactions.id).as('interactionCount')
          })
          .from(interactions)
          .where(and(
            eq(interactions.userId, userId),
            sql`${interactions.contactId} IN (${sql.join(contactIds.map(id => sql`${id}`), sql`, `)})`
          ))
          .groupBy(interactions.contactId)
      : [];

    // Get calendar events count for each contact (matching by email)
    const contactEmails = contactsData.filter(c => c.primaryEmail).map(c => c.primaryEmail);
    const calendarEventsCountQuery = contactEmails.length > 0
      ? await db
          .select({
            email: sql<string>`LOWER(jsonb_extract_path_text(${calendarEvents.attendees}, 'email'))`,
            eventCount: count(calendarEvents.id).as('eventCount')
          })
          .from(calendarEvents)
          .where(and(
            eq(calendarEvents.userId, userId),
            sql`EXISTS (
              SELECT 1 FROM jsonb_array_elements(${calendarEvents.attendees}) as attendee
              WHERE LOWER(attendee->>'email') IN (${sql.join(contactEmails.map(email => sql`${email?.toLowerCase()}`), sql`, `)})
            )`
          ))
          .groupBy(sql`LOWER(jsonb_extract_path_text(${calendarEvents.attendees}, 'email'))`)
      : [];

    // Get notes count for each contact
    const notesCountQuery = contactIds.length > 0
      ? await db
          .select({
            contactId: notes.contactId,
            notesCount: count(notes.id).as('notesCount'),
            lastNote: sql<string>`(
              SELECT content 
              FROM ${notes} n2 
              WHERE n2.contact_id = ${notes.contactId} 
              ORDER BY n2.created_at DESC 
              LIMIT 1
            )`.as('lastNote')
          })
          .from(notes)
          .where(and(
            eq(notes.userId, userId),
            sql`${notes.contactId} IN (${sql.join(contactIds.map(id => sql`${id}`), sql`, `)})`
          ))
          .groupBy(notes.contactId)
      : [];

    // Create lookup maps
    const interactionsMap = new Map(interactionsCountQuery.map(row => [row.contactId, Number(row.interactionCount)]));
    const eventsMap = new Map(calendarEventsCountQuery.map(row => [row.email, Number(row.eventCount)]));
    const notesMap = new Map(notesCountQuery.map(row => [row.contactId, { 
      count: Number(row.notesCount), 
      lastNote: row.lastNote 
    }]));

    // Combine data
    return contactsData.map(contact => {
      const interactionCount = interactionsMap.get(contact.id) || 0;
      const eventCount = contact.primaryEmail ? (eventsMap.get(contact.primaryEmail.toLowerCase()) || 0) : 0;
      const notesData = notesMap.get(contact.id) || { count: 0, lastNote: null };
      
      return {
        ...contact,
        interactions: interactionCount + eventCount, // Total interactions include both direct interactions and calendar events
        notesCount: notesData.count,
        lastNote: notesData.lastNote,
      };
    });
  }

  async getContact(contactId: string, userId: string): Promise<Contact | null> {
    const db = await getDb();
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
    return contact || null;
  }

  async updateContact(contactId: string, userId: string, data: Partial<Omit<NewContact, 'userId'>>): Promise<void> {
    const db = await getDb();
    await db
      .update(contacts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
  }

  async deleteContact(contactId: string, userId: string): Promise<void> {
    const db = await getDb();
    await db
      .delete(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
  }

  // Notes
  async createNote(contactId: string, userId: string, content: string): Promise<Note> {
    const db = await getDb();
    const [note] = await db
      .insert(notes)
      .values({
        contactId,
        userId,
        content,
      })
      .returning();
    return note!;
  }

  async getNotes(contactId: string, userId: string): Promise<Note[]> {
    const db = await getDb();
    return await db
      .select()
      .from(notes)
      .where(and(eq(notes.contactId, contactId), eq(notes.userId, userId)))
      .orderBy(desc(notes.createdAt));
  }

  async updateNote(noteId: string, userId: string, content: string): Promise<void> {
    const db = await getDb();
    await db
      .update(notes)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  }

  async deleteNote(noteId: string, userId: string): Promise<void> {
    const db = await getDb();
    await db
      .delete(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  }
}

export const contactsStorage = new ContactsStorage();