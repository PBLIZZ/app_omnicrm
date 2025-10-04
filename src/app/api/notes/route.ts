import { NotesRepository } from "@repo";
import { getServerUserId } from "@/server/auth/user";
import { cookies } from "next/headers";

/**
 * GET /api/notes
 * List notes for the authenticated user, optionally filtered by contact
 */
export async function GET(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const userId = await getServerUserId(cookieStore);

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId") || undefined;
  const search = searchParams.get("search") || undefined;

  // Use search if provided, otherwise list by contactId
  const result = search
    ? await NotesRepository.searchNotes(userId, search)
    : await NotesRepository.listNotes(userId, contactId);

  if (!result.success) {
    return Response.json(
      {
        success: false,
        error: typeof result.error === "string" ? result.error : result.error.message,
      },
      { status: 500 },
    );
  }

  return Response.json({ success: true, data: result.data });
}

/**
 * POST /api/notes
 * Create a new note
 */
export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const userId = await getServerUserId(cookieStore);

  const body: unknown = await request.json();

  const result = await NotesRepository.createNote(userId, body);

  if (!result.success) {
    return Response.json(
      {
        success: false,
        error: typeof result.error === "string" ? result.error : result.error.message,
      },
      { status: result.error.code === "VALIDATION_ERROR" ? 400 : 500 },
    );
  }

  return Response.json({ success: true, data: result.data }, { status: 201 });
}
