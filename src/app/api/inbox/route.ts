import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { InboxService } from "@/server/services/inbox.service";
import { z } from "zod";
import {
  CreateInboxItemDTOSchema,
  VoiceInboxCaptureDTOSchema,
  BulkProcessInboxDTOSchema,
  type CreateInboxItemDTO,
  type VoiceInboxCaptureDTO,
  type BulkProcessInboxDTO,
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
  createdAfter: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  createdBefore: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  hasAiSuggestions: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  stats: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validatedQuery = GetInboxQuerySchema.optional().parse(
      Object.fromEntries(searchParams.entries()),
    );

    const wantsStats = validatedQuery?.stats ?? false;

    if (wantsStats) {
      // Return inbox statistics
      const stats = await InboxService.getInboxStats(userId);
      return NextResponse.json({ stats });
    } else {
      // Return inbox items with filtering
      const filterParams = InboxService.extractFilterParams(validatedQuery);
      const items = await InboxService.listInboxItems(userId, filterParams);
      return NextResponse.json({
        items,
        total: items.length,
      });
    }
  } catch (error) {
    console.error("Failed to fetch inbox items:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to fetch inbox items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body: unknown = await request.json();

    // Validate request body
    const validatedBody = z
      .discriminatedUnion("type", [
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
      ])
      .parse(body);

    const { type, data } = validatedBody;

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
        return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
      }
    }
  } catch (error) {
    console.error("Failed to process inbox request:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to process inbox request" }, { status: 500 });
  }
}
