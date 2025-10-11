import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import {
  GetNotesQuerySchema,
  CreateNoteBodySchema,
  NotesListResponseSchema,
  type Note,
} from "@/server/db/business-schemas/notes";
import { listNotesService, createNoteService } from "@/server/services/notes.service";
import { z } from "zod";

/**
 * Notes API - List and Create
 */

export const GET = handleGetWithQueryAuth(
  GetNotesQuerySchema,
  NotesListResponseSchema,
  async (query, userId): Promise<{ notes: Note[]; total: number }> => {
    const notes = await listNotesService(userId, {
      contactId: query.contactId,
      search: query.search,
    });
    return { notes, total: notes.length };
  },
);

export const POST = handleAuth(
  CreateNoteBodySchema,
  z.custom<Note>(),
  async (data, userId): Promise<Note> => {
    return await createNoteService(userId, data);
  },
);
