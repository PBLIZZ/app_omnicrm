import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { InboxService } from "@/server/services/inbox.service";
import { z } from "zod";
import { UpdateInboxItemDTOSchema, type UpdateInboxItemDTO } from "@omnicrm/contracts";

/**
 * Individual Inbox Item API - Get, update, and delete inbox items
 *
 * This API handles operations on individual inbox items including
 * marking as processed, updating status, and deletion.
 */

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "inbox_get_item" },
})(async ({ userId }, _request, routeParams) => {
  try {
    const params = await routeParams?.params;
    if (!params?.["itemId"]) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const itemId = Array.isArray(params["itemId"]) ? params["itemId"][0] : params["itemId"];
    if (!itemId) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await InboxService.getInboxItem(userId, itemId);

    if (!item) {
      return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Failed to fetch inbox item:", error);
    return NextResponse.json({ error: "Failed to fetch inbox item" }, { status: 500 });
  }
});

export const PATCH = createRouteHandler({
  auth: true,
  rateLimit: { operation: "inbox_update_item" },
  validation: {
    body: z.discriminatedUnion("action", [
      z.object({
        action: z.literal("update_status"),
        data: UpdateInboxItemDTOSchema,
      }),
      z.object({
        action: z.literal("mark_processed"),
        data: z
          .object({
            createdTaskId: z.string().uuid().optional(),
          })
          .optional(),
      }),
    ]),
  },
})(async ({ userId, validated }, _request, routeParams) => {
  try {
    const params = await routeParams?.params;
    if (!params?.["itemId"]) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const itemId = Array.isArray(params["itemId"]) ? params["itemId"][0] : params["itemId"];
    if (!itemId) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const { action, data } = validated.body;

    switch (action) {
      case "update_status": {
        const item = await InboxService.updateInboxItem(userId, itemId, data as UpdateInboxItemDTO);

        if (!item) {
          return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });
        }

        return NextResponse.json({ item });
      }

      case "mark_processed": {
        const item = await InboxService.markAsProcessed(userId, itemId, data?.createdTaskId);

        if (!item) {
          return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });
        }

        return NextResponse.json({ item });
      }

      default: {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    }
  } catch (error) {
    console.error("Failed to update inbox item:", error);
    return NextResponse.json({ error: "Failed to update inbox item" }, { status: 500 });
  }
});

export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "inbox_delete_item" },
})(async ({ userId }, _request, routeParams) => {
  try {
    const params = await routeParams?.params;
    if (!params?.["itemId"]) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const itemId = Array.isArray(params["itemId"]) ? params["itemId"][0] : params["itemId"];
    if (!itemId) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const deleted = await InboxService.deleteInboxItem(userId, itemId);

    if (!deleted) {
      return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete inbox item:", error);
    return NextResponse.json({ error: "Failed to delete inbox item" }, { status: 500 });
  }
});
