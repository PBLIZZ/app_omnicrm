import { handleAuth } from "@/lib/api";
import { removeTagsService } from "@/server/services/tags.service";
import { RemoveTagsBodySchema } from "@/server/db/business-schemas/tags";
import { z } from "zod";

const RemoveTagsResponseSchema = z.object({
  removed: z.number(),
});

/**
 * DELETE /api/tags/remove - Remove tags from entities
 */
export const DELETE = handleAuth(
  RemoveTagsBodySchema,
  RemoveTagsResponseSchema,
  async (data, userId): Promise<{ removed: number }> => {
    return await removeTagsService(userId, data);
  },
);

