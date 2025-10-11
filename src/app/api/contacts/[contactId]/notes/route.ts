import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { getContactNotes, createContactNote } from "@/server/services/contacts.service";
import {
  GetNotesQuerySchema,
  NotesListResponseSchema,
  CreateNoteBodySchema,
  CreatedNoteResponseSchema,
} from "@/server/db/business-schemas";
import { NextRequest } from "next/server";

/**
 * Contact Notes API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET
 * ✅ handleAuth for POST
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: {
    contactId: string;
  };
}

/**
 * GET /api/contacts/[contactId]/notes - Get contact notes
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const handler = handleGetWithQueryAuth(
    GetNotesQuerySchema,
    NotesListResponseSchema,
    async (query, userId) => {
      return await getContactNotes(userId, params.contactId);
    },
  );

  return handler(request);
}

/**
 * POST /api/contacts/[contactId]/notes - Create contact note
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(
    CreateNoteBodySchema,
    CreatedNoteResponseSchema,
    async (data, userId) => {
      return await createContactNote(userId, params.contactId, data);
    },
  );

  return handler(request);
}
