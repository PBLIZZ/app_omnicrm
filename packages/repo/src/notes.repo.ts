import { eq, and, desc, ilike } from "drizzle-orm";
import { Note, CreateNote, notes } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { ok, err, DbResult } from "@/lib/utils/result";
import { z } from "zod";

export class NotesRepository {
  /**
   * List notes for a user with optional contact filtering
   */
  static async listNotes(userId: string, contactId?: string): Promise<DbResult<Note[]>> {
    try {
      const db = await getDb();

      // Build conditions array
      const conditions = [eq(notes.userId, userId)];

      if (contactId) {
        conditions.push(eq(notes.contactId, contactId));
      }

      const query = db
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
        .where(and(...conditions))
        .orderBy(desc(notes.createdAt));

      const rows = await query;

      return ok(rows.map((row) => row));
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to list notes",
        details: error,
      });
    }
  }

  /**
   * Get a single note by ID
   */
  static async getNoteById(userId: string, noteId: string): Promise<DbResult<Note | null>> {
    try {
      const db = await getDb();

      const rows = await db
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
        .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
        .limit(1);

      return ok(rows[0] || null);
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to get note by ID",
        details: error,
      });
    }
  }

  /**
   * Get notes for a specific contact
   */
  static async getNotesByContactId(
    userId: string,
    contactId: string,
  ): Promise<DbResult<Note[]>> {
    try {
      const db = await getDb();

      const rows = await db
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

      return ok(rows.map((row) => row));
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to get notes by contact ID",
        details: error,
      });
    }
  }

  /**
   * Search notes by content
   */
  static async searchNotes(userId: string, searchTerm: string): Promise<DbResult<Note[]>> {
    try {
      const db = await getDb();

      const rows = await db
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
        .where(and(eq(notes.userId, userId), ilike(notes.content, `%${searchTerm}%`)))
        .orderBy(desc(notes.createdAt));

      return ok(rows.map((row) => row));
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to search notes",
        details: error,
      });
    }
  }

  /**
   * Create a new note
   */
  static async createNote(userId: string, input: unknown): Promise<DbResult<Note>> {
    try {
      const db = await getDb();

      // Validate input data
      const createNoteSchema = z.object({
        content: z.string(),
        contactId: z.string().uuid().optional(),
        title: z.string().optional(),
      });

      const parseResult = createNoteSchema.safeParse(input);

      if (!parseResult.success) {
        return err({
          code: "VALIDATION_ERROR",
          message: `Invalid note data: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
        });
      }

      const data = parseResult.data;

      const [newNote] = await db
        .insert(notes)
        .values({
          userId,
          contactId: data.contactId ?? null,
          title: data.title ?? null,
          content: data.content,
        })
        .returning({
          id: notes.id,
          userId: notes.userId,
          contactId: notes.contactId,
          title: notes.title,
          content: notes.content,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
        });

      if (!newNote) {
        return err({
          code: "DB_INSERT_FAILED",
          message: "Failed to create note - no data returned",
        });
      }

      return ok(newNote);
    } catch (error) {
      return err({
        code: "DB_INSERT_FAILED",
        message: error instanceof Error ? error.message : "Failed to create note",
        details: error,
      });
    }
  }

  /**
   * Update an existing note
   */
  static async updateNote(
    userId: string,
    noteId: string,
    input: unknown,
  ): Promise<DbResult<Note | null>> {
    try {
      const db = await getDb();

      // Validate input data
      const updateNoteSchema = z.object({
        content: z.string().optional(),
        title: z.string().optional(),
      });

      const parseResult = updateNoteSchema.safeParse(input);

      if (!parseResult.success) {
        return err({
          code: "VALIDATION_ERROR",
          message: `Invalid update data: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
        });
      }

      const data = parseResult.data;

      // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
      const updateValues = {
        updatedAt: new Date(),
        ...(data.title !== undefined && { title: data.title ?? null }),
        ...(data.content !== undefined && { content: data.content }),
      };

      const [updatedNote] = await db
        .update(notes)
        .set(updateValues)
        .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
        .returning({
          id: notes.id,
          userId: notes.userId,
          contactId: notes.contactId,
          title: notes.title,
          content: notes.content,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
        });

      return ok(updatedNote || null);
    } catch (error) {
      return err({
        code: "DB_UPDATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to update note",
        details: error,
      });
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
      return err({
        code: "DB_DELETE_FAILED",
        message: error instanceof Error ? error.message : "Failed to delete note",
        details: error,
      });
    }
  }

  /**
   * Bulk create notes (useful for AI-generated insights)
   */
  static async bulkCreateNotes(
    userId: string,
    data: CreateNote[],
  ): Promise<DbResult<Note[]>> {
    try {
      const db = await getDb();

      const newNotes = await db
        .insert(notes)
        .values(
          data.map((item) => ({
            userId,
            contactId: item.contactId ?? null,
            title: item.title ?? null,
            content: item.content,
          })),
        )
        .returning({
          id: notes.id,
          userId: notes.userId,
          contactId: notes.contactId,
          title: notes.title,
          content: notes.content,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
        });

      return ok(newNotes.map((row) => row));
    } catch (error) {
      return err({
        code: "DB_INSERT_FAILED",
        message: error instanceof Error ? error.message : "Failed to bulk create notes",
        details: error,
      });
    }
  }
}
