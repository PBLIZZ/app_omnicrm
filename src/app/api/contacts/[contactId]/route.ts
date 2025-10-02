import { handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import {
  getContactByIdService,
  updateContactService,
  deleteContactService,
} from "@/server/services/contacts.service";
import {
  ContactResponseSchema,
  UpdateContactBodySchema,
  DeleteContactResponseSchema,
} from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * Individual Contact Management API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleAuth for all operations
 * ✅ Zod validation and type safety
 * ✅ Business schema standardization
 */

interface RouteParams {
  params: Promise<{
    contactId: string;
  }>;
}

/**
 * GET /api/contacts/[contactId] - Get contact by ID
 */
export async function GET(req: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  
  const handler = handleAuth(z.void(), ContactResponseSchema, async (_, userId) => {
    const result = await getContactByIdService(userId, params.contactId);

    if (!result.success) {
      throw ApiError.notFound(result.error.message ?? "Contact not found");
    }

    return { item: result.data };
  });

  return handler(req);
}

/**
 * PUT /api/contacts/[contactId] - Update contact
 */
export async function PUT(req: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  
  const handler = handleAuth(
    UpdateContactBodySchema,
    ContactResponseSchema,
    async (data, userId) => {
      const result = await updateContactService(userId, params.contactId, data);

      if (!result.success) {
        throw ApiError.notFound(result.error.message ?? "Contact not found");
      }

      return { item: result.data };
    },
  );

  return handler(req);
}

/**
 * DELETE /api/contacts/[contactId] - Delete contact
 */
export async function DELETE(req: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  
  const handler = handleAuth(z.void(), DeleteContactResponseSchema, async (_, userId) => {
    const result = await deleteContactService(userId, params.contactId);

    // idempotent delete - return success even if contact didn't exist
    return { deleted: result.success ? 1 : 0 };
  });

  return handler(req);
}
