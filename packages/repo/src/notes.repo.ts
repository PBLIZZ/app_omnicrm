import { eq, and, desc, ilike } from "drizzle-orm";
import { notes, type Note, type CreateNote } from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

/**
 * Notes Repository
 *
 * Pure database operations - no business logic, no validation.
 * Uses DbClient constructor injection pattern.
 * Throws errors on failure - no Result wrapper.
 */

export class NotesRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * List notes for a user with optional contact filtering
   */
  async listNotes(userId: string, contactId?: string): Promise<Note[]> {
    const conditions = [eq(notes.userId, userId)];

    if (contactId) {
      conditions.push(eq(notes.contactId, contactId));
    }

    const rows = await this.db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.createdAt));

    return rows;
  }

  /**
   * Get a single note by ID
   */
  async getNoteById(userId: string, noteId: string): Promise<Note | null> {
    const rows = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
      .limit(1);

    return rows.length > 0 && rows[0] ? rows[0] : null;
  }

  /**
   * Get notes for a specific contact
   */
  async getNotesByContactId(userId: string, contactId: string): Promise<Note[]> {
    const rows = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.contactId, contactId)))
      .orderBy(desc(notes.createdAt));

    return rows;
  }

  /**
   * Search notes by content
   */
  async searchNotes(userId: string, searchTerm: string): Promise<Note[]> {
    const rows = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), ilike(notes.contentPlain, `%${searchTerm}%`)))
      .orderBy(desc(notes.createdAt));

    return rows;
  }

  /**
   * Create a new note
   */
  async createNote(data: CreateNote): Promise<Note> {
    const [newNote] = await this.db
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
      throw new Error("Insert returned no data");
    }

    return newNote;
  }

  /**
   * Update an existing note
   */
  async updateNote(
    userId: string,
    noteId: string,
    updates: Partial<CreateNote>,
  ): Promise<Note | null> {
    const [updatedNote] = await this.db
      .update(notes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
      .returning();

    return updatedNote ?? null;
  }

  /**
   * Delete a note
   */
  async deleteNote(userId: string, noteId: string): Promise<boolean> {
    const result = await this.db
      .delete(notes)
      .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
      .returning({ id: notes.id });

    return result.length > 0;
  }
}

export function createNotesRepository(db: DbClient): NotesRepository {
  return new NotesRepository(db);
}
