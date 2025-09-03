import { z } from 'zod';

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

// Owner types for embeddings
export const EmbeddingOwnerType = {
  INTERACTION: 'interaction',
  DOCUMENT: 'document',
  CONTACT: 'contact',
  CALENDAR_EVENT: 'calendar_event',
  AI_INSIGHT: 'ai_insight',
  KB_ARTICLE: 'kb_article',
} as const;

// Embedding models and dimensions
export const EmbeddingModel = {
  TEXT_EMBEDDING_3_LARGE: 'text-embedding-3-large',
  TEXT_EMBEDDING_3_SMALL: 'text-embedding-3-small', 
  TEXT_EMBEDDING_ADA_002: 'text-embedding-ada-002',
} as const;

export const ModelDimensions = {
  [EmbeddingModel.TEXT_EMBEDDING_3_LARGE]: 3072,
  [EmbeddingModel.TEXT_EMBEDDING_3_SMALL]: 1536,
  [EmbeddingModel.TEXT_EMBEDDING_ADA_002]: 1536,
} as const;

export type Embedding = z.infer<typeof EmbeddingSchema>;
export type NewEmbedding = z.infer<typeof NewEmbeddingSchema>;
export type EmbeddingChunk = z.infer<typeof EmbeddingChunkSchema>;
export type EmbeddingOwnerType = typeof EmbeddingOwnerType[keyof typeof EmbeddingOwnerType];
export type EmbeddingModel = typeof EmbeddingModel[keyof typeof EmbeddingModel];