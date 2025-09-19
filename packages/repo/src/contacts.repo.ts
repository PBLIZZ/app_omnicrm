import { eq, and, ilike, desc, inArray, sql } from "drizzle-orm";
import { contacts, notes } from "./schema";
import { getDb } from "./db";
import type {
  ContactDTO,
  CreateContactDTO,
  UpdateContactDTO,
  ContactWithNotesDTO,
} from "@omnicrm/contracts";
import { ContactDTOSchema, ContactWithNotesDTOSchema } from "@omnicrm/contracts";

export class ContactsRepository {
  /**
   * List contacts for a user with optional search filtering
   */
  static async listContacts(userId: string, search?: string): Promise<ContactDTO[]> {
    const db = await getDb();

    // Build conditions array
    const conditions = [eq(contacts.userId, userId)];

    if (search) {
      conditions.push(ilike(contacts.displayName, `%${search}%`));
    }

    const query = db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        stage: contacts.stage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        slug: contacts.slug,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(and(...conditions))
      .orderBy(desc(contacts.updatedAt));

    const rows = await query;

    // Validate and transform DB rows to DTOs
    return rows.map(row => ContactDTOSchema.parse(row));
  }

  /**
   * Get a single contact by ID
   */
  static async getContactById(userId: string, contactId: string): Promise<ContactDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        stage: contacts.stage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        slug: contacts.slug,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return ContactDTOSchema.parse(rows[0]);
  }

  /**
   * Get a single contact by slug
   */
  static async getBySlug(userId: string, slug: string): Promise<ContactDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        stage: contacts.stage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        slug: contacts.slug,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.slug, slug)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return ContactDTOSchema.parse(rows[0]);
  }

  /**
   * Get contact with associated notes
   */
  static async getContactWithNotes(userId: string, contactId: string): Promise<ContactWithNotesDTO | null> {
    const db = await getDb();

    // Get contact
    const contactRows = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        stage: contacts.stage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        slug: contacts.slug,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .limit(1);

    if (contactRows.length === 0) {
      return null;
    }

    // Get associated notes
    const noteRows = await db
      .select({
        id: notes.id,
        userId: notes.userId,
        contactId: notes.contactId,
        title: notes.title,
        content: notes.content,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.contactId, contactId)))
      .orderBy(desc(notes.createdAt));

    const contactWithNotes = {
      ...contactRows[0],
      notes: noteRows,
    };

    return ContactWithNotesDTOSchema.parse(contactWithNotes);
  }

  /**
   * Create a new contact
   */
  static async createContact(data: CreateContactDTO & { userId: string }): Promise<ContactDTO> {
    const db = await getDb();

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const insertValues = {
      userId: data.userId,
      displayName: data.displayName,
      primaryEmail: data.primaryEmail ?? null,
      primaryPhone: data.primaryPhone ?? null,
      source: data.source ?? null,
      stage: data.stage ?? null,
      tags: data.tags ?? null,
      confidenceScore: data.confidenceScore ?? null,
      slug: data.slug ?? null,
    };

    const [newContact] = await db
      .insert(contacts)
      .values(insertValues)
      .returning({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        stage: contacts.stage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        slug: contacts.slug,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      });

    return ContactDTOSchema.parse(newContact);
  }

  /**
   * Update an existing contact
   */
  static async updateContact(
    userId: string,
    contactId: string,
    data: UpdateContactDTO
  ): Promise<ContactDTO | null> {
    const db = await getDb();

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const updateValues = {
      updatedAt: new Date(),
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      ...(data.primaryEmail !== undefined && { primaryEmail: data.primaryEmail ?? null }),
      ...(data.primaryPhone !== undefined && { primaryPhone: data.primaryPhone ?? null }),
      ...(data.source !== undefined && { source: data.source ?? null }),
      ...(data.stage !== undefined && { stage: data.stage ?? null }),
      ...(data.tags !== undefined && { tags: data.tags ?? null }),
      ...(data.confidenceScore !== undefined && { confidenceScore: data.confidenceScore ?? null }),
      ...(data.slug !== undefined && { slug: data.slug ?? null }),
    };

    const [updatedContact] = await db
      .update(contacts)
      .set(updateValues)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .returning({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        stage: contacts.stage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        slug: contacts.slug,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      });

    if (!updatedContact) {
      return null;
    }

    return ContactDTOSchema.parse(updatedContact);
  }

  /**
   * Delete a contact
   */
  static async deleteContact(userId: string, contactId: string): Promise<boolean> {
    const db = await getDb();

    const result = await db
      .delete(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)));

    return result.length > 0;
  }

  /**
   * Check if contact exists by email
   */
  static async findContactByEmail(userId: string, email: string): Promise<ContactDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        stage: contacts.stage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        slug: contacts.slug,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, email)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return ContactDTOSchema.parse(rows[0]);
  }

  /**
   * Get multiple contacts by IDs
   */
  static async getContactsByIds(userId: string, contactIds: string[]): Promise<ContactDTO[]> {
    if (contactIds.length === 0) {
      return [];
    }

    const db = await getDb();

    const rows = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        stage: contacts.stage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        slug: contacts.slug,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

    return rows.map(row => ContactDTOSchema.parse(row));
  }

  /**
   * Bulk delete contacts by IDs
   */
  static async deleteContactsByIds(userId: string, contactIds: string[]): Promise<number> {
    if (contactIds.length === 0) {
      return 0;
    }

    const db = await getDb();

    // Count contacts to delete first
    const countRows = await db
      .select({ n: sql<number>`count(*)` })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)))
      .limit(1);
    const n = countRows[0]?.n ?? 0;

    if (n === 0) {
      return 0;
    }

    // Delete the contacts
    await db.delete(contacts).where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

    return n;
  }
}