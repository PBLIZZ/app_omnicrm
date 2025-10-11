import { handleAuth } from "@/lib/api";
import { InboxService } from "@/server/services/inbox.service";
import {
  ProcessInboxItemSchema,
  InboxProcessResultResponseSchema,
} from "@/server/db/business-schemas";

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
    try {
      const result = await InboxService.processInboxItem(userId, processData);
      return { result };
    } catch (error) {
      // Handle specific error types with proper error messages
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          const notFoundError: Error & { status?: number } = new Error("Inbox item not found");
          notFoundError.status = 404;
          throw notFoundError;
        }

        if (error.message.includes("OpenRouter not configured")) {
          const serviceError: Error & { status?: number } = new Error("AI processing is not available");
          serviceError.status = 503;
          throw serviceError;
        }

        if (error.message.includes("AI categorization failed")) {
          const serviceError: Error & { status?: number } = new Error("AI processing temporarily unavailable");
          serviceError.status = 503;
          throw serviceError;
        }
      }

      // Re-throw the original error for other cases
      throw error;
    }
  }
);