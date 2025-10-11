import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  CreateEmbeddingBodySchema,
  EmbeddingListResponseSchema,
  EmbeddingQuerySchema,
  EmbeddingResponseSchema,
  type EmbeddingListResponse,
  type EmbeddingResponse,
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

    const params: Parameters<typeof listEmbeddingsService>[1] = {
      page,
      pageSize,
    };

    // Only add optional properties if defined (exactOptionalPropertyTypes requirement)
    if (order !== undefined) params.order = order;
    if (ownerType !== undefined) params.ownerType = [ownerType];
    if (ownerId !== undefined) params.ownerId = ownerId;
    if (hasEmbedding !== undefined) params.hasEmbedding = hasEmbedding;
    if (after !== undefined) params.createdAfter = after;
    if (before !== undefined) params.createdBefore = before;

    const { items, total } = await listEmbeddingsService(userId, params);

    return {
      items,
      pagination: buildPagination(page, pageSize, total),
    };
  },
);

export const POST = handleAuth(
  CreateEmbeddingBodySchema,
  EmbeddingResponseSchema,
  async (data, userId): Promise<EmbeddingResponse> => {
    const input: Parameters<typeof createEmbeddingService>[1] = {
      ownerType: data.ownerType,
      ownerId: data.ownerId,
    };

    // Only add optional properties if defined (exactOptionalPropertyTypes requirement)
    if (data.embedding !== undefined) input.embedding = data.embedding;
    if (data.embeddingV !== undefined) input.embeddingV = data.embeddingV;
    if (data.contentHash !== undefined) input.contentHash = data.contentHash;
    if (data.chunkIndex !== undefined) input.chunkIndex = data.chunkIndex;
    if (data.meta !== undefined) input.meta = data.meta;

    const item = await createEmbeddingService(userId, input);
    return { item };
  },
);
