import { handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { OmniClientService } from "@/server/services/omni-client.service";
import {
  ContactResponseSchema,
  UpdateContactBodySchema,
  DeleteContactResponseSchema,
} from "@/server/db/business-schemas";
import { z } from "zod";
import { NextRequest } from "next/server";

/**
 * Individual OmniClient Management API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleAuth for all operations
 * ✅ Zod validation and type safety
 * ✅ Business schema standardization
 */

interface RouteParams {
  params: {
    clientId: string;
  };
}

/**
 * GET /api/omni-clients/[clientId] - Get client by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(z.void(), ContactResponseSchema, async (_, userId) => {
    const omniClient = await OmniClientService.getOmniClient(userId, params.clientId);

    if (!omniClient) {
      throw ApiError.notFound("Client not found");
    }

    return { item: omniClient };
  });

  return handler(request);
}

/**
 * PUT /api/omni-clients/[clientId] - Update client
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(
    UpdateContactBodySchema,
    ContactResponseSchema,
    async (data, userId) => {
      // Add the clientId to the data for the service call
      const dataWithId = { ...data, id: params.clientId };
      const omniClient = await OmniClientService.updateOmniClient(
        userId,
        params.clientId,
        dataWithId,
      );

      if (!omniClient) {
        throw ApiError.notFound("Client not found");
      }

      return { item: omniClient };
    },
  );

  return handler(request);
}

/**
 * DELETE /api/omni-clients/[clientId] - Delete client
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(z.void(), DeleteContactResponseSchema, async (_, userId) => {
    const deleted = await OmniClientService.deleteOmniClient(userId, params.clientId);

    // idempotent delete - return success even if contact didn't exist
    return { deleted: deleted ? 1 : 0 };
  });

  return handler(request);
}
