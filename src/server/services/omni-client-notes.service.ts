import { NotesRepository } from "@repo";
import { CreateNoteSchema } from "@/lib/validation/schemas/omniClients";
import { z } from "zod";

export interface CreateNoteRequest {
  title?: string;
  content: string;
}

export interface NoteResponse {
  id: string;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotesListResponse {
  notes: NoteResponse[];
}

const ParamsSchema = z.object({
  clientId: z.string().uuid(),
});

export class OmniClientNotesService {
  /**
   * Get all notes for a specific OmniClient
   *
   * @param userId - The user ID
   * @param clientId - The client ID
   * @returns Promise<NotesListResponse> - List of formatted notes
   */
  static async getClientNotes(userId: string, clientId: string): Promise<NotesListResponse> {
    // Validate client ID
    const validatedParams = ParamsSchema.parse({ clientId });

    // Get all notes for this client (contactId in DB = clientId from API)
    const clientNotes = await NotesRepository.getNotesByContactId(userId, validatedParams.clientId);

    // Format notes for response
    const formattedNotes = clientNotes.map((note) => this.formatNoteResponse(note));

    return { notes: formattedNotes };
  }

  /**
   * Create a new note for a specific OmniClient
   *
   * @param userId - The user ID
   * @param clientId - The client ID
   * @param noteData - The note data to create
   * @returns Promise<NoteResponse> - The created note
   */
  static async createClientNote(
    userId: string,
    clientId: string,
    noteData: unknown,
  ): Promise<NoteResponse> {
    // Validate client ID
    const validatedParams = ParamsSchema.parse({ clientId });

    // Validate note data
    const validatedBody = CreateNoteSchema.parse(noteData);

    // Create note for client using repository
    const newNote = await NotesRepository.createNote(userId, {
      contactId: validatedParams.clientId,
      title: validatedBody.title,
      content: validatedBody.content,
    });

    // Format note for response
    return this.formatNoteResponse(newNote);
  }

  /**
   * Format a note from the database for API response
   *
   * @param note - Raw note from database
   * @returns Formatted note response
   */
  private static formatNoteResponse(note: {
    id: string;
    title: string | null;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }): NoteResponse {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}