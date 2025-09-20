import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { apiError } from "@/server/api/response";
import { CreateNoteSchema } from "@/lib/validation/schemas/omniClients";
import { NotesRepository } from "@repo";
import { logger } from "@/lib/observability";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * OmniClient Notes endpoint
 *
 * GET: List all notes for a client
 * POST: Create a new note for a client
 * UI boundary transformation: presents "OmniClient" while using "contacts" backend
 */

const paramsSchema = z.object({
  clientId: z.string().uuid(),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_notes_list" },
  validation: { params: paramsSchema },
})(async ({ userId, validated, requestId }) => {

  const { clientId } = validated.params;

  try {
    // Get all notes for this client (contactId in DB = clientId from API)
    const clientNotes = await NotesRepository.getNotesByContactId(userId, clientId);

    const formattedNotes = clientNotes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));

    return NextResponse.json({ notes: formattedNotes });
  } catch (error) {
    await logger.error(
      "Failed to fetch OmniClient notes",
      {
        operation: "api.omni_clients.notes.list",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );
    return apiError(
      "Failed to fetch client notes",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_notes_create" },
  validation: { params: paramsSchema, body: CreateNoteSchema },
})(async ({ userId, validated, requestId }) => {

  const { clientId } = validated.params;

  try {
    // Create note for client using repository
    const newNote = await NotesRepository.createNote(userId, {
      contactId: clientId,
      title: validated.body.title,
      content: validated.body.content,
    });

    const formattedNote = {
      id: newNote.id,
      title: newNote.title,
      content: newNote.content,
      createdAt: newNote.createdAt.toISOString(),
      updatedAt: newNote.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedNote, undefined, 201);
  } catch (error) {
    await logger.error(
      "Failed to create OmniClient note",
      {
        operation: "api.omni_clients.notes.create",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );
    return apiError(
      "Failed to create client note",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
