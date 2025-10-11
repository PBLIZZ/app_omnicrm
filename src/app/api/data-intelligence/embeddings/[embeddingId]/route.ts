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
  async (data, userId, params) => {
    const { embeddingId } = ParamsSchema.parse(params);
    const item = await updateEmbeddingService(userId, embeddingId, data);
    return { item };
  },
);

export const DELETE = handleAuthWithParams(
  z.void(),
  DeleteResponseSchema,
  async (_voidInput, userId, params) => {
    const { embeddingId } = ParamsSchema.parse(params);
    return await deleteEmbeddingService(userId, embeddingId);
  },
);
