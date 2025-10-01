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
import { NextRequest } from "next/server";

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
export async function GET(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(z.void(), ContactResponseSchema, async (_, userId) => {
    const params = await context.params;
    const result = await getContactByIdService(userId, params.contactId);

    if (!result.ok) {
      throw ApiError.notFound(result.error.message ?? "Contact not found");
    }

    return { item: result.data };
  });

  return handler(request);
}

/**
 * PUT /api/contacts/[contactId] - Update contact
 */
export async function PUT(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(
    UpdateContactBodySchema,
    ContactResponseSchema,
    async (data, userId) => {
      const params = await context.params;
      const result = await updateContactService(userId, params.contactId, data);

      if (!result.ok) {
        const errorMessage = result.error?.message || "Contact not found";
        throw ApiError.notFound(errorMessage);
      }

      return { item: result.data };
    },
  );

  return handler(request);
}

/**
 * DELETE /api/contacts/[contactId] - Delete contact
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(z.void(), DeleteContactResponseSchema, async (_, userId) => {
    const params = await context.params;
    const result = await deleteContactService(userId, params.contactId);

    // idempotent delete - return success even if contact didn't exist
    return { deleted: result.ok ? 1 : 0 };
  });

  return handler(request);
}
