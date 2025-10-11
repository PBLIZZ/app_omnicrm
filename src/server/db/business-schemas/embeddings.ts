/**
 * Data Intelligence - Embedding Business Schemas
 *
 * Base drizzle types are re-exported for convenience:
 * - Embedding (select type)
 * - CreateEmbedding (insert type)
 * - UpdateEmbedding (partial insert type)
 */

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { embeddings } from "@/server/db/schema";

export type { Embedding, CreateEmbedding, UpdateEmbedding } from "@/server/db/schema";

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const BaseEmbeddingSchema = createSelectSchema(embeddings);

export const EmbeddingSchema = BaseEmbeddingSchema.extend({
  meta: z.unknown(),
});

export type EmbeddingDTO = z.infer<typeof EmbeddingSchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const EmbeddingPayloadSchema = z.object({
  ownerType: z.string().min(1, "ownerType is required"),
  ownerId: z.string().uuid(),
  embedding: z.string().optional(),
  embeddingV: z.string().optional(),
  contentHash: z.string().optional(),
  chunkIndex: z.coerce.number().int().min(0).optional(),
  meta: z.unknown().optional(),
});

export const CreateEmbeddingBodySchema = EmbeddingPayloadSchema.refine(
  (data) => Boolean(data.embedding) || Boolean(data.embeddingV),
  {
    message: "embedding or embeddingV is required",
    path: ["embedding"],
  },
);

export type CreateEmbeddingBody = z.infer<typeof CreateEmbeddingBodySchema>;

export const UpdateEmbeddingBodySchema = EmbeddingPayloadSchema.partial().superRefine(
  (data, ctx) => {
    if (
      data.embedding === undefined &&
      data.embeddingV === undefined &&
      data.contentHash === undefined &&
      data.meta === undefined &&
      data.chunkIndex === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
    }
  },
);

export type UpdateEmbeddingBody = z.infer<typeof UpdateEmbeddingBodySchema>;

export const EmbeddingQuerySchema = z.object({
  ownerType: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  hasEmbedding: z.boolean().optional(),
  after: z.coerce.date().optional(),
  before: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type EmbeddingQuery = z.infer<typeof EmbeddingQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const EmbeddingListResponseSchema = z.object({
  items: z.array(EmbeddingSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type EmbeddingListResponse = z.infer<typeof EmbeddingListResponseSchema>;

export const EmbeddingResponseSchema = z.object({
  item: EmbeddingSchema,
});

export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;
