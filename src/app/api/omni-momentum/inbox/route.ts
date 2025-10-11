import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { InboxService } from "@/server/services/inbox.service";
import {
  GetInboxQuerySchema,
  InboxListResponseSchema,
  InboxStatsResponseSchema,
  InboxPostRequestSchema,
  InboxItemResponseSchema,
  InboxProcessResultResponseSchema,
} from "@/server/db/business-schemas";
import { isErr } from "@/lib/utils/result";

/**
 * Inbox API - Quick capture and list inbox items
 *
 * This API handles the "dump everything" inbox where wellness practitioners
 * can quickly capture thoughts/tasks for AI processing later.
 */

export const GET = handleGetWithQueryAuth(
  GetInboxQuerySchema,
  InboxListResponseSchema.or(InboxStatsResponseSchema),
  async (query, userId) => {
    const wantsStats = query.stats ?? false;

    if (wantsStats) {
      // Return inbox statistics
      const stats = await InboxService.getInboxStats(userId);
      return { stats };
    } else {
      // Return inbox items with filtering
      const filterParams = InboxService.extractFilterParams(query);
      const result = await InboxService.listInboxItems(userId, filterParams);

      if (isErr(result)) {
        throw new Error(result.error.message || "Failed to list inbox items");
      }

      // Type guard ensures result.data is available
      if (!result.ok) {
        throw new Error("Failed to list inbox items");
      }

      const items = result.data;
      return {
        items,
        total: items.length,
      };
    }
  },
);

export const POST = handleAuth(
  InboxPostRequestSchema,
  InboxItemResponseSchema.or(InboxProcessResultResponseSchema),
  async (requestData, userId) => {
    const { type, data } = requestData;

    switch (type) {
      case "quick_capture": {
        const item = await InboxService.quickCapture(userId, data);
        return { item };
      }

      case "voice_capture": {
        const item = await InboxService.voiceCapture(userId, data);
        return { item };
      }

      case "bulk_process": {
        const result = await InboxService.bulkProcessInbox(userId, data);
        return { result };
      }

      default: {
        throw new Error("Invalid request type");
      }
    }
  },
);
