import { eq, and, ilike, desc, asc, inArray, count } from "drizzle-orm";
import { contacts, notes, type Contact, type Note } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { ok, err, DbResult, dbError } from "@/lib/utils/result";
import { CreateContactSchema } from "@/server/db/business-schemas";
import { safeParse } from "@/lib/utils/zod-helpers";
import { z } from "zod";

// Only export types that actually transform/extend base types
export type ContactWithNotes = Contact & { notes: Note[] };

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
  ): Promise<DbResult<{ items: Contact[]; total: number }>> {
    try {
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

      return ok({ items, total });
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to list contacts",
        details: error,
      });
    }
  }

  /**
   * Get a single contact by ID
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

      if (rows.length === 0) {
        return ok(null);
      }

      return ok(rows[0] ?? null);
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to get contact",
        details: error,
      });
    }
  }

  /**
   * Get contact with associated notes
   */
  static async getContactWithNotes(
    userId: string,
    contactId: string,
  ): Promise<DbResult<ContactWithNotes | null>> {
    try {
      const db = await getDb();

      // Get contact
      const contactRows = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
        .limit(1);

      if (contactRows.length === 0) {
        return ok(null);
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
      } as ContactWithNotes;

      return ok(contactWithNotes);
    } catch (error) {
      return dbError(
        "DB_QUERY_FAILED",
        error instanceof Error ? error.message : "Failed to get contact with notes",
        error,
      );
    }
  }

  /**
   * Create a new contact
   */
  static async createContact(input: unknown): Promise<DbResult<Contact>> {
    try {
      const db = await getDb();

      // Validate and narrow the input type using Zod
      const dataValidation = safeParse(
        CreateContactSchema.extend({ userId: z.string().uuid() }),
        input,
      );

      if (!dataValidation.success) {
        return err({
          code: "VALIDATION_ERROR",
          message: `Invalid contact data: ${dataValidation.error.issues.map((i: { message: string }) => i.message).join(", ")}`,
        });
      }

      const data = dataValidation.data as {
        userId: string;
        displayName: string;
        primaryEmail?: string | null;
        primaryPhone?: string | null;
        photoUrl?: string | null;
        source?: string | null;
        lifecycleStage?: string | null;
        tags?: string[] | null;
        confidenceScore?: string | null;
      };

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

      if (!newContact) {
        return err({
          code: "DB_INSERT_FAILED",
          message: "Failed to create contact - no data returned",
        });
      }

      return ok(newContact);
    } catch (error) {
      return err({
        code: "DB_INSERT_FAILED",
        message: error instanceof Error ? error.message : "Failed to create contact",
        details: error,
      });
    }
  }

  /**
   * Update an existing contact
   */
  static async updateContact(
    userId: string,
    contactId: string,
    input: unknown,
  ): Promise<DbResult<Contact | null>> {
    try {
      const db = await getDb();

      // Validate and narrow the input type using Zod
      const dataValidation = safeParse(CreateContactSchema.partial(), input);

      if (!dataValidation.success) {
        return err({
          code: "VALIDATION_ERROR",
          message: `Invalid update data: ${dataValidation.error.issues.map((i: { message: string }) => i.message).join(", ")}`,
        });
      }

      const data = dataValidation.data;

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
        ...(data.confidenceScore !== undefined && {
          confidenceScore: data.confidenceScore ?? null,
        }),
      };

      const [updatedContact] = await db
        .update(contacts)
        .set(updateValues)
        .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
        .returning();

      return ok(updatedContact || null);
    } catch (error) {
      return err({
        code: "DB_UPDATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to update contact",
        details: error,
      });
    }
  }

  /**
   * Delete a contact
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
      return dbError(
        "DB_DELETE_FAILED",
        error instanceof Error ? error.message : "Failed to delete contact",
        error,
      );
    }
  }

  /**
   * Check if contact exists by email
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

      return ok(rows.length === 0 ? null : (rows[0] ?? null));
    } catch (error) {
      return dbError(
        "DB_QUERY_FAILED",
        error instanceof Error ? error.message : "Failed to find contact by email",
        error,
      );
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
      return dbError(
        "DB_QUERY_FAILED",
        error instanceof Error ? error.message : "Failed to get contacts by IDs",
        error,
      );
    }
  }

  /**
   * Bulk delete contacts by IDs
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

      // Count contacts to delete first
      const countRows = await db
        .select({ n: count() })
        .from(contacts)
        .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)))
        .limit(1);
      const n = countRows[0]?.n ?? 0;

      if (n === 0) {
        return ok(0);
      }

      // Delete the contacts
      const result = await db
        .delete(contacts)
        .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

      return ok(result.count || n);
    } catch (error) {
      return dbError(
        "DB_DELETE_FAILED",
        error instanceof Error ? error.message : "Failed to bulk delete contacts",
        error,
      );
    }
  }

  /**
   * Count contacts for a user with optional search filter
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
        .where(and(...conditions))
        .limit(1);

      return ok(result[0]?.count ?? 0);
    } catch (error) {
      return dbError(
        "DB_QUERY_FAILED",
        error instanceof Error ? error.message : "Failed to count contacts",
        error,
      );
    }
  }
}
