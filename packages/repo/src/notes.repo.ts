import { eq, and, desc, ilike } from "drizzle-orm";
import { notes } from "@/server/db/schema";
import { getDb } from "./db";
import type { Note, CreateNote } from "@/server/db/schema";

// Local type aliases for repository layer
type NoteDTO = Note;
type CreateNoteDTO = CreateNote;
type UpdateNoteDTO = Partial<CreateNote>;

export class NotesRepository {
  /**
   * List notes for a user with optional contact filtering
   */
  static async listNotes(userId: string, contactId?: string): Promise<NoteDTO[]> {
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

    return rows.map((row) => row);
  }

  /**
   * Get a single note by ID
   */
  static async getNoteById(userId: string, noteId: string): Promise<NoteDTO | null> {
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

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * Get notes for a specific contact
   */
  static async getNotesByContactId(userId: string, contactId: string): Promise<NoteDTO[]> {
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

    return rows.map((row) => row);
  }

  /**
   * Search notes by content
   */
  static async searchNotes(userId: string, searchTerm: string): Promise<NoteDTO[]> {
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

    return rows.map((row) => row);
  }

  /**
   * Create a new note
   */
  static async createNote(userId: string, data: CreateNoteDTO): Promise<NoteDTO> {
    const db = await getDb();

    const [newNote] = await db
      .insert(notes)
      .values({
        userId,
        contactId: data.contactId || null,
        title: data.title || null,
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

    return newNote;
  }

  /**
   * Update an existing note
   */
  static async updateNote(
    userId: string,
    noteId: string,
    data: UpdateNoteDTO,
  ): Promise<NoteDTO | null> {
    const db = await getDb();

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

    if (!updatedNote) {
      return null;
    }

    return updatedNote;
  }

  /**
   * Delete a note
   */
  static async deleteNote(userId: string, noteId: string): Promise<boolean> {
    const db = await getDb();

    const result = await db
      .delete(notes)
      .where(and(eq(notes.userId, userId), eq(notes.id, noteId)));

    return result.length > 0;
  }

  /**
   * Bulk create notes (useful for AI-generated insights)
   */
  static async bulkCreateNotes(userId: string, data: CreateNoteDTO[]): Promise<NoteDTO[]> {
    const db = await getDb();

    const newNotes = await db
      .insert(notes)
      .values(
        data.map((item) => ({
          userId,
          contactId: item.contactId || null,
          title: item.title || null,
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

    return newNotes.map((row) => row);
  }
}
