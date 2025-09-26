import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { OmniClientService } from "@/server/services/omni-client.service";

// --- GET /api/omni-clients/[clientId] ---
export async function GET(
  _: NextRequest,
  context: { params: { clientId: string } },
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { clientId } = context.params;

    const omniClient = await OmniClientService.getOmniClient(userId, clientId);

    if (!omniClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ item: omniClient });
  } catch (error) {
    console.error("GET /api/omni-clients/[clientId] error:", error);
    return NextResponse.json({ error: "Failed to fetch omni client" }, { status: 500 });
  }
}

// --- PATCH /api/omni-clients/[clientId] ---
export async function PATCH(
  request: NextRequest,
  context: { params: { clientId: string } },
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { clientId } = context.params;

    // Validate request body
    const body: unknown = await request.json();

    // Type guard to ensure body is a record
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body format" },
        { status: 400 }
      );
    }

    const omniClient = await OmniClientService.updateOmniClient(userId, clientId, body);

    if (!omniClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ item: omniClient });
  } catch (error) {
    console.error("PATCH /api/omni-clients/[clientId] error:", error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes("Validation failed")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to update omni client" }, { status: 500 });
  }
}

// Optional: keep PUT for backward compatibility, delegate to PATCH
export const PUT = PATCH;

// --- DELETE /api/omni-clients/[clientId] ---
export async function DELETE(
  _: NextRequest,
  context: { params: { clientId: string } },
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { clientId } = context.params;

    const deleted = await OmniClientService.deleteOmniClient(userId, clientId);

    // idempotent delete - return success even if contact didn't exist
    return NextResponse.json({ deleted: deleted ? 1 : 0 });
  } catch (error) {
    console.error("DELETE /api/omni-clients/[clientId] error:", error);
    return NextResponse.json({ error: "Failed to delete omni client" }, { status: 500 });
  }
}
