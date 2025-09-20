import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { listContactsService } from "@/server/services/contacts.service";

/**
 * OmniClients Count API - Get total count only
 */
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_list" },
})(async ({ userId, requestId }) => {

  try {
    // Use minimal query to get just the count
    const { total } = await listContactsService(userId, {
      page: 1,
      pageSize: 1, // Minimum items needed
      sort: "displayName",
      order: "asc",
    });

    return NextResponse.json({ count: total });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch omni clients count" }, { status: 500 });
  }
});
