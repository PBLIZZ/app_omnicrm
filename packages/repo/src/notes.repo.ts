import { eq, and, desc, ilike } from "drizzle-orm";
import { Note, notes } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { ok, err, DbResult } from "@/lib/utils/result";
import { z } from "zod";
import { redactPII } from "@/server/lib/pii-detector";

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

      const rows = await db
        .select()
        .from(notes)
        .where(and(...conditions))
        .orderBy(desc(notes.createdAt));

      return ok(rows);
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
        .select()
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
        .select()
        .from(notes)
        .where(and(eq(notes.userId, userId), ilike(notes.contentPlain, `%${searchTerm}%`)))
        .orderBy(desc(notes.createdAt));

      return ok(rows);
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
        contentPlain: z.string(),
        contentRich: z.record(z.string(), z.unknown()).optional().default({}),
        contactId: z.string().uuid().optional(),
        tags: z.array(z.string()).optional().default([]),
        piiEntities: z.array(z.unknown()).optional().default([]),
        sourceType: z.enum(["typed", "voice", "upload"]).optional().default("typed"),
      });

      const parseResult = createNoteSchema.safeParse(input);

      if (!parseResult.success) {
        return err({
          code: "VALIDATION_ERROR",
          message: `Invalid note data: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
        });
      }

      const data = parseResult.data;

      // Redact PII from content
      const redactionResult = redactPII(data.contentPlain);

      const [newNote] = await db
        .insert(notes)
        .values({
          userId,
          contactId: data.contactId ?? null,
          contentPlain: redactionResult.sanitizedText,
          contentRich: data.contentRich,
          tags: data.tags,
          piiEntities: redactionResult.entities,
          sourceType: data.sourceType,
        })
        .returning();

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
        contentPlain: z.string().optional(),
        contentRich: z.record(z.string(), z.unknown()).optional(),
        tags: z.array(z.string()).optional(),
        piiEntities: z.array(z.unknown()).optional(),
      });

      const parseResult = updateNoteSchema.safeParse(input);

      if (!parseResult.success) {
        return err({
          code: "VALIDATION_ERROR",
          message: `Invalid update data: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
        });
      }

      const data = parseResult.data;

      // Build update object with only defined fields
      const updateValues: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      // Redact PII if contentPlain is being updated
      if (data.contentPlain !== undefined) {
        const redactionResult = redactPII(data.contentPlain);
        updateValues["contentPlain"] = redactionResult.sanitizedText;
        updateValues["piiEntities"] = redactionResult.entities;
      }

      if (data.contentRich !== undefined) updateValues["contentRich"] = data.contentRich;
      if (data.tags !== undefined) updateValues["tags"] = data.tags;

      const [updatedNote] = await db
        .update(notes)
        .set(updateValues)
        .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
        .returning();

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
}
