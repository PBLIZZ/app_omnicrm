import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { CreateNoteSchema } from "@/lib/validation/schemas/omniClients";
import { NotesRepository } from "@repo";
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

export async function GET(
  _: NextRequest,
  context: { params: { clientId: string } }
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Validate params
    const validatedParams = paramsSchema.parse(context.params);
    const { clientId } = validatedParams;

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
    console.error("GET /api/omni-clients/[clientId]/notes error:", error);
    await logger.error(
      "Failed to fetch OmniClient notes",
      {
        operation: "api.omni_clients.notes.list",
        additionalData: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json({ error: "Failed to fetch client notes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { clientId: string } }
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Validate params
    const validatedParams = paramsSchema.parse(context.params);
    const { clientId } = validatedParams;

    // Validate request body
    const body: unknown = await request.json();
    const validatedBody = CreateNoteSchema.parse(body);

    // Create note for client using repository
    const newNote = await NotesRepository.createNote(userId, {
      contactId: clientId,
      title: validatedBody.title,
      content: validatedBody.content,
    });

    const formattedNote = {
      id: newNote.id,
      title: newNote.title,
      content: newNote.content,
      createdAt: newNote.createdAt.toISOString(),
      updatedAt: newNote.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedNote, { status: 201 });
  } catch (error) {
    console.error("POST /api/omni-clients/[clientId]/notes error:", error);
    await logger.error(
      "Failed to create OmniClient note",
      {
        operation: "api.omni_clients.notes.create",
        additionalData: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json({ error: "Failed to create client note" }, { status: 500 });
  }
}
