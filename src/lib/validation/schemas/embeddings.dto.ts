import { z } from "zod";

// Mirror the embeddings table structure with Zod validation
export const EmbeddingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  ownerType: z.string(),
  ownerId: z.string().uuid(),
  meta: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  // Vector fields (handled separately in database layer)
  embedding: z.unknown().nullable(), // Original vector column
  embeddingV: z.array(z.number()).nullable(), // New vector(1536) column
  contentHash: z.string().nullable(),
  chunkIndex: z.number().int().nullable(),
});

export const NewEmbeddingSchema = EmbeddingSchema.omit({
  id: true,
  createdAt: true,
});

export const EmbeddingChunkSchema = z.object({
  userId: z.string().uuid(),
  ownerType: z.string(),
  ownerId: z.string().uuid(),
  contentHash: z.string(),
  chunkIndex: z.number().int(),
  chunkText: z.string(),
  embedding: z.array(z.number()),
  meta: z.record(z.string(), z.unknown()).optional(),
});


export type Embedding = z.infer<typeof EmbeddingSchema>;
export type NewEmbedding = z.infer<typeof NewEmbeddingSchema>;
export type EmbeddingChunk = z.infer<typeof EmbeddingChunkSchema>;
