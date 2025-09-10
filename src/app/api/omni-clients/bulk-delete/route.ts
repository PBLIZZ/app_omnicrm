import { and, eq, inArray, sql } from "drizzle-orm";
import { createRouteHandler } from "@/server/api/handler";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { ApiResponseBuilder } from "@/server/api/response";
import { BulkDeleteBodySchema } from "@/lib/validation/schemas/omniClients";
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
  const api = new ApiResponseBuilder("omni_clients_bulk_delete", requestId);

  try {
    const dbo = await getDb();
    const { ids } = validated.body;

    // Count contacts to delete first
    const countRows = await dbo
      .select({ n: sql<number>`count(*)` })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), inArray(contacts.id, ids)))
      .limit(1);
    const n = countRows[0]?.n ?? 0;

    if (n === 0) {
      return api.success({
        deleted: 0,
        message: "No clients found to delete",
      });
    }

    // Delete the contacts
    await dbo.delete(contacts).where(and(eq(contacts.userId, userId), inArray(contacts.id, ids)));

    await logger.info("Bulk deleted OmniClients", {
      operation: "omni_clients_bulk_delete",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        deletedCount: n,
        requestedIds: ids.length,
      },
    });

    return api.success({
      deleted: n,
      message: `Successfully deleted ${n} client${n === 1 ? "" : "s"}`,
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

    return api.error(
      "Failed to delete clients",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});
