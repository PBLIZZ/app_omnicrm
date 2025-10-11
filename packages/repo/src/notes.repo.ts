import { eq, and, desc, ilike } from "drizzle-orm";
import { notes, type Note } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { ok, dbError, type DbResult } from "@/lib/utils/result";

/**
 * Notes Repository
 *
 * Pure database operations - no business logic, no validation.
 * All methods return DbResult<T> for consistent error handling.
 */

export class NotesRepository {
  /**
   * List notes for a user with optional contact filtering
   */
  static async listNotes(userId: string, contactId?: string): Promise<DbResult<Note[]>> {
    try {
      const db = await getDb();

      const conditions = [eq(notes.userId, userId)];

      if (contactId) {
        conditions.push(eq(notes.contactId, contactId));
      }

      const rows = await db
        .select()
        .from(notes)
        .where(and(...conditions))
        .orderBy(desc(notes.createdAt));

      return ok(rows);
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to list notes", error);
    }
  }

  /**
   * Get a single note by ID
   */
  static async getNoteById(userId: string, noteId: string): Promise<DbResult<Note | null>> {
    try {
      const db = await getDb();

      const rows = await db
        .select()
        .from(notes)
        .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
        .limit(1);

      return ok(rows.length > 0 && rows[0] ? rows[0] : null);
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to get note by ID", error);
    }
  }

  /**
   * Get notes for a specific contact
   */
  static async getNotesByContactId(userId: string, contactId: string): Promise<DbResult<Note[]>> {
    try {
      const db = await getDb();

      const rows = await db
        .select()
        .from(notes)
        .where(and(eq(notes.userId, userId), eq(notes.contactId, contactId)))
        .orderBy(desc(notes.createdAt));

      return ok(rows);
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to get notes by contact ID", error);
    }
  }

  /**
   * Search notes by content
   */
  static async searchNotes(userId: string, searchTerm: string): Promise<DbResult<Note[]>> {
    try {
      const db = await getDb();

      const rows = await db
        .select()
        .from(notes)
        .where(and(eq(notes.userId, userId), ilike(notes.contentPlain, `%${searchTerm}%`)))
        .orderBy(desc(notes.createdAt));

      return ok(rows);
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to search notes", error);
    }
  }

  /**
   * Create a new note
   */
  static async createNote(data: {
    userId: string;
    contactId?: string | null;
    contentPlain: string;
    contentRich?: unknown;
    tags?: string[];
    piiEntities?: unknown;
    sourceType?: "typed" | "voice" | "upload";
  }): Promise<DbResult<Note>> {
    try {
      const db = await getDb();

      const [newNote] = await db
        .insert(notes)
        .values({
          userId: data.userId,
          contactId: data.contactId ?? null,
          contentPlain: data.contentPlain,
          contentRich: data.contentRich ?? {},
          tags: data.tags ?? [],
          piiEntities: data.piiEntities ?? [],
          sourceType: data.sourceType ?? "typed",
        })
        .returning();

      if (!newNote) {
        return dbError("DB_INSERT_FAILED", "Insert returned no data");
      }

      return ok(newNote);
    } catch (error) {
      return dbError("DB_INSERT_FAILED", "Failed to create note", error);
    }
  }

  /**
   * Update an existing note
   */
  static async updateNote(
    userId: string,
    noteId: string,
    updates: {
      contentPlain?: string;
      contentRich?: unknown;
      tags?: string[];
      piiEntities?: unknown;
    },
  ): Promise<DbResult<Note | null>> {
    try {
      const db = await getDb();

      const [updatedNote] = await db
        .update(notes)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
        .returning();

      return ok(updatedNote ?? null);
    } catch (error) {
      return dbError("DB_UPDATE_FAILED", "Failed to update note", error);
    }
  }

  /**
   * Delete a note
   */
  static async deleteNote(userId: string, noteId: string): Promise<DbResult<boolean>> {
    try {
      const db = await getDb();

      const result = await db
        .delete(notes)
        .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
        .returning({ id: notes.id });

      return ok(result.length > 0);
    } catch (error) {
      return dbError("DB_DELETE_FAILED", "Failed to delete note", error);
    }
  }
}
