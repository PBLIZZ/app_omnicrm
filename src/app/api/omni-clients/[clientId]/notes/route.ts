import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { OmniClientNotesService } from "@/server/services/omni-client-notes.service";
import { logger } from "@/lib/observability";

/**
 * OmniClient Notes endpoint
 *
 * GET: List all notes for a client
 * POST: Create a new note for a client
 * UI boundary transformation: presents "OmniClient" while using "contacts" backend
 */

export async function GET(
  _: NextRequest,
  context: { params: { clientId: string } }
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Get client notes using service
    const result = await OmniClientNotesService.getClientNotes(userId, context.params.clientId);

    return NextResponse.json(result);
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

    // Parse request body
    const body: unknown = await request.json();

    // Create note using service
    const newNote = await OmniClientNotesService.createClientNote(
      userId,
      context.params.clientId,
      body,
    );

    return NextResponse.json(newNote, { status: 201 });
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
