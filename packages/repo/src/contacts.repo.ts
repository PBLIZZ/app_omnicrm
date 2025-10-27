import { eq, and, ilike, desc, asc, inArray, count, sql, type SQL } from "drizzle-orm";
import {
  contacts,
  notes,
  contactTags,
  tags,
  type Contact,
  type CreateContact,
} from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

/**
 * Contacts Repository
 *
 * Pure database operations - no business logic, no validation.
 * Uses DbClient constructor injection pattern.
 * Throws errors on failure - no Result wrapper.
 */

interface ListParams {
  search?: string;
  sort?: "displayName" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

interface ContactWithDetails extends Contact {
  lastNote: string | null;
  tags: Array<{ id: string; name: string; color: string; category: string }>;
}

export class ContactsRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * List contacts with pagination and search
   */
  async listContacts(
    userId: string,
    params: ListParams = {},
  ): Promise<{ items: Contact[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;
    const sortKey = params.sort ?? "updatedAt";
    const sortDir = params.order === "desc" ? desc : asc;

    const conditions: SQL[] = [eq(contacts.userId, userId)];
    if (params.search) {
      conditions.push(
        sql`(${contacts.displayName} ILIKE ${`%${params.search}%`} OR ${contacts.primaryEmail} ILIKE ${`%${params.search}%`})`,
      );
    }

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const countResult = await this.db.select({ value: count() }).from(contacts).where(whereClause);

    const totalRow = countResult[0];
    if (!totalRow) {
      throw new Error("Count query returned no rows");
    }
    const total = typeof totalRow["value"] === "number" ? totalRow["value"] : 0;

    // Fetch items
    const sortColumnMap = {
      displayName: contacts.displayName,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    } as const;

    const items = await this.db
      .select()
      .from(contacts)
      .where(whereClause)
      .orderBy(sortDir(sortColumnMap[sortKey]))
      .limit(pageSize)
      .offset(offset);

    return { items, total };
  }

  /**
   * List contacts with last note preview and tags using single JOIN query
   * Optimized to avoid N+1 query problem
   */
  async listContactsWithLastNote(
    userId: string,
    params: ListParams = {},
  ): Promise<{ items: ContactWithDetails[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;
    const sortKey = params.sort ?? "updatedAt";
    const sortDir = params.order === "desc" ? desc : asc;

    const conditions: SQL[] = [eq(contacts.userId, userId)];
    if (params.search) {
      conditions.push(
        sql`(${contacts.displayName} ILIKE ${`%${params.search}%`} OR ${contacts.primaryEmail} ILIKE ${`%${params.search}%`})`,
      );
    }

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const countResult = await this.db.select({ value: count() }).from(contacts).where(whereClause);

    const totalRow = countResult[0];
    if (!totalRow) {
      throw new Error("Count query returned no rows");
    }
    const total = typeof totalRow["value"] === "number" ? totalRow["value"] : 0;

    // Fetch items with last note preview and tags using LEFT JOIN
    const sortColumnMap = {
      displayName: contacts.displayName,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    } as const;

    // Build subquery for latest note per contact
    const latestNoteCondition = sql`notes.created_at = (
      SELECT MAX(n2.created_at)
      FROM notes n2
      WHERE n2.contact_id = contacts.id
      AND n2.user_id = ${userId}
    )`;

    const rawItems = await this.db
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
        // Tags array aggregation
        tagsJson: sql<string>`
          COALESCE(
            json_agg(
              json_build_object(
                'id', ${tags.id},
                'name', ${tags.name},
                'color', ${tags.color},
                'category', ${tags.category}
              )
            ) FILTER (WHERE ${tags.id} IS NOT NULL),
            '[]'::json
          )
        `,
      })
      .from(contacts)
      .leftJoin(
        notes,
        and(eq(notes.contactId, contacts.id), eq(notes.userId, userId), latestNoteCondition),
      )
      .leftJoin(contactTags, eq(contactTags.contactId, contacts.id))
      .leftJoin(tags, eq(tags.id, contactTags.tagId))
      .where(whereClause)
      .groupBy(contacts.id, notes.contentPlain)
      .orderBy(sortDir(sortColumnMap[sortKey]))
      .limit(pageSize)
      .offset(offset);

    // Transform raw items to typed ContactWithDetails
    const items: ContactWithDetails[] = rawItems.map((item) => {
      const tagsJsonValue = item["tagsJson"];
      const parsedTags =
        typeof tagsJsonValue === "string"
          ? (JSON.parse(tagsJsonValue) as Array<{
              id: string;
              name: string;
              color: string;
              category: string;
            }>)
          : [];

      return {
        id: item.id,
        userId: item.userId,
        displayName: item.displayName,
        primaryEmail: item.primaryEmail,
        primaryPhone: item.primaryPhone,
        photoUrl: item.photoUrl,
        source: item.source,
        lifecycleStage: item.lifecycleStage,
        confidenceScore: item.confidenceScore,
        dateOfBirth: item.dateOfBirth,
        emergencyContactName: item.emergencyContactName,
        emergencyContactPhone: item.emergencyContactPhone,
        clientStatus: item.clientStatus,
        referralSource: item.referralSource,
        address: item.address,
        healthContext: item.healthContext,
        preferences: item.preferences,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        lastNote: item.lastNote,
        tags: parsedTags,
      };
    });

    return { items, total };
  }

