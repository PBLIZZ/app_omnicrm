import { z } from "zod";
import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  getContactWithNotesService,
  updateContactService,
  deleteContactService,
} from "@/server/services/contacts.service";
import {
  UpdateContactBodySchema,
  DeleteContactResponseSchema,
  ContactSchema,
} from "@/server/db/business-schemas/contacts";
import { AppError } from "@/lib/errors/app-error";

/**
 * Individual Contact Management API Routes
 *
 * Migrated to handleAuth pattern for consistent error handling and validation
 */

interface RouteParams {
  params: Promise<{ contactId: string }>;
}

// Response schema for contact with notes
const ContactWithNotesSchema = ContactSchema.extend({
  notes: z.array(
    z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
      contactId: z.string().uuid().nullable(),
      contentPlain: z.string(),
      contentRich: z.unknown().nullable(),
      createdAt: z.date().nullable(),
      updatedAt: z.date().nullable(),
    }),
  ),
});

/**
 * GET /api/contacts/[contactId] - Get contact with full notes array
 */
export async function GET(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;

  return handleGetWithQueryAuth(
    z.object({}),
    ContactWithNotesSchema,
    async (_voidInput, userId): Promise<z.infer<typeof ContactWithNotesSchema>> => {
      const contact = await getContactWithNotesService(userId, params.contactId);
      if (!contact) {
        throw new AppError("Contact not found", "NOT_FOUND", "validation", false, 404);
      }
      return contact;
    },
  )(request);
}

/**
 * PUT /api/contacts/[contactId] - Update contact
 */
export async function PUT(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;

  return handleAuth(
    UpdateContactBodySchema,
    ContactSchema,
    async (data, userId): Promise<z.infer<typeof ContactSchema>> => {
      const contact = await updateContactService(userId, params.contactId, data);
      if (!contact) {
        throw new AppError("Contact not found", "NOT_FOUND", "validation", false, 404);
      }
      return contact;
    },
  )(request);
}

/**
 * DELETE /api/contacts/[contactId] - Delete contact
 */
export async function DELETE(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;

  return handleGetWithQueryAuth(
    z.object({}),
    DeleteContactResponseSchema,
    async (_voidInput, userId): Promise<z.infer<typeof DeleteContactResponseSchema>> => {
      const deleted = await deleteContactService(userId, params.contactId);
      return { deleted: deleted ? 1 : 0 };
    },
  )(request);
}
