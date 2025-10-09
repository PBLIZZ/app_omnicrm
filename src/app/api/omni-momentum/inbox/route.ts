import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { InboxService } from "@/server/services/inbox.service";
import {
  GetInboxQuerySchema,
  InboxListResponseSchema,
  InboxStatsResponseSchema,
  InboxPostRequestSchema,
  InboxItemResponseSchema,
  InboxProcessResultResponseSchema,
} from "@/server/db/business-schemas";

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
      const statsResult = await InboxService.getInboxStats(userId);
      if (!statsResult.success) {
        throw ApiError.internalServerError(
          statsResult.error.message,
          statsResult.error.details,
        );
      }

      return { stats: statsResult.data };
    }

    const filterParams = InboxService.extractFilterParams(query);
    const listResult = await InboxService.listInboxItems(userId, filterParams);

    if (!listResult.success) {
      throw ApiError.internalServerError(listResult.error.message, listResult.error.details);
    }

    const items = listResult.data;
    return {
      items,
      total: items.length,
    };
  },
);

export const POST = handleAuth(
  InboxPostRequestSchema,
  InboxItemResponseSchema.or(InboxProcessResultResponseSchema),
  async (requestData, userId) => {
    const { type, data } = requestData;

    switch (type) {
      case "quick_capture": {
        const result = await InboxService.quickCapture(userId, data);
        if (!result.success) {
          throw ApiError.internalServerError(result.error.message, result.error.details);
        }
        return { item: result.data };
      }

      case "voice_capture": {
        const result = await InboxService.voiceCapture(userId, data);
        if (!result.success) {
          throw ApiError.internalServerError(result.error.message, result.error.details);
        }
        return { item: result.data };
      }

      case "bulk_process": {
        const result = await InboxService.bulkProcessInbox(userId, data);
        if (!result.success) {
          throw ApiError.internalServerError(result.error.message, result.error.details);
        }
        return { result: result.data };
      }

      default: {
        throw new Error("Invalid request type");
      }
    }
  },
);
