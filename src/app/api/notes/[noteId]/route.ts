import { z } from "zod";
import { handleAuth } from "@/lib/api";
import {
  getNoteByIdService,
  updateNoteService,
  deleteNoteService,
} from "@/server/services/notes.service";
import { UpdateNoteBodySchema } from "@/server/db/business-schemas/notes";

/**
 * Individual Note Management API Routes
 *
 * Migrated to handleAuth pattern for consistent error handling and validation
 */

interface RouteParams {
  params: Promise<{ noteId: string }>;
}

// Response schema for note
const NoteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  contentRich: z.unknown(),
  contentPlain: z.string(),
  piiEntities: z.unknown(),
  sourceType: z.enum(["typed", "voice", "upload"]),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

const NoteResponseSchema = z.object({
  success: z.boolean(),
  data: NoteSchema,
});

const DeleteNoteResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    deleted: z.boolean(),
  }),
});

/**
 * GET /api/notes/[noteId] - Get a specific note by ID
 */
export async function GET(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;

  return handleAuth(
    z.object({}),
    NoteResponseSchema,
    async (_voidInput, userId): Promise<z.infer<typeof NoteResponseSchema>> => {
      const note = await getNoteByIdService(userId, params.noteId);
      return { success: true, data: note };
    },
  )(request);
}

/**
 * PUT /api/notes/[noteId] - Update a note with PII redaction
 */
export async function PUT(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;

  return handleAuth(
    UpdateNoteBodySchema,
    NoteResponseSchema,
    async (data, userId): Promise<z.infer<typeof NoteResponseSchema>> => {
      const note = await updateNoteService(userId, params.noteId, data);
      return { success: true, data: note };
    },
  )(request);
}

/**
 * DELETE /api/notes/[noteId] - Delete a note
 */
export async function DELETE(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;

  return handleAuth(
    z.object({}),
    DeleteNoteResponseSchema,
    async (_voidInput, userId): Promise<z.infer<typeof DeleteNoteResponseSchema>> => {
      await deleteNoteService(userId, params.noteId);
      return { success: true, data: { deleted: true } };
    },
  )(request);
}
