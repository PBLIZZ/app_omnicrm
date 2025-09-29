import { handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import {
  getOmniClient,
  updateOmniClient,
  deleteOmniClient,
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
  params: {
    contactId: string;
  };
}

/**
 * GET /api/contacts/[contactId] - Get contact by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(z.void(), ContactResponseSchema, async (_, userId) => {
    const omniClient = await getOmniClient(userId, params.contactId);

    if (!omniClient) {
      throw ApiError.notFound("Contact not found");
    }

    return { item: omniClient };
  });

  return handler(request);
}

/**
 * PUT /api/contacts/[contactId] - Update contact
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(
    UpdateContactBodySchema,
    ContactResponseSchema,
    async (data, userId) => {
      // Add the contactId to the data for the service call
      const dataWithId = { ...data, id: params.contactId };
      const omniClient = await updateOmniClient(userId, params.contactId, dataWithId);

      if (!omniClient) {
        throw ApiError.notFound("Contact not found");
      }

      return { item: omniClient };
    },
  );

  return handler(request);
}

/**
 * DELETE /api/contacts/[contactId] - Delete contact
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(z.void(), DeleteContactResponseSchema, async (_, userId) => {
    const deleted = await deleteOmniClient(userId, params.contactId);

    // idempotent delete - return success even if contact didn't exist
    return { deleted: deleted ? 1 : 0 };
  });

  return handler(request);
}
