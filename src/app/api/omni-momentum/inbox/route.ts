import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import {
  getInboxStatsService,
  extractFilterParams,
  listInboxItemsService,
  quickCaptureService,
  voiceCaptureService,
  bulkProcessInboxService,
} from "@/server/services/inbox.service";
import {
  GetInboxQuerySchema,
  InboxListResponseSchema,
  InboxStatsResponseSchema,
  InboxPostRequestSchema,
  InboxItemResponseSchema,
  InboxProcessResultResponseSchema,
} from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * Inbox API - Quick capture and list inbox items
 *
 * This API handles the "dump everything" inbox where wellness practitioners
 * can quickly capture thoughts/tasks for AI processing later.
 */

/**
 * Transform URL query strings to typed parameters
 * Business logic: Convert string dates and booleans to proper types
 */
function transformQueryParams(query: z.infer<typeof GetInboxQuerySchema>): {
  status?: ("unprocessed" | "processed" | "archived")[] | undefined;
  search?: string | undefined;
  createdAfter?: Date | undefined;
  createdBefore?: Date | undefined;
  hasAiSuggestions?: boolean | undefined;
  stats?: boolean | undefined;
} {
  return {
    ...query,
    createdAfter: query.createdAfter ? new Date(query.createdAfter) : undefined,
    createdBefore: query.createdBefore ? new Date(query.createdBefore) : undefined,
    hasAiSuggestions:
      query.hasAiSuggestions === "true"
        ? true
        : query.hasAiSuggestions === "false"
          ? false
          : undefined,
    stats: query.stats === "true" ? true : query.stats === "false" ? false : undefined,
  };
}

export const GET = handleGetWithQueryAuth(
  GetInboxQuerySchema,
  InboxListResponseSchema.or(InboxStatsResponseSchema),
  async (
    query,
    userId,
  ): Promise<
    z.infer<typeof InboxListResponseSchema> | z.infer<typeof InboxStatsResponseSchema>
  > => {
    const wantsStats = query.stats === "true"; // Check string directly

    if (wantsStats) {
      const stats = await getInboxStatsService(userId);
      return { stats };
    }

    const transformedQuery = transformQueryParams(query);
    const filterParams = extractFilterParams(transformedQuery);
    const items = await listInboxItemsService(userId, filterParams);
    return {
      items,
      total: items.length,
    };
  },
);

export const POST = handleAuth(
  InboxPostRequestSchema,
  InboxItemResponseSchema.or(InboxProcessResultResponseSchema),
  async (
    requestData,
    userId,
  ): Promise<
    z.infer<typeof InboxItemResponseSchema> | z.infer<typeof InboxProcessResultResponseSchema>
  > => {
    const { type, data } = requestData;

    switch (type) {
      case "quick_capture": {
        const item = await quickCaptureService(userId, data);
        return { item };
      }

      case "voice_capture": {
        const item = await voiceCaptureService(userId, data);
        return { item };
      }

      case "bulk_process": {
        const result = await bulkProcessInboxService(userId, data);
        return { result };
      }

      default: {
        throw new Error("Invalid request type");
      }
    }
  },
);
