/**
 * AI Embeddings Module
 *
 * Provides text embedding generation for semantic search and similarity operations.
 * This module serves as a bridge to the LLM service for embedding generation.
 */

import { generateEmbedding as generateEmbeddingFromLLM } from "@/server/ai/llm.service";
import { getDb } from "@/server/db/client";
import { embeddings } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

/**
 * Generate embedding for text content
 *
 * @param text - The text content to embed
 * @param userId - The user ID for quota tracking (optional for backward compatibility)
 * @returns Promise containing the embedding vector
 */
export async function generateEmbedding(text: string, userId?: string): Promise<number[]> {
  // For backward compatibility, use a default user ID if not provided
  const effectiveUserId = userId || "system";

  return generateEmbeddingFromLLM(effectiveUserId, text);
}

/**
 * Generate embedding with content hash for caching
 */
export async function generateEmbeddingWithHash(
  text: string,
  userId: string
): Promise<{ embedding: number[]; contentHash: string }> {
  const contentHash = crypto.createHash("sha256").update(text).digest("hex");
  const embedding = await generateEmbeddingFromLLM(userId, text);

  return { embedding, contentHash };
}

/**
 * Store embedding in the database
 */
export async function storeEmbedding(
  userId: string,
  ownerType: string,
  ownerId: string,
  text: string,
  chunkIndex: number = 0
): Promise<string> {
  const db = await getDb();
  const { embedding, contentHash } = await generateEmbeddingWithHash(text, userId);

  const result = await db
    .insert(embeddings)
    .values({
      userId,
      ownerType,
      ownerId,
      embedding,
      contentHash,
      chunkIndex,
      meta: {
        textLength: text.length,
        generatedAt: new Date().toISOString()
      }
    })
    .returning({ id: embeddings.id });

  const inserted = result[0];
  if (!inserted) {
    throw new Error("Failed to insert embedding record");
  }
  return inserted.id;
}

/**
 * Get existing embedding by content hash to avoid regeneration
 */
export async function getEmbeddingByHash(
  userId: string,
  contentHash: string
): Promise<number[] | null> {
  const db = await getDb();

  const result = await db
    .select({ embedding: embeddings.embedding })
    .from(embeddings)
    .where(and(
      eq(embeddings.userId, userId),
      eq(embeddings.contentHash, contentHash)
    ))
    .limit(1);

  return result[0]?.embedding || null;
}

/**
 * Generate embedding with caching
 */
export async function generateEmbeddingCached(
  text: string,
  userId: string
): Promise<number[]> {
  const contentHash = crypto.createHash("sha256").update(text).digest("hex");

  // Check for existing embedding
  const existingEmbedding = await getEmbeddingByHash(userId, contentHash);
  if (existingEmbedding) {
    return existingEmbedding;
  }

  // Generate new embedding
  return generateEmbeddingFromLLM(userId, text);
}

/**
 * Generate embeddings for multiple text chunks
 */
export async function generateBulkEmbeddings(
  texts: string[],
  userId: string
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await generateEmbeddingFromLLM(userId, text);
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i];
    const bVal = b[i];
    if (aVal !== undefined && bVal !== undefined) {
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find similar embeddings using cosine similarity
 */
export async function findSimilarEmbeddings(
  targetEmbedding: number[],
  userId: string,
  ownerType?: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<Array<{ id: string; ownerId: string; similarity: number }>> {
  const db = await getDb();

  // Build query conditions
  const conditions = [eq(embeddings.userId, userId)];
  if (ownerType) {
    conditions.push(eq(embeddings.ownerType, ownerType));
  }

  const results = await db
    .select({
      id: embeddings.id,
      ownerId: embeddings.ownerId,
      embedding: embeddings.embedding
    })
    .from(embeddings)
    .where(and(...conditions));

  // Calculate similarities
  const similarities = results
    .map(result => {
      if (!result.embedding) return null;

      const similarity = cosineSimilarity(targetEmbedding, result.embedding);
      return {
        id: result.id,
        ownerId: result.ownerId,
        similarity
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarities;
}