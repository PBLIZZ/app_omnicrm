/**
 * AI Embeddings Module
 *
 * Provides text embedding generation for semantic search and similarity operations.
 * This module serves as a bridge to the LLM service for embedding generation.
 */

import { getDb } from "@/server/db/client";
import { embeddings } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import { getOpenAIClient, isOpenAIConfigured } from "@/server/ai/providers/openai";
import { parseEnvBool } from "@/lib/utils/env-helpers";

function parseEmbeddingValue(value: string | null): number[] | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every((item): item is number => typeof item === "number" && Number.isFinite(item))
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate embedding for text content
 *
 * @param text - The text content to embed
 * @param userId - The user ID for quota tracking (optional for backward compatibility)
 * @returns Promise containing the embedding vector
 */
export async function generateEmbedding(text: string, userId?: string): Promise<number[]> {
  // Check if we should use mock mode
  if (parseEnvBool(process.env["EMBEDDINGS_MOCK"])) {
    console.warn("Using mock embeddings - not suitable for production");
    return generateEmbeddingFromLLM(userId ?? "mock", text);
  }

  // Use real OpenAI embeddings
  if (!isOpenAIConfigured()) {
    throw new Error(
      "OpenAI API key not configured. Set OPENAI_API_KEY environment variable or use EMBEDDINGS_MOCK=true for development",
    );
  }

  try {
    const client = getOpenAIClient();
    const response = await client.embeddings.create({
      model: "text-embedding-3-small", // Using the latest small model for cost efficiency
      input: text,
    });

    // Validate response structure and fail loudly if missing
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      throw new Error(
        `Invalid embedding response: missing or empty data array. Model: text-embedding-3-small`,
      );
    }

    const embedding = response.data[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error(
        `Invalid embedding response: missing or invalid embedding vector. Data: ${JSON.stringify(response.data[0])}`,
      );
    }

    return embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate embedding with content hash for caching
 */
export async function generateEmbeddingWithHash(
  text: string,
  userId: string,
): Promise<{ embedding: number[]; contentHash: string }> {
  const contentHash = createHash("sha256").update(text).digest("hex");
  const embedding = await generateEmbedding(text, userId);

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
  chunkIndex: number = 0,
): Promise<string> {
  const db = await getDb();
  const { embedding, contentHash } = await generateEmbeddingWithHash(text, userId);
  const embeddingJson = JSON.stringify(embedding);

  const result = await db
    .insert(embeddings)
    .values({
      userId,
      ownerType,
      ownerId,
      embedding: embeddingJson,
      contentHash,
      chunkIndex,
      meta: {
        textLength: text.length,
        generatedAt: new Date().toISOString(),
      },
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
  contentHash: string,
): Promise<number[] | null> {
  const db = await getDb();

  const result = await db
    .select({ embedding: embeddings.embedding })
    .from(embeddings)
    .where(and(eq(embeddings.userId, userId), eq(embeddings.contentHash, contentHash)))
    .limit(1);

  return parseEmbeddingValue(result[0]?.embedding ?? null);
}

/**
 * Generate embedding with caching
 */
export async function generateEmbeddingCached(text: string, userId: string): Promise<number[]> {
  const contentHash = createHash("sha256").update(text).digest("hex");

  // Check for existing embedding
  const existingEmbedding = await getEmbeddingByHash(userId, contentHash);
  if (existingEmbedding) {
    return existingEmbedding;
  }

  // Generate new embedding
  return generateEmbedding(text, userId);
}

/**
 * Generate embeddings for multiple text chunks
 */
export async function generateBulkEmbeddings(texts: string[], userId: string): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text, userId);
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
  threshold: number = 0.7,
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
      embedding: embeddings.embedding,
    })
    .from(embeddings)
    .where(and(...conditions));

  // Calculate similarities
  const similarities = results
    .map((result) => {
      const vector = parseEmbeddingValue(result.embedding);
      if (!vector) return null;

      const similarity = cosineSimilarity(targetEmbedding, vector);
      return {
        id: result.id,
        ownerId: result.ownerId,
        similarity,
      };
    })
    .filter(
      (item): item is NonNullable<typeof item> => item !== null && item.similarity >= threshold,
    )
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarities;
}

export async function generateEmbeddingFromLLM(userId: string, text: string): Promise<number[]> {
  // Mock implementation for development/testing when EMBEDDINGS_MOCK=true
  console.warn(`Generating mock embedding for userId: ${userId}, text length: ${text.length}`);

  // Generate deterministic mock embeddings based on text content for consistency
  const hash = createHash("sha256").update(text).digest("hex");
  const seed = parseInt(hash.substring(0, 8), 16);

  // Use seeded random for consistent mock embeddings in [-1, 1] range
  const mockEmbedding = Array.from({ length: 1536 }, (_, i) => {
    return Math.sin(seed + i);
  });

  return mockEmbedding;
}
