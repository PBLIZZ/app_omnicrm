import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { listContactsService } from "@/server/services/contacts.service";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * OmniClients Count API - Get total count only
 */
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_list" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("omni_clients_count", requestId);

  try {
    // Use minimal query to get just the count
    const { total } = await listContactsService(userId, {
      page: 1,
      pageSize: 1, // Minimum items needed
      sort: "displayName",
      order: "asc",
    });

    return api.success({ count: total });
  } catch (error) {
    return api.error(
      "Failed to fetch omni clients count",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
