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

/**
 * Individual Inbox Item API - Get, update, and delete inbox items
 *
 * This API handles operations on individual inbox items including
 * marking as processed, updating status, and deletion.
 */

interface RouteParams {
  params: Promise<{
    itemId: string;
  }>;
}

export async function GET(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleAuth(
    z.void(),
    InboxItemResponseSchema,
    async (_, userId: string): Promise<{ item: unknown }> => {
      const item = await getInboxItemService(userId, params.itemId);
      if (!item) {
        throw new AppError("Inbox item not found", "NOT_FOUND", "validation", false, 404);
      }

      return { item };
    },
  )(request);
}

export async function PATCH(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleAuth(
    InboxUpdateRequestSchema,
    InboxItemResponseSchema,
    async (requestData: z.infer<typeof InboxUpdateRequestSchema>, userId: string): Promise<{ item: unknown }> => {
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

          const item = await updateInboxItemService(userId, params.itemId, updatePayload);
          if (!item) {
            throw new AppError("Inbox item not found", "NOT_FOUND", "validation", false, 404);
          }

          return { item };
        }

        case "mark_processed": {
          const createdTaskId = data?.createdTaskId ?? undefined;
          await markAsProcessedService(userId, params.itemId, createdTaskId);
          const item = await getInboxItemService(userId, params.itemId);
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
  )(request);
}

export async function DELETE(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleAuth(
    z.void(),
    SuccessResponseSchema,
    async (_, userId: string): Promise<{ success: boolean }> => {
      await deleteInboxItemService(userId, params.itemId);

      return { success: true };
    },
  )(request);
}
