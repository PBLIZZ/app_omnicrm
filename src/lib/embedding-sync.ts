// ===== 4. EMBEDDING SYNC SYSTEM (app/lib/embedding-sync.ts) =====
// This system keeps embeddings in sync when data changes

import { generateEmbedding } from "@/server/ai/embeddings";
import { getSupabaseServerClient } from "@/server/db/supabase/server";
import { logger } from "@/lib/observability";

interface EmbeddingData {
  content_type: string;
  content_id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

// Generate and store embedding for a document
export async function syncDocumentEmbedding(data: EmbeddingData): Promise<void> {
  const startTime = Date.now();

  try {
    const supabase = getSupabaseServerClient();

    // Generate embedding
    const textToEmbed = `${data.title} ${data.content}`.trim();
    const embedding = await generateEmbedding(textToEmbed);

    // Upsert embedding to database
    const { error } = await supabase.from("document_embeddings").upsert(
      {
        content_type: data.content_type,
        content_id: data.content_id,
        title: data.title,
        content: data.content,
        metadata: data.metadata,
        embedding,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "content_type,content_id",
      },
    );

    if (error) throw error;

    const duration = Date.now() - startTime;

    await logger.info("Successfully synced embedding", {
      operation: "embedding_sync.single",
      content_type: data.content_type,
      content_id: data.content_id,
      duration,
    } as any);
  } catch (error) {
    const duration = Date.now() - startTime;

    await logger.error("Failed to sync embedding", {
      operation: "embedding_sync.single",
      content_type: data.content_type,
      content_id: data.content_id,
      duration,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    } as any);

    // Rethrow so callers can handle failures upstream
    throw error;
  }
}

// Delete embedding when document is deleted
export async function deleteDocumentEmbedding(
  contentType: string,
  contentId: string,
): Promise<void> {
  const startTime = Date.now();

  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("document_embeddings")
      .delete()
      .match({ content_type: contentType, content_id: contentId });

    if (error) throw error;

    const duration = Date.now() - startTime;

    await logger.info("Successfully deleted embedding", {
      operation: "embedding_sync.delete",
      content_type: contentType,
      content_id: contentId,
      duration,
    } as any);
  } catch (error) {
    const duration = Date.now() - startTime;

    await logger.error("Failed to delete embedding", {
      operation: "embedding_sync.delete",
      content_type: contentType,
      content_id: contentId,
      duration,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    } as any);

    // Rethrow so callers can handle failures upstream
    throw error;
  }
}

// Simple concurrency control utility
async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map((task) => task()));
    results.push(...batchResults);
  }

  return results;
}

// Batch sync multiple documents with concurrency control
export async function batchSyncEmbeddings(
  documents: EmbeddingData[],
  concurrency: number = 5,
  delayMs: number = 100,
): Promise<{ successful: number; failed: number; errors: Error[] }> {
  const startTime = Date.now();

  await logger.info("Starting batch embedding sync", {
    operation: "embedding_sync.batch",
    total_documents: documents.length,
    concurrency,
    delay_ms: delayMs,
  } as any);

  // Create tasks with rate limiting
  const tasks = documents.map((doc, index) => async () => {
    // Add delay between task starts (not after the last one)
    if (index > 0 && index < documents.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return syncDocumentEmbedding(doc);
  });

  const results = await withConcurrency(tasks, concurrency);

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => (r.reason instanceof Error ? r.reason : new Error(String(r.reason))));

  const duration = Date.now() - startTime;

  await logger.info("Batch embedding sync completed", {
    operation: "embedding_sync.batch",
    total_documents: documents.length,
    successful,
    failed,
    duration,
    errors: errors.map((e) => e.message),
  } as any);

  return { successful, failed, errors };
}
