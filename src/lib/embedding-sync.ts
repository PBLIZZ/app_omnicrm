// ===== 4. EMBEDDING SYNC SYSTEM (app/lib/embedding-sync.ts) =====
// This system keeps embeddings in sync when data changes

import { generateEmbedding } from "@/server/ai/embeddings";
import { getSupabaseServerClient } from "@/server/db/supabase/server";

interface EmbeddingData {
  content_type: string;
  content_id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

// Generate and store embedding for a document
export async function syncDocumentEmbedding(data: EmbeddingData) {
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

    console.log(`✅ Synced embedding for ${data.content_type}:${data.content_id}`);
  } catch (error) {
    console.error("❌ Failed to sync embedding:", error);
  }
}

// Delete embedding when document is deleted
export async function deleteDocumentEmbedding(contentType: string, contentId: string) {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("document_embeddings")
      .delete()
      .match({ content_type: contentType, content_id: contentId });

    if (error) throw error;

    console.log(`🗑️ Deleted embedding for ${contentType}:${contentId}`);
  } catch (error) {
    console.error("❌ Failed to delete embedding:", error);
  }
}

// Batch sync multiple documents
export async function batchSyncEmbeddings(documents: EmbeddingData[]) {
  console.log(`🔄 Batch syncing ${documents.length} embeddings...`);

  const results = await Promise.allSettled(documents.map((doc) => syncDocumentEmbedding(doc)));

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`✅ Batch sync complete: ${successful} successful, ${failed} failed`);
}
