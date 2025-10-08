import { z } from "zod";

import { handleAuthWithParams } from "@/lib/api";
import {
  EmbeddingResponseSchema,
  UpdateEmbeddingBodySchema,
} from "@/server/db/business-schemas/embeddings";
import {
  deleteEmbeddingService,
  updateEmbeddingService,
} from "@/server/services/embeddings.service";

const ParamsSchema = z.object({
  embeddingId: z.string().uuid(),
});

const DeleteResponseSchema = z.object({
  deleted: z.number(),
});

export const PATCH = handleAuthWithParams(
  UpdateEmbeddingBodySchema,
  EmbeddingResponseSchema,
  async (data, userId, params): Promise<{ item: z.infer<typeof EmbeddingResponseSchema>["item"] }> => {
    const { embeddingId } = ParamsSchema.parse(params);
    const updatePayload = {
      ...(data.ownerType && { ownerType: data.ownerType }),
      ...(data.ownerId && { ownerId: data.ownerId }),
      ...(data.embedding !== undefined && { embedding: data.embedding }),
      ...(data.embeddingV !== undefined && { embeddingV: data.embeddingV }),
      ...(data.contentHash !== undefined && { contentHash: data.contentHash }),
      ...(data.chunkIndex !== undefined && { chunkIndex: data.chunkIndex }),
      ...(data.meta !== undefined && { meta: data.meta }),
    };
    const item = await updateEmbeddingService(userId, embeddingId, updatePayload);
    return { item };
  },
);

export const DELETE = handleAuthWithParams(
  z.void(),
  DeleteResponseSchema,
  async (_voidInput, userId, params): Promise<{ deleted: number }> => {
    const { embeddingId } = ParamsSchema.parse(params);
    return await deleteEmbeddingService(userId, embeddingId);
  },
);
