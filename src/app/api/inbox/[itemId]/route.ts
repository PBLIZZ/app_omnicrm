import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { InboxService } from "@/server/services/inbox.service";
import { z } from "zod";
import { UpdateInboxItemDTOSchema } from "@omnicrm/contracts";

/**
 * Individual Inbox Item API - Get, update, and delete inbox items
 *
 * This API handles operations on individual inbox items including
 * marking as processed, updating status, and deletion.
 */

interface RouteParams {
  params: { itemId: string };
}

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "inbox_get_item" },
})(async ({ userId }, { params }: RouteParams) => {
  try {
    const item = await InboxService.getInboxItem(userId, params.itemId);

    if (!item) {
      return NextResponse.json(
        { error: "Inbox item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Failed to fetch inbox item:", error);
    return NextResponse.json(
      { error: "Failed to fetch inbox item" },
      { status: 500 }
    );
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
        data: z.object({
          createdTaskId: z.string().uuid().optional(),
        }).optional(),
      }),
    ]),
  },
})(async ({ userId, validated }, { params }: RouteParams) => {
  try {
    const { action, data } = validated.body;

    switch (action) {
      case "update_status": {
        const item = await InboxService.updateInboxItem(userId, params.itemId, data);

        if (!item) {
          return NextResponse.json(
            { error: "Inbox item not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({ item });
      }

      case "mark_processed": {
        const item = await InboxService.markAsProcessed(
          userId,
          params.itemId,
          data?.createdTaskId
        );

        if (!item) {
          return NextResponse.json(
            { error: "Inbox item not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({ item });
      }

      default: {
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error("Failed to update inbox item:", error);
    return NextResponse.json(
      { error: "Failed to update inbox item" },
      { status: 500 }
    );
  }
});

export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "inbox_delete_item" },
})(async ({ userId }, { params }: RouteParams) => {
  try {
    const deleted = await InboxService.deleteInboxItem(userId, params.itemId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Inbox item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete inbox item:", error);
    return NextResponse.json(
      { error: "Failed to delete inbox item" },
      { status: 500 }
    );
  }
});