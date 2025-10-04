import { eq, and, ilike, desc, asc, inArray, count } from "drizzle-orm";
import { contacts, type Contact } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { ok, dbError, type DbResult } from "@/lib/utils/result";

/**
 * Contacts Repository
 *
 * Pure database operations - no business logic, no validation.
 * All methods return DbResult<T> for consistent error handling.
 */

export class ContactsRepository {
  /**
   * List contacts with pagination and search
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
  ): Promise<DbResult<{ items: Contact[]; total: number }>> {
    try {
      const db = await getDb();
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
      const countResult = await db
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

      const items = await db
        .select()
        .from(contacts)
        .where(and(...conditions))
        .orderBy(sortDir(sortColumnMap[sortKey]))
        .limit(pageSize)
        .offset(offset);

      return ok({ items, total });
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to list contacts", error);
    }
  }

  /**
   * Get single contact by ID
   */
  static async getContactById(
    userId: string,
    contactId: string,
  ): Promise<DbResult<Contact | null>> {
    try {
      const db = await getDb();
      const rows = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
        .limit(1);

      return ok(rows.length > 0 && rows[0] ? rows[0] : null);
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to get contact", error);
    }
  }

  /**
   * Create new contact
   */
  static async createContact(data: {
    userId: string;
    displayName: string;
    primaryEmail?: string | null;
    primaryPhone?: string | null;
    photoUrl?: string | null;
    source?: string | null;
    lifecycleStage?: string | null;
    tags?: string[] | null;
    confidenceScore?: string | null;
    dateOfBirth?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    clientStatus?: string | null;
    referralSource?: string | null;
    address?: unknown;
    healthContext?: unknown;
    preferences?: unknown;
  }): Promise<DbResult<Contact>> {
    try {
      const db = await getDb();
      const [contact] = await db.insert(contacts).values(data).returning();

      if (!contact) {
        return dbError("DB_INSERT_FAILED", "Insert returned no data");
      }

      return ok(contact);
    } catch (error) {
      return dbError("DB_INSERT_FAILED", "Failed to create contact", error);
    }
  }

  /**
   * Update existing contact
   */
  static async updateContact(
    userId: string,
    contactId: string,
    updates: {
      displayName?: string;
      primaryEmail?: string | null;
      primaryPhone?: string | null;
      photoUrl?: string | null;
      source?: string | null;
      lifecycleStage?: string | null;
      tags?: string[] | null;
      confidenceScore?: string | null;
      dateOfBirth?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      clientStatus?: string | null;
      referralSource?: string | null;
      address?: unknown;
      healthContext?: unknown;
      preferences?: unknown;
    },
  ): Promise<DbResult<Contact | null>> {
    try {
      const db = await getDb();
      const [contact] = await db
        .update(contacts)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
        .returning();

      return ok(contact ?? null);
    } catch (error) {
      return dbError("DB_UPDATE_FAILED", "Failed to update contact", error);
    }
  }

  /**
   * Delete contact
   */
  static async deleteContact(userId: string, contactId: string): Promise<DbResult<boolean>> {
    try {
      const db = await getDb();
      const result = await db
        .delete(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
        .returning({ id: contacts.id });

      return ok(result.length > 0);
    } catch (error) {
      return dbError("DB_DELETE_FAILED", "Failed to delete contact", error);
    }
  }

  /**
   * Find contact by email
   */
  static async findContactByEmail(
    userId: string,
    email: string,
  ): Promise<DbResult<Contact | null>> {
    try {
      const db = await getDb();
      const rows = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, email)))
        .limit(1);

      return ok(rows.length > 0 && rows[0] ? rows[0] : null);
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to find contact by email", error);
    }
  }

  /**
   * Get multiple contacts by IDs
   */
  static async getContactsByIds(
    userId: string,
    contactIds: string[],
  ): Promise<DbResult<Contact[]>> {
    try {
      if (contactIds.length === 0) {
        return ok([]);
      }

      const db = await getDb();
      const rows = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

      return ok(rows);
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to get contacts by IDs", error);
    }
  }

  /**
   * Bulk delete contacts
   */
  static async deleteContactsByIds(
    userId: string,
    contactIds: string[],
  ): Promise<DbResult<number>> {
    try {
      if (contactIds.length === 0) {
        return ok(0);
      }

      const db = await getDb();
      const result = await db
        .delete(contacts)
        .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

      return ok(result.count ?? 0);
    } catch (error) {
      return dbError("DB_DELETE_FAILED", "Failed to bulk delete contacts", error);
    }
  }

  /**
   * Count contacts with optional search
   */
  static async countContacts(userId: string, search?: string): Promise<DbResult<number>> {
    try {
      const db = await getDb();
      const conditions = [eq(contacts.userId, userId)];

      if (search) {
        conditions.push(ilike(contacts.displayName, `%${search}%`));
      }

      const result = await db
        .select({ count: count() })
        .from(contacts)
        .where(and(...conditions));

      const row = result[0];
      return ok(row?.count ?? 0);
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to count contacts", error);
    }
  }
}
