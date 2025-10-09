import {
  ProcessInboxItemSchema,
  InboxProcessResultResponseSchema,
} from "@/server/db/business-schemas";
import { handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { InboxService } from "@/server/services/inbox.service";

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
  async (processData, userId) => {
    const result = await InboxService.processInboxItem(userId, processData);

    if (!result.success) {
      if (result.error.code === "INBOX_ITEM_NOT_FOUND") {
        throw ApiError.notFound(result.error.message, result.error.details);
      }

      if (result.error.message.includes("OpenRouter not configured")) {
        throw new ApiError("AI processing is not available", 503, result.error.details);
      }

      if (result.error.code === "INBOX_PROCESS_ERROR") {
        throw new ApiError("AI processing temporarily unavailable", 503, result.error.details);
      }

      throw ApiError.internalServerError(result.error.message, result.error.details);
    }

    return { result: result.data };
  }
);
