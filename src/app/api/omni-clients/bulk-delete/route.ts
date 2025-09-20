import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { BulkDeleteBodySchema } from "@/lib/validation/schemas/omniClients";
import { ContactsRepository } from "@repo";
import { logger } from "@/lib/observability";

/**
 * OmniClients Bulk Delete API
 *
 * POST: Delete multiple clients by IDs
 * Uses existing contacts table with UI terminology transformation
 */

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_bulk_delete" },
  validation: { body: BulkDeleteBodySchema },
})(async ({ userId, validated, requestId }) => {
  try {
    const { ids } = validated.body;

    // Delete contacts using repository
    const deletedCount = await ContactsRepository.deleteContactsByIds(userId, ids);

    if (deletedCount === 0) {
      return NextResponse.json({
        deleted: 0,
        message: "No clients found to delete",
      });
    }

    await logger.info("Bulk deleted OmniClients", {
      operation: "omni_clients_bulk_delete",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        deletedCount: deletedCount,
        requestedIds: ids.length,
      },
    });

    return NextResponse.json({
      deleted: deletedCount,
      message: `Successfully deleted ${deletedCount} client${deletedCount === 1 ? "" : "s"}`,
    });
  } catch (error) {
    await logger.error(
      "Failed to bulk delete OmniClients",
      {
        operation: "omni_clients_bulk_delete",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          requestedIds: validated.body?.ids?.length ?? 0,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );

    return NextResponse.json(
      { error: "Failed to delete clients" },
      { status: 500 }
    );
  }
});
