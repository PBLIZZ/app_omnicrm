import {
  ProcessInboxItemSchema,
  InboxProcessResultResponseSchema,
} from "@/server/db/business-schemas";
import { handleAuth } from "@/lib/api";
import { processInboxItemService } from "@/server/services/inbox.service";
import { z } from "zod";

/**
 * Inbox Processing API - AI-powered categorization of inbox items
 *
 * This endpoint handles the AI processing of individual inbox items,
 * analyzing raw text and converting it into categorized tasks with
 * suggested zones, priorities, and project assignments.
 */

export const POST = handleAuth(
  ProcessInboxItemSchema,
  InboxProcessResultResponseSchema,
  async (processData, userId): Promise<z.infer<typeof InboxProcessResultResponseSchema>> => {
    const result = await processInboxItemService(userId, processData);
    return { result };
  },
);
