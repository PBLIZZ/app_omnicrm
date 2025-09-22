import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { listContactsService } from "@/server/services/contacts.service";

/**
 * OmniClients Count API - Get total count only
 */
export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Use minimal query to get just the count
    const { total } = await listContactsService(userId, {
      page: 1,
      pageSize: 1, // Minimum items needed
      sort: "displayName",
      order: "asc",
    });

    return NextResponse.json({ count: total });
  } catch (error) {
    console.error("Failed to fetch omni clients count:", error);
    return NextResponse.json({ error: "Failed to fetch omni clients count" }, { status: 500 });
  }
}
