// Contacts storage layer
import { getDb } from "@/server/db/client";
import { contacts, notes } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
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
    return contact;
  }

  async getContacts(userId: string): Promise<Contact[]> {
    const db = await getDb();
    return await db
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
    return note;
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