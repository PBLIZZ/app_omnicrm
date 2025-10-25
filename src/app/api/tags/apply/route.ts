import { handleAuth } from "@/lib/api";
import { applyTagsService } from "@/server/services/tags.service";
import { ApplyTagsBodySchema } from "@/server/db/business-schemas/tags";
import { z } from "zod";

const ApplyTagsResponseSchema = z.object({
  applied: z.number(),
});

/**
 * POST /api/tags/apply - Apply tags to entities
 */
export const POST = handleAuth(
  ApplyTagsBodySchema,
  ApplyTagsResponseSchema,
  async (data, userId): Promise<{ applied: number }> => {
    return await applyTagsService(userId, data);
  },
);

