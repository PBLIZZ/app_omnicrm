import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { OmniClientNotesService } from "@/server/services/omni-client-notes.service";
import {
  GetNotesQuerySchema,
  NotesListResponseSchema,
  CreateNoteBodySchema,
  CreatedNoteResponseSchema
} from "@/server/db/business-schemas";
import { z } from "zod";
import { NextRequest } from "next/server";

/**
 * OmniClient Notes API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET
 * ✅ handleAuth for POST
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: {
    clientId: string;
  };
}

/**
 * GET /api/omni-clients/[clientId]/notes - Get client notes
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const handler = handleGetWithQueryAuth(
    GetNotesQuerySchema,
    NotesListResponseSchema,
    async (query, userId) => {
      return await OmniClientNotesService.getClientNotes(userId, params.clientId);
    }
  );

  return handler(request);
}

/**
 * POST /api/omni-clients/[clientId]/notes - Create client note
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const handler = handleAuth(
    CreateNoteBodySchema,
    CreatedNoteResponseSchema,
    async (data, userId) => {
      return await OmniClientNotesService.createClientNote(
        userId,
        params.clientId,
        data,
      );
    }
  );

  return handler(request);
}
