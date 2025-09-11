import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import {
  GetOmniClientsQuerySchema,
  CreateOmniClientSchema,
} from "@/lib/validation/schemas/omniClients";
import {
  toOmniClientsWithNotes,
  toOmniClient,
  fromOmniClientInput,
} from "@/server/adapters/omniClients";
import { listContactsService, createContactService } from "@/server/services/contacts.service";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * OmniClients API - List and Create
 *
 * UI boundary transformation: presents "OmniClients" while using "contacts" backend
 * Uses adapter pattern to transform Contact objects to OmniClient objects
 */

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_list" },
  validation: {
    query: GetOmniClientsQuerySchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("omni_clients_list", requestId);

  try {
    const page = validated.query.page ?? 1;
    const pageSize = validated.query.pageSize ?? validated.query.limit ?? 50;
    const sortKey = validated.query.sort ?? "displayName";
    const sortDir = validated.query.order === "desc" ? "desc" : "asc";

    const params: Parameters<typeof listContactsService>[1] = {
      sort: sortKey,
      order: sortDir,
      page,
      pageSize,
    };
    if (validated.query.search) params.search = validated.query.search;

    const { items, total } = await listContactsService(userId, params);

    // Transform Contact[] to OmniClientWithNotes[] using adapter
    const omniClients = toOmniClientsWithNotes(items);

    return api.success({
      items: omniClients,
      total,
      nextCursor: null, // Add nextCursor to match schema
    });
  } catch (error) {
    return api.error(
      "Failed to fetch omni clients",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_create" },
  validation: {
    body: CreateOmniClientSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("omni_clients_create", requestId);

  try {
    // Transform OmniClient input to Contact input using adapter
    const contactInput = fromOmniClientInput(validated.body);

    const row = await createContactService(userId, contactInput);

    if (!row) {
      return api.error("Failed to create client", "INTERNAL_ERROR");
    }

    // Transform Contact back to OmniClient for response
    const omniClient = toOmniClient(row);

    return api.success({ item: omniClient }, undefined, 201);
  } catch (error) {
    return api.error(
      "Failed to create omni client",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
