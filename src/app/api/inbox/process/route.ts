import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { InboxService } from "@/server/services/inbox.service";
import { ProcessInboxItemDTOSchema, type ProcessInboxItemDTO } from "@omnicrm/contracts";

/**
 * Inbox Processing API - AI-powered categorization of inbox items
 *
 * This endpoint handles the AI processing of individual inbox items,
 * analyzing raw text and converting it into categorized tasks with
 * suggested zones, priorities, and project assignments.
 */

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "inbox_ai_process" },
  validation: {
    body: ProcessInboxItemDTOSchema as unknown as z.ZodSchema,
  },
})(async ({ userId, validated }) => {
  try {
    const processData = validated.body as ProcessInboxItemDTO;
    const result = await InboxService.processInboxItem(userId, processData);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Failed to process inbox item with AI:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });
      }

      if (error.message.includes("OpenRouter not configured")) {
        return NextResponse.json({ error: "AI processing is not available" }, { status: 503 });
      }

      if (error.message.includes("AI categorization failed")) {
        return NextResponse.json(
          { error: "AI processing temporarily unavailable" },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({ error: "Failed to process inbox item" }, { status: 500 });
  }
});
