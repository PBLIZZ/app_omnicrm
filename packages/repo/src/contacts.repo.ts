import { eq, and, ilike, desc, asc, inArray, count, sql } from "drizzle-orm";
import { contacts, notes, type Contact, type CreateContact } from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

/**
 * Contacts Repository
 *
 * Pure database operations - no business logic, no validation.
 * Uses DbClient constructor injection pattern.
 * Throws errors on failure - no Result wrapper.
 */

export class ContactsRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * List contacts with pagination and search
   */
  async listContacts(
    userId: string,
    params: {
      search?: string;
      sort?: "displayName" | "createdAt" | "updatedAt";
      order?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{ items: Contact[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;
    const sortKey = params.sort ?? "updatedAt";
    const sortDir = params.order === "desc" ? desc : asc;

    const conditions = [eq(contacts.userId, userId)];
    if (params.search) {
      conditions.push(ilike(contacts.displayName, `%${params.search}%`));
    }

    // Count total
    const countResult = await this.db
      .select({ count: count() })
      .from(contacts)
      .where(and(...conditions));

    const totalRow = countResult[0];
    const total = totalRow?.count ?? 0;

    // Fetch items
    const sortColumnMap = {
      displayName: contacts.displayName,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    } as const;

    const items = await this.db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(sortDir(sortColumnMap[sortKey]))
      .limit(pageSize)
      .offset(offset);

    return { items, total };
  }

  /**
   * List contacts with last note preview using single JOIN query
   * Optimized to avoid N+1 query problem
   */
  async listContactsWithLastNote(
    userId: string,
    params: {
      search?: string;
      sort?: "displayName" | "createdAt" | "updatedAt";
      order?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{ items: (Contact & { lastNote: string | null })[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;
    const sortKey = params.sort ?? "updatedAt";
    const sortDir = params.order === "desc" ? desc : asc;

    const conditions = [eq(contacts.userId, userId)];
    if (params.search) {
      conditions.push(ilike(contacts.displayName, `%${params.search}%`));
    }

    // Count total
    const countResult = await this.db
      .select({ count: count() })
      .from(contacts)
      .where(and(...conditions));

    const totalRow = countResult[0];
    const total = totalRow?.count ?? 0;

    // Fetch items with last note preview using LEFT JOIN
    const sortColumnMap = {
      displayName: contacts.displayName,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    } as const;

    const items = await this.db
      .select({
        // All contact fields
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        photoUrl: contacts.photoUrl,
        source: contacts.source,
        lifecycleStage: contacts.lifecycleStage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        dateOfBirth: contacts.dateOfBirth,
        emergencyContactName: contacts.emergencyContactName,
        emergencyContactPhone: contacts.emergencyContactPhone,
        clientStatus: contacts.clientStatus,
        referralSource: contacts.referralSource,
        address: contacts.address,
        healthContext: contacts.healthContext,
        preferences: contacts.preferences,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
        // Last note preview
        lastNote: sql<string | null>`LEFT(notes.content_plain, 500)`,
      })
      .from(contacts)
      .leftJoin(
        notes,
        and(
          eq(notes.contactId, contacts.id),
          eq(notes.userId, userId),
          sql`notes.created_at = (
            SELECT MAX(n2.created_at) 
            FROM notes n2 
            WHERE n2.contact_id = contacts.id 
            AND n2.user_id = ${userId}
          )`,
        ),
      )
      .where(and(...conditions))
      .orderBy(sortDir(sortColumnMap[sortKey]))
      .limit(pageSize)
      .offset(offset);

    return { items, total };
  }

  /**
   * Get single contact by ID
   */
  async getContactById(userId: string, contactId: string): Promise<Contact | null> {
    const rows = await this.db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .limit(1);

    return rows.length > 0 && rows[0] ? rows[0] : null;
  }

  /**
   * Create new contact
   */
  async createContact(data: CreateContact): Promise<Contact> {
    const [contact] = await this.db.insert(contacts).values(data).returning();

    if (!contact) {
      throw new Error("Insert returned no data");
    }

    return contact;
  }

  /**
   * Update existing contact
   * Note: Accepts Record for flexibility with exactOptionalPropertyTypes
   */
  async updateContact(
    userId: string,
    contactId: string,
    updates: Record<string, unknown>,
  ): Promise<Contact | null> {
    const [contact] = await this.db
      .update(contacts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
      .returning();

    return contact ?? null;
  }

  /**
   * Delete contact
   */
  async deleteContact(userId: string, contactId: string): Promise<boolean> {
    const result = await this.db
      .delete(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .returning({ id: contacts.id });

    return result.length > 0;
  }

  /**
   * Find contact by email
   */
  async findContactByEmail(userId: string, email: string): Promise<Contact | null> {
    const rows = await this.db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, email)))
      .limit(1);

    return rows.length > 0 && rows[0] ? rows[0] : null;
  }

  /**
   * Get multiple contacts by IDs
   */
  async getContactsByIds(userId: string, contactIds: string[]): Promise<Contact[]> {
    if (contactIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

    return rows;
  }

  /**
   * Bulk delete contacts
   */
  async deleteContactsByIds(userId: string, contactIds: string[]): Promise<number> {
    if (contactIds.length === 0) {
      return 0;
    }

    const result = await this.db
      .delete(contacts)
      .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

    return result.count ?? 0;
  }

  /**
   * Count contacts with optional search
   */
  async countContacts(userId: string, search?: string): Promise<number> {
    const conditions = [eq(contacts.userId, userId)];

    if (search) {
      conditions.push(ilike(contacts.displayName, `%${search}%`));
    }

    const result = await this.db
      .select({ count: count() })
      .from(contacts)
      .where(and(...conditions));

    const row = result[0];
    return row?.count ?? 0;
  }
}

export function createContactsRepository(db: DbClient): ContactsRepository {
  return new ContactsRepository(db);
}
