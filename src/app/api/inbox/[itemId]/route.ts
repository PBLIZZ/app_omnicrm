import { handleAuth } from "@/lib/api";
import { InboxService } from "@/server/services/inbox.service";
import { z } from "zod";
import {
  InboxItemResponseSchema,
  InboxUpdateRequestSchema,
  SuccessResponseSchema,
} from "@/server/db/business-schemas";

/**
 * Individual Inbox Item API - Get, update, and delete inbox items
 *
 * This API handles operations on individual inbox items including
 * marking as processed, updating status, and deletion.
 */

// Route parameter schema
const ItemIdParamsSchema = z.object({
  itemId: z.string().uuid(),
});

// Helper function to extract itemId from route params
async function getItemId(routeParams: Promise<{ params: { itemId: string } }> | undefined) {
  const params = await routeParams?.params;
  if (!params?.itemId) {
    throw new Error("Item ID is required");
  }

  const itemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  if (!itemId) {
    throw new Error("Invalid item ID");
  }

  return itemId;
}

export const GET = handleAuth(
  z.void(), // No request body validation needed
  InboxItemResponseSchema,
  async (_, userId, request, routeParams) => {
    const itemId = await getItemId(routeParams);

    const item = await InboxService.getInboxItem(userId, itemId);

    if (!item) {
      throw new Error("Inbox item not found");
    }

    return { item };
  }
);

export const PATCH = handleAuth(
  InboxUpdateRequestSchema,
  InboxItemResponseSchema,
  async (requestData, userId, request, routeParams) => {
    const itemId = await getItemId(routeParams);
    const { action, data } = requestData;

    switch (action) {
      case "update_status": {
        const item = await InboxService.updateInboxItem(userId, itemId, data);

        if (!item) {
          throw new Error("Inbox item not found");
        }

        return { item };
      }

      case "mark_processed": {
        const item = await InboxService.markAsProcessed(userId, itemId, data?.createdTaskId);

        if (!item) {
          throw new Error("Inbox item not found");
        }

        return { item };
      }

      default: {
        throw new Error("Invalid action");
      }
    }
  }
);

export const DELETE = handleAuth(
  z.void(), // No request body validation needed
  SuccessResponseSchema,
  async (_, userId, request, routeParams) => {
    const itemId = await getItemId(routeParams);

    const deleted = await InboxService.deleteInboxItem(userId, itemId);

    if (!deleted) {
      throw new Error("Inbox item not found");
    }

    return { success: true };
  }
);