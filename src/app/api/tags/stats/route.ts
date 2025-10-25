import { handleGetWithQueryAuth } from "@/lib/api";
import { getTagUsageStatsService } from "@/server/services/tags.service";
import {
  TagUsageStatsResponseSchema,
  type TagUsageStatsResponse,
} from "@/server/db/business-schemas/tags";
import { z } from "zod";

/**
 * GET /api/tags/stats - Get tag usage statistics
 */
export const GET = handleGetWithQueryAuth(
  z.object({}),
  TagUsageStatsResponseSchema,
  async (_, userId): Promise<TagUsageStatsResponse> => {
    const stats = await getTagUsageStatsService(userId);
    return { stats };
  },
);

