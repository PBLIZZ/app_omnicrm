import {
  InboxItemResponseSchema,
  InboxUpdateRequestSchema,
  SuccessResponseSchema,
} from "@/server/db/business-schemas";
import { handleAuth } from "@/lib/api";
import { AppError } from "@/lib/errors/app-error";
import {
  getInboxItemService,
  updateInboxItemService,
  markAsProcessedService,
  deleteInboxItemService,
} from "@/server/services/inbox.service";
import { z } from "zod";
import type { UpdateInboxItem } from "@/server/db/business-schemas";
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

      const item = await getInboxItemService(userId, itemId);
      if (!item) {
        throw new AppError("Inbox item not found", "NOT_FOUND", "validation", false, 404);
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
          const updatePayload: UpdateInboxItem = {};

          if (data.status !== undefined) {
            updatePayload.status = data.status;
          }

          if (data.rawText !== undefined) {
            updatePayload.rawText = data.rawText;
          }

          if (data.createdTaskId !== undefined) {
            updatePayload.createdTaskId = data.createdTaskId ?? null;
          }

          const item = await updateInboxItemService(userId, itemId, updatePayload);
          if (!item) {
            throw new AppError("Inbox item not found", "NOT_FOUND", "validation", false, 404);
          }

          return { item };
        }

        case "mark_processed": {
          const createdTaskId = data?.createdTaskId ?? undefined;
          await markAsProcessedService(userId, itemId, createdTaskId);
          const item = await getInboxItemService(userId, itemId);
          if (!item) {
            throw new AppError(
              "Inbox item not found after processing",
              "NOT_FOUND",
              "validation",
              false,
              404,
            );
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

    await deleteInboxItemService(userId, itemId);

    return { success: true };
  });

  return handler(request);
}
