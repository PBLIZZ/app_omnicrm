import { eq, and } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { notes } from "@/server/db/schema";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { CreateNoteSchema } from "@/lib/validation/schemas/omniClients";
import { logger } from "@/lib/observability";
import { z } from "zod";

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
  const api = new ApiResponseBuilder("omni_clients.notes.list", requestId);

  const { clientId } = validated.params;

  try {
    const dbo = await getDb();

    // Get all notes for this client (contactId in DB = clientId from API)
    const clientNotes = await dbo
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.contactId, clientId)))
      .orderBy(notes.createdAt);

    const formattedNotes = clientNotes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));

    return api.success({ notes: formattedNotes });
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
    return api.error(
      "Failed to fetch client notes",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_notes_create" },
  validation: { params: paramsSchema, body: CreateNoteSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("omni_clients.notes.create", requestId);

  const { clientId } = validated.params;

  try {
    const dbo = await getDb();

    // Create note for client (contactId in DB = clientId from API)
    const [newNote] = await dbo
      .insert(notes)
      .values({
        contactId: clientId,
        userId,
        title: validated.body.title,
        content: validated.body.content,
      })
      .returning();

    if (!newNote) return api.error("Failed to create note", "INTERNAL_ERROR");

    const formattedNote = {
      id: newNote.id,
      title: newNote.title,
      content: newNote.content,
      createdAt: newNote.createdAt.toISOString(),
      updatedAt: newNote.updatedAt.toISOString(),
    };

    return api.success(formattedNote, undefined, 201);
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
    return api.error(
      "Failed to create client note",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});