  /**
   * Get single contact by ID
   */
  async getContactById(userId: string, contactId: string): Promise<Contact | null> {
    const whereClause = and(eq(contacts.userId, userId), eq(contacts.id, contactId));

    const rows = await this.db.select().from(contacts).where(whereClause).limit(1);

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
    const whereClause = and(eq(contacts.id, contactId), eq(contacts.userId, userId));

    const [contact] = await this.db
      .update(contacts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(whereClause)
      .returning();

    return contact ?? null;
  }

  /**
   * Delete contact
   */
  async deleteContact(userId: string, contactId: string): Promise<boolean> {
    const whereClause = and(eq(contacts.userId, userId), eq(contacts.id, contactId));

    const result = await this.db.delete(contacts).where(whereClause).returning({ id: contacts.id });

    return result.length > 0;
  }

  /**
   * Find contact by email
   */
  async findContactByEmail(userId: string, email: string): Promise<Contact | null> {
    const whereClause = and(eq(contacts.userId, userId), eq(contacts.primaryEmail, email));

    const rows = await this.db.select().from(contacts).where(whereClause).limit(1);

    return rows.length > 0 && rows[0] ? rows[0] : null;
  }

  /**
   * Get multiple contacts by IDs
   */
  async getContactsByIds(userId: string, contactIds: string[]): Promise<Contact[]> {
    if (contactIds.length === 0) {
      return [];
    }

    const whereClause = and(eq(contacts.userId, userId), inArray(contacts.id, contactIds));

    const rows = await this.db.select().from(contacts).where(whereClause);

    return rows;
  }

  /**
   * Bulk delete contacts
   */
  async deleteContactsByIds(userId: string, contactIds: string[]): Promise<number> {
    if (contactIds.length === 0) {
      return 0;
    }

    const whereClause = and(eq(contacts.userId, userId), inArray(contacts.id, contactIds));

    const result = await this.db.delete(contacts).where(whereClause);

    // Access count using bracket notation for index signature compliance
    const deletedCount = result["count"];
    return typeof deletedCount === "number" ? deletedCount : 0;
  }

  /**
   * Count contacts with optional search
   */
  async countContacts(userId: string, search?: string): Promise<number> {
    const conditions: SQL[] = [eq(contacts.userId, userId)];

    if (search) {
      conditions.push(ilike(contacts.displayName, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await this.db.select({ value: count() }).from(contacts).where(whereClause);

    const row = result[0];
    if (!row) {
      return 0;
    }
    return typeof row["value"] === "number" ? row["value"] : 0;
  }
}

export function createContactsRepository(db: DbClient): ContactsRepository {
  return new ContactsRepository(db);
}
