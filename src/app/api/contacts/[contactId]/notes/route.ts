import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { getContactNotes, createContactNote } from "@/server/services/contacts.service";
import {
  GetNotesQuerySchema,
  NotesListResponseSchema,
  CreateNoteBodySchema,
  CreatedNoteResponseSchema,
  type NotesListResponse,
  type Note,
} from "@/server/db/business-schemas";

/**
 * Contact Notes API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET
 * ✅ handleAuth for POST
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: Promise<{
    contactId: string;
  }>;
}

/**
 * GET /api/contacts/[contactId]/notes - Get contact notes
 */
export async function GET(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;

  const handler = handleGetWithQueryAuth(
    GetNotesQuerySchema,
    NotesListResponseSchema,
    async (_query, userId): Promise<NotesListResponse> => {
      const result = await getContactNotes(userId, params.contactId);
      if (!result.success) {
        throw ApiError.internalServerError(result.error.message ?? "Failed to get notes");
      }
      return result.data;
    },
  );

  return handler(request);
}

/**
 * POST /api/contacts/[contactId]/notes - Create contact note
 */
export async function POST(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;

  const handler = handleAuth(
    CreateNoteBodySchema,
    CreatedNoteResponseSchema,
    async (data, userId): Promise<Note> => {
      const result = await createContactNote(userId, params.contactId, data);
      if (!result.success) {
        throw ApiError.internalServerError(result.error.message ?? "Failed to create note");
      }
      return result.data;
    },
  );

  return handler(request);
}
