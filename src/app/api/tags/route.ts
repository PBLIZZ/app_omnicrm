import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  listTagsService,
  createTagService,
} from "@/server/services/tags.service";
import {
  GetTagsQuerySchema,
  CreateTagBodySchema,
  TagListResponseSchema,
  TagResponseSchema,
  type TagListResponse,
  type Tag,
} from "@/server/db/business-schemas/tags";

/**
 * GET /api/tags - List tags with pagination and filtering
 */
export const GET = handleGetWithQueryAuth(
  GetTagsQuerySchema,
  TagListResponseSchema,
  async (query, userId): Promise<TagListResponse> => {
    const { search, category, sort, order } = query;
    return await listTagsService(userId, {
      page: query.page,
      pageSize: query.pageSize,
      ...(search !== undefined && { search }),
      ...(category !== undefined && { category }),
      ...(sort !== undefined && { sort }),
      ...(order !== undefined && { order }),
    });
  },
);

/**
 * POST /api/tags - Create new tag
 */
export const POST = handleAuth(CreateTagBodySchema, TagResponseSchema, async (data, userId): Promise<{ item: Tag }> => {
  return { item: await createTagService(userId, data) };
});

