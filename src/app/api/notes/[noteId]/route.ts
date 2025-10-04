import { getServerUserId } from "@/server/auth/user";
import { cookies } from "next/headers";
import {
  getNoteByIdService,
  updateNoteService,
  deleteNoteService,
} from "@/server/services/notes.service";
import { AppError } from "@/lib/errors/app-error";
import { UpdateNoteBodySchema } from "@/server/db/business-schemas/notes";

type RouteContext = {
  params: Promise<{ noteId: string }>;
};

/**
 * GET /api/notes/[noteId]
 * Get a specific note by ID
 */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const userId = await getServerUserId(cookieStore);
    const { noteId } = await context.params;

    const note = await getNoteByIdService(userId, noteId);

    return Response.json({ success: true, data: note });
  } catch (error) {
    if (error instanceof AppError) {
      const status = error.code === "NOTE_NOT_FOUND" ? 404 : 500;
      return Response.json({ success: false, error: error.message }, { status });
    }
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/notes/[noteId]
 * Update a note with PII redaction
 */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const userId = await getServerUserId(cookieStore);
    const { noteId } = await context.params;

    const body = (await request.json()) as {
      contentPlain?: string;
      contentRich?: unknown;
      tags?: string[];
    };

    // Validate with Zod schema
    const validated = UpdateNoteBodySchema.parse(body);

    const note = await updateNoteService(userId, noteId, validated);

    return Response.json({ success: true, data: note });
  } catch (error) {
    if (error instanceof AppError) {
      const status =
        error.code === "NOTE_NOT_FOUND" ? 404 : error.code === "VALIDATION_ERROR" ? 400 : 500;
      return Response.json({ success: false, error: error.message }, { status });
    }
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/notes/[noteId]
 * Delete a note
 */
export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const userId = await getServerUserId(cookieStore);
    const { noteId } = await context.params;

    await deleteNoteService(userId, noteId);

    return Response.json({ success: true, data: { deleted: true } });
  } catch (error) {
    if (error instanceof AppError) {
      const status = error.code === "NOTE_NOT_FOUND" ? 404 : 500;
      return Response.json({ success: false, error: error.message }, { status });
    }
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
