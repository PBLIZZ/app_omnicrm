import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { BulkDeleteBodySchema } from "@/lib/validation/schemas/omniClients";
import { BulkDeleteService } from "@/server/services/bulk-delete.service";
import { logger } from "@/lib/observability";

/**
 * OmniClients Bulk Delete API
 *
 * POST: Delete multiple clients by IDs
 * Uses existing contacts table with UI terminology transformation
 */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const validation = BulkDeleteBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: validation.error.issues
      }, { status: 400 });
    }

    const { ids } = validation.data;

    // Delegate to service layer
    const result = await BulkDeleteService.deleteContacts(userId, { ids });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/omni-clients/bulk-delete error:", error);

    // Try to get userId for logging, but don't fail if we can't
    let userIdForLogging = "unknown";
    try {
      const userId = await getServerUserId();
      userIdForLogging = userId.slice(0, 8) + "...";
    } catch (_) {
      // Ignore auth errors in error handler
    }

    await logger.error(
      "Failed to bulk delete OmniClients",
      {
        operation: "omni_clients_bulk_delete",
        additionalData: {
          userId: userIdForLogging,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );

    return NextResponse.json({ error: "Failed to delete clients" }, { status: 500 });
  }
}
