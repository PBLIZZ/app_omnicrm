import { NotesRepository } from "@repo";
import { getServerUserId } from "@/server/auth/user";
import { cookies } from "next/headers";

type RouteContext = {
  params: Promise<{ noteId: string }>;
};

/**
 * GET /api/notes/[noteId]
 * Get a specific note by ID
 */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const cookieStore = await cookies();
  const userId = await getServerUserId(cookieStore);

  const { noteId } = await context.params;

  const result = await NotesRepository.getNoteById(userId, noteId);

  if (!result.success) {
    return Response.json(
      {
        success: false,
        error: typeof result.error === "string" ? result.error : result.error.message,
      },
      { status: 500 },
    );
  }

  if (!result.data) {
    return Response.json({ success: false, error: "Note not found" }, { status: 404 });
  }

  return Response.json({ success: true, data: result.data });
}

/**
 * PUT /api/notes/[noteId]
 * Update a note
 */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const cookieStore = await cookies();
  const userId = await getServerUserId(cookieStore);

  const { noteId } = await context.params;
  const body: unknown = await request.json();

  const result = await NotesRepository.updateNote(userId, noteId, body);

  if (!result.success) {
    return Response.json(
      {
        success: false,
        error: typeof result.error === "string" ? result.error : result.error.message,
      },
      { status: result.error.code === "VALIDATION_ERROR" ? 400 : 500 },
    );
  }

  if (!result.data) {
    return Response.json({ success: false, error: "Note not found" }, { status: 404 });
  }

  return Response.json({ success: true, data: result.data });
}

/**
 * DELETE /api/notes/[noteId]
 * Delete a note
 */
export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const cookieStore = await cookies();
  const userId = await getServerUserId(cookieStore);

  const { noteId } = await context.params;

  const result = await NotesRepository.deleteNote(userId, noteId);

  if (!result.success) {
    return Response.json(
      {
        success: false,
        error: typeof result.error === "string" ? result.error : result.error.message,
      },
      { status: 500 },
    );
  }

  if (!result.data) {
    return Response.json({ success: false, error: "Note not found" }, { status: 404 });
  }

  return Response.json({ success: true, data: { deleted: true } });
}
