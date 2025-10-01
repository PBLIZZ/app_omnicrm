import { handleAuth } from "@/lib/api";
import { InboxService } from "@/server/services/inbox.service";
import { z } from "zod";
import {
  InboxItemResponseSchema,
  InboxUpdateRequestSchema,
  SuccessResponseSchema,
} from "@/server/db/business-schemas";
import { NextRequest } from "next/server";

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

interface RouteParams {
  params: Promise<{
    itemId: string;
  }>;
}

// Helper to extract and validate itemId from route params
async function getItemId(routeParams: RouteParams): Promise<string> {
  const params = await routeParams.params;
  const { itemId } = ItemIdParamsSchema.parse(params);
  return itemId;
}

export async function GET(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(
    z.void(), // No request body validation needed
    InboxItemResponseSchema,
    async (_: void, userId: string) => {
      const itemId = await getItemId(context);

      const item = await InboxService.getInboxItem(userId, itemId);

      if (!item) {
        throw new Error("Inbox item not found");
      }

      return { item };
    },
  );

  return handler(request);
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(
    InboxUpdateRequestSchema,
    InboxItemResponseSchema,
    async (requestData: z.infer<typeof InboxUpdateRequestSchema>, userId: string) => {
      const itemId = await getItemId(context);
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
          const success = await InboxService.markAsProcessed(userId, itemId);

          if (!success) {
            throw new Error("Failed to mark item as processed");
          }

          const item = await InboxService.getInboxItem(userId, itemId);

          if (!item) {
            throw new Error("Inbox item not found after processing");
          }

          return { item };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
  );

  return handler(request);
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(z.void(), SuccessResponseSchema, async (_: void, userId: string) => {
    const itemId = await getItemId(context);

    const success = await InboxService.deleteInboxItem(userId, itemId);

    if (!success) {
      throw new Error("Failed to delete inbox item");
    }

    return { success: true };
  });

  return handler(request);
}
