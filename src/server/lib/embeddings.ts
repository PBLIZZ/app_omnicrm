// Shared embedding generation utility with Redis caching
import { createHash } from "crypto";
import { generateEmbedding } from "@/server/ai/embeddings";
import { redisGet, redisSet } from "./redis-client";

const EMBEDDING_TTL_SECONDS = 60 * 60; // 1 hour

function buildCacheKey(text: string): string {
  const hash = createHash("sha256").update(text).digest("hex");
  return `embedding:${hash}`;
}

/**
 * Get or generate embedding for text with Redis caching
 * @param text - The text to generate embedding for
 * @returns Promise<number[]> - The embedding vector
 */
export async function getOrGenerateEmbedding(text: string): Promise<number[]> {
  const cacheKey = buildCacheKey(text);

  const cached = await redisGet<number[]>(cacheKey);
  if (cached) {
    try {
      if (Array.isArray(cached) && cached.every((item) => typeof item === "number")) {
        return cached;
      } else {
        // Invalid array structure, treat as cache miss
        console.warn("Cached embedding has invalid structure, regenerating");
        // Note: redisDel function not available, cache will be overwritten on next write
      }
    } catch (error) {
      // If parsing fails fall through to regeneration
      console.warn("Failed to parse cached embedding, regenerating", error);
      // Note: redisDel function not available, cache will be overwritten on next write
    }
  }

  const embedding = await generateEmbedding(text);

  await redisSet(cacheKey, embedding, EMBEDDING_TTL_SECONDS).catch((error: unknown) => {
    console.warn("Failed to cache embedding", { error });
  });

  return embedding;
}
