import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  CreateEmbeddingBodySchema,
  EmbeddingListResponseSchema,
  EmbeddingQuerySchema,
  EmbeddingResponseSchema,
  type EmbeddingListResponse,
} from "@/server/db/business-schemas/embeddings";
import {
  createEmbeddingService,
  listEmbeddingsService,
} from "@/server/services/embeddings.service";
import { buildPagination } from "@/app/api/data-intelligence/pagination";

export const GET = handleGetWithQueryAuth(
  EmbeddingQuerySchema,
  EmbeddingListResponseSchema,
  async (query, userId): Promise<EmbeddingListResponse> => {
    const { page, pageSize, ownerType, ownerId, hasEmbedding, after, before, order } = query;

    const { items, total } = await listEmbeddingsService(userId, {
      ownerType: ownerType ? [ownerType] : undefined,
      ownerId,
      hasEmbedding,
      createdAfter: after,
      createdBefore: before,
      page,
      pageSize,
      order,
    });

    return {
      items,
      pagination: buildPagination(page, pageSize, total),
    };
  },
);

export const POST = handleAuth(
  CreateEmbeddingBodySchema,
  EmbeddingResponseSchema,
  async (data, userId) => {
    const item = await createEmbeddingService(userId, data);
    return { item };
  },
);
