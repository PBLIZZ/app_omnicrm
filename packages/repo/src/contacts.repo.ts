import { eq, and, ilike, desc, asc, inArray, sql, count } from "drizzle-orm";
import { contacts, notes, type Contact, type CreateContact, type Note } from "@/server/db/schema";
import { getDb } from "./db";

export type ContactDTO = Contact;
export type CreateContactDTO = CreateContact;
export type UpdateContactDTO = Partial<CreateContact> & { id: string };
export type ContactWithNotesDTO = Contact & { notes: Note[] };

export class ContactsRepository {
  /**
   * List contacts for a user with pagination, search, and sorting
   */
  static async listContacts(
    userId: string,
    params: {
      search?: string;
      sort?: "displayName" | "createdAt" | "updatedAt";
      order?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{ items: ContactDTO[]; total: number }> {
    const db = await getDb();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;
    const sortKey = params.sort ?? "updatedAt";
    const sortDir = params.order === "desc" ? desc : asc;

    // Build conditions array
    const conditions = [eq(contacts.userId, userId)];

    if (params.search) {
      conditions.push(ilike(contacts.displayName, `%${params.search}%`));
    }

    // Count total using Drizzle's typed count helper
    const countResult = await db
      .select({ count: count() })
      .from(contacts)
      .where(and(...conditions));

    const total = countResult[0]?.count ?? 0;

    // Main query with dynamic sort and limit/offset
    const sortColumnMap = {
      displayName: contacts.displayName,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    } as const;

    const orderByClause = sortDir(sortColumnMap[sortKey] ?? contacts.updatedAt);

    const query = db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(offset);

    const rows = await query;

    // Transform DB rows to DTOs
    const items = rows;

    return { items, total };
  }

  /**
   * Get a single contact by ID
   */
  static async getContactById(userId: string, contactId: string): Promise<ContactDTO | null> {
    const db = await getDb();

    const rows = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * Get contact with associated notes
   */
  static async getContactWithNotes(
    userId: string,
    contactId: string,
  ): Promise<ContactWithNotesDTO | null> {
    const db = await getDb();

    // Get contact
    const contactRows = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .limit(1);

    if (contactRows.length === 0) {
      return null;
    }

    // Get associated notes
    const noteRows = await db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.contactId, contactId)))
      .orderBy(desc(notes.createdAt));

    const contactWithNotes = {
      ...contactRows[0],
      notes: noteRows,
    };

    return contactWithNotes;
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
      photoUrl: data.photoUrl ?? null,
      source: data.source ?? null,
      lifecycleStage: data.lifecycleStage ?? null,
      tags: data.tags ?? null,
      confidenceScore: data.confidenceScore ?? null,
    };

    const [newContact] = await db.insert(contacts).values(insertValues).returning();

    return newContact;
  }

  /**
   * Update an existing contact
   */
  static async updateContact(
    userId: string,
    contactId: string,
    data: UpdateContactDTO,
  ): Promise<ContactDTO | null> {
    const db = await getDb();

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const updateValues = {
      updatedAt: new Date(),
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      ...(data.primaryEmail !== undefined && { primaryEmail: data.primaryEmail ?? null }),
      ...(data.primaryPhone !== undefined && { primaryPhone: data.primaryPhone ?? null }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl ?? null }),
      ...(data.source !== undefined && { source: data.source ?? null }),
      ...(data.lifecycleStage !== undefined && { lifecycleStage: data.lifecycleStage ?? null }),
      ...(data.tags !== undefined && { tags: data.tags ?? null }),
      ...(data.confidenceScore !== undefined && { confidenceScore: data.confidenceScore ?? null }),
    };

    const [updatedContact] = await db
      .update(contacts)
      .set(updateValues)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .returning();

    if (!updatedContact) {
      return null;
    }

    return updatedContact;
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
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, email)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
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
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

    return rows;
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
    const result = await db
      .delete(contacts)
      .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

    return result.count || n;
  }

  /**
   * Count contacts for a user with optional search filter
   */
  static async countContacts(userId: string, search?: string): Promise<number> {
    const db = await getDb();

    const conditions = [eq(contacts.userId, userId)];
    if (search) {
      conditions.push(ilike(contacts.displayName, `%${search}%`));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(and(...conditions))
      .limit(1);

    return result[0]?.count ?? 0;
  }
}
