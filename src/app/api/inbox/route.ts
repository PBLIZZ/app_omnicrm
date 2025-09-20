import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { InboxService } from "@/server/services/inbox.service";
import { z } from "zod";
import {
  CreateInboxItemDTOSchema,
  InboxFiltersSchema,
  VoiceInboxCaptureDTOSchema,
  BulkProcessInboxDTOSchema,
} from "@omnicrm/contracts";

/**
 * Inbox API - Quick capture and list inbox items
 *
 * This API handles the "dump everything" inbox where wellness practitioners
 * can quickly capture thoughts/tasks for AI processing later.
 */

// Query schema for GET requests
const GetInboxQuerySchema = z.object({
  status: z.array(z.enum(["unprocessed", "processed", "archived"])).optional(),
  search: z.string().optional(),
  createdAfter: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  createdBefore: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  hasAiSuggestions: z.string().optional().transform(val => val === "true"),
  stats: z.string().optional().transform(val => val === "true"),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "inbox_list" },
  validation: {
    query: GetInboxQuerySchema.optional(),
  },
})(async ({ userId, validated }) => {
  try {
    const filters = validated?.query;
    const wantsStats = filters?.stats ?? false;

    if (wantsStats) {
      // Return inbox statistics
      const stats = await InboxService.getInboxStats(userId);
      return NextResponse.json({ stats });
    } else {
      // Return inbox items with filtering
      const { stats: _, ...filterParams } = filters || {};
      const items = await InboxService.listInboxItems(userId, filterParams);
      return NextResponse.json({
        items,
        total: items.length,
      });
    }
  } catch (error) {
    console.error("Failed to fetch inbox items:", error);
    return NextResponse.json(
      { error: "Failed to fetch inbox items" },
      { status: 500 }
    );
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "inbox_create" },
  validation: {
    body: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("quick_capture"),
        data: CreateInboxItemDTOSchema,
      }),
      z.object({
        type: z.literal("voice_capture"),
        data: VoiceInboxCaptureDTOSchema,
      }),
      z.object({
        type: z.literal("bulk_process"),
        data: BulkProcessInboxDTOSchema,
      }),
    ]),
  },
})(async ({ userId, validated }) => {
  try {
    const { type, data } = validated.body;

    switch (type) {
      case "quick_capture": {
        const item = await InboxService.quickCapture(userId, data);
        return NextResponse.json({ item }, { status: 201 });
      }

      case "voice_capture": {
        const item = await InboxService.voiceCapture(userId, data);
        return NextResponse.json({ item }, { status: 201 });
      }

      case "bulk_process": {
        const result = await InboxService.bulkProcessInbox(userId, data);
        return NextResponse.json({ result }, { status: 200 });
      }

      default: {
        return NextResponse.json(
          { error: "Invalid request type" },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error("Failed to process inbox request:", error);
    return NextResponse.json(
      { error: "Failed to process inbox request" },
      { status: 500 }
    );
  }
});