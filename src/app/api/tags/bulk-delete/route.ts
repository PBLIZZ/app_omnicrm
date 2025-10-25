import { handleAuth } from "@/lib/api";
import { deleteTagsBulkService } from "@/server/services/tags.service";
import {
  BulkDeleteTagsBodySchema,
  BulkDeleteTagsResponseSchema,
  type BulkDeleteTagsResponse,
} from "@/server/db/business-schemas/tags";

/**
 * DELETE /api/tags/bulk-delete - Bulk delete tags
 */
export const DELETE = handleAuth(
  BulkDeleteTagsBodySchema,
  BulkDeleteTagsResponseSchema,
  async (data, userId): Promise<BulkDeleteTagsResponse> => {
    return await deleteTagsBulkService(userId, data);
  },
);

