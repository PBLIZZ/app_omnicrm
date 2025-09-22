import { z } from "zod";

// ============================================================================
// EMBEDDINGS DTO SCHEMAS - Aligned with database schema
// ============================================================================

// Full embedding schema (mirrors embeddings table structure)
export const EmbeddingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  ownerType: z.string(), // interaction | document | contact | calendar_event
  ownerId: z.string().uuid(),
  meta: z.unknown().nullable(), // JSONB field
  createdAt: z.string().datetime(), // ISO string format
  // Vector fields (handled separately in database layer)
  embedding: z.unknown().nullable(), // vector(1536) column
  embeddingV: z.unknown().nullable(), // vector(1536) column
  contentHash: z.string().nullable(),
  chunkIndex: z.number().int().nullable(),
});

// Schema for creating new embeddings
export const NewEmbeddingSchema = EmbeddingSchema.omit({
  id: true,
  createdAt: true,
});

// Schema for updating existing embeddings
export const UpdateEmbeddingSchema = EmbeddingSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
});

// Schema for embedding chunks (processing intermediate)
export const EmbeddingChunkSchema = z.object({
  userId: z.string().uuid(),
  ownerType: z.string(),
  ownerId: z.string().uuid(),
  contentHash: z.string(),
  chunkIndex: z.number().int(),
  chunkText: z.string(),
  embedding: z.array(z.number()), // Array of numbers for vector
  meta: z.unknown().optional(), // JSONB field
});

// Schema for embedding queries/searches
export const EmbeddingQuerySchema = z.object({
  ownerType: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  contentHash: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});


// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Embedding = z.infer<typeof EmbeddingSchema>;
export type NewEmbedding = z.infer<typeof NewEmbeddingSchema>;
export type UpdateEmbedding = z.infer<typeof UpdateEmbeddingSchema>;
export type EmbeddingChunk = z.infer<typeof EmbeddingChunkSchema>;
export type EmbeddingQuery = z.infer<typeof EmbeddingQuerySchema>;
