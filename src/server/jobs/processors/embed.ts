import { getDb } from "@/server/db/client";
import { drizzleAdminGuard } from "@/server/db/admin";
import { embeddings, interactions, documents } from "@/server/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { generateEmbedding } from "@/server/ai/llm.service";
import { buildEmbedInput } from "@/server/prompts/embed.prompt";
import { logger } from "@/lib/observability";
import type { JobRecord } from "../types";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * Process embedding generation for interactions and documents
 * Finds items missing embeddings and generates vectors for semantic search
 */
export async function runEmbed(job: JobRecord<"embed">): Promise<void> {
  const startTime = Date.now();
  const db = await getDb();
  const maxItems = 50; // Process in batches to avoid timeouts

  try {
    const payload = job.payload;
    const ownerType = payload.ownerType;
    const ownerId = payload.ownerId;
    const batchMaxItems = payload.maxItems ?? maxItems;

    await logger.info("Starting embedding generation", {
      operation: "embed_process",
      additionalData: {
        userId: job.userId,
        ownerType,
        ownerId,
        maxItems: batchMaxItems,
        jobId: job.id,
      },
    });

    let processedItems = 0;
    let generatedEmbeddings = 0;
    let skippedItems = 0;

    if (ownerType === "interaction" && ownerId) {
      // Process specific interaction
      const results = await processSpecificInteraction(db, job.userId, ownerId);
      processedItems = 1;
      generatedEmbeddings = results.generated ? 1 : 0;
      skippedItems = results.generated ? 0 : 1;
    } else if (ownerType === "document" && ownerId) {
      // Process specific document
      const results = await processSpecificDocument(db, job.userId, ownerId);
      processedItems = 1;
      generatedEmbeddings = results.generated ? 1 : 0;
      skippedItems = results.generated ? 0 : 1;
    } else {
      // Process batch of items missing embeddings
      const results = await processMissingEmbeddings(db, job.userId, batchMaxItems);
      processedItems = results.processed;
      generatedEmbeddings = results.generated;
      skippedItems = results.skipped;
    }

    const duration = Date.now() - startTime;
    await logger.info("Embedding generation completed", {
      operation: "embed_process",
      additionalData: {
        userId: job.userId,
        processedItems,
        generatedEmbeddings,
        skippedItems,
        duration,
        jobId: job.id,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    await logger.error(
      "Embedding generation failed",
      {
        operation: "embed_process",
        additionalData: {
          userId: job.userId,
          duration,
          jobId: job.id,
        },
      },
      ensureError(error),
    );
    throw error;
  }
}

/**
 * Process a specific interaction for embedding
 */
async function processSpecificInteraction(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  interactionId: string,
): Promise<{ generated: boolean }> {
  // Check if embedding already exists
  const [existingEmbedding] = await db
    .select({ id: embeddings.id })
    .from(embeddings)
    .where(
      and(
        eq(embeddings.userId, userId),
        eq(embeddings.ownerType, "interaction"),
        eq(embeddings.ownerId, interactionId),
      ),
    )
    .limit(1);

  if (existingEmbedding) {
    return { generated: false }; // Already exists
  }

  // Get the interaction
  const [interaction] = await db
    .select()
    .from(interactions)
    .where(and(eq(interactions.id, interactionId), eq(interactions.userId, userId)))
    .limit(1);

  if (!interaction) {
    await logger.warn("Interaction not found for embedding", {
      operation: "embed_process",
      additionalData: {
        userId,
        interactionId,
      },
    });
    return { generated: false };
  }

  // Generate embedding content
  const textContent = buildEmbedInput({
    text: `${interaction.subject ?? ""} ${interaction.bodyText ?? ""}`.trim(),
  });

  if (!textContent || textContent.length < 10) {
    return { generated: false }; // Skip items with insufficient content
  }

  // Generate embedding vector
  const embeddingVector = await generateEmbedding(userId, textContent);

  // Store embedding
  await drizzleAdminGuard.insert("embeddings", {
    userId,
    ownerType: "interaction",
    ownerId: interactionId,
    embedding: embeddingVector,
    meta: {
      type: interaction.type,
      source: interaction.source,
      contentLength: textContent.length,
      generatedAt: new Date().toISOString(),
    },
  });

  return { generated: true };
}

/**
 * Process a specific document for embedding
 */
async function processSpecificDocument(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  documentId: string,
): Promise<{ generated: boolean }> {
  // Check if embedding already exists
  const [existingEmbedding] = await db
    .select({ id: embeddings.id })
    .from(embeddings)
    .where(
      and(
        eq(embeddings.userId, userId),
        eq(embeddings.ownerType, "document"),
        eq(embeddings.ownerId, documentId),
      ),
    )
    .limit(1);

  if (existingEmbedding) {
    return { generated: false }; // Already exists
  }

  // Get the document
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);

  if (!document) {
    await logger.warn("Document not found for embedding", {
      operation: "embed_process",
      additionalData: {
        userId,
        documentId,
      },
    });
    return { generated: false };
  }

  // Generate embedding content
  const docTitle = document.title ?? "";
  const docContent = document.textContent ?? "";
  const textContent = buildEmbedInput({
    text: `${docTitle} ${docContent}`.trim(),
  });

  if (!textContent || textContent.length < 10) {
    return { generated: false }; // Skip items with insufficient content
  }

  // Generate embedding vector
  const embeddingVector = await generateEmbedding(userId, textContent);

  // Store embedding
  await drizzleAdminGuard.insert("embeddings", {
    userId,
    ownerType: "document",
    ownerId: documentId,
    embedding: embeddingVector,
    meta: {
      title: document.title,
      mime: document.mime,
      contentLength: textContent.length,
      generatedAt: new Date().toISOString(),
    },
  });

  return { generated: true };
}

/**
 * Process items missing embeddings in batch
 */
async function processMissingEmbeddings(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  maxItems: number,
): Promise<{ processed: number; generated: number; skipped: number }> {
  let processed = 0;
  let generated = 0;
  let skipped = 0;

  // Find interactions without embeddings
  const interactionsWithoutEmbeddings = await db
    .select({
      id: interactions.id,
      type: interactions.type,
      subject: interactions.subject,
      bodyText: interactions.bodyText,
      source: interactions.source,
    })
    .from(interactions)
    .leftJoin(
      embeddings,
      and(
        eq(embeddings.ownerId, interactions.id),
        eq(embeddings.ownerType, "interaction"),
        eq(embeddings.userId, userId),
      ),
    )
    .where(
      and(
        eq(interactions.userId, userId),
        isNull(embeddings.id), // No embedding exists
      ),
    )
    .orderBy(desc(interactions.createdAt))
    .limit(Math.floor(maxItems / 2)); // Reserve half for documents

  for (const interaction of interactionsWithoutEmbeddings) {
    const textContent = buildEmbedInput({
      text: `${interaction.subject ?? ""} ${interaction.bodyText ?? ""}`.trim(),
    });

    processed++;

    if (!textContent || textContent.length < 10) {
      skipped++;
      continue;
    }

    try {
      const embeddingVector = await generateEmbedding(userId, textContent);

      await drizzleAdminGuard.insert("embeddings", {
        userId,
        ownerType: "interaction",
        ownerId: interaction.id,
        embedding: embeddingVector,
        meta: {
          type: interaction.type,
          source: interaction.source,
          contentLength: textContent.length,
          generatedAt: new Date().toISOString(),
        },
      });

      generated++;
    } catch (error) {
      await logger.warn("Failed to generate embedding for interaction", {
        operation: "embed_process",
        additionalData: {
          userId,
          interactionId: interaction.id,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      skipped++;
    }
  }

  // Find documents without embeddings
  const documentsWithoutEmbeddings = await db
    .select({
      id: documents.id,
      title: documents.title,
      textContent: documents.textContent,
      mime: documents.mime,
    })
    .from(documents)
    .leftJoin(
      embeddings,
      and(
        eq(embeddings.ownerId, documents.id),
        eq(embeddings.ownerType, "document"),
        eq(embeddings.userId, userId),
      ),
    )
    .where(
      and(
        eq(documents.userId, userId),
        isNull(embeddings.id), // No embedding exists
      ),
    )
    .orderBy(desc(documents.createdAt))
    .limit(maxItems - processed); // Use remaining capacity

  for (const document of documentsWithoutEmbeddings) {
    const docTitle = document.title ?? "";
    const docContent = document.textContent ?? "";
    const textContent = buildEmbedInput({
      text: `${docTitle} ${docContent}`.trim(),
    });

    processed++;

    if (!textContent || textContent.length < 10) {
      skipped++;
      continue;
    }

    try {
      const embeddingVector = await generateEmbedding(userId, textContent);

      await drizzleAdminGuard.insert("embeddings", {
        userId,
        ownerType: "document",
        ownerId: document.id,
        embedding: embeddingVector,
        meta: {
          title: document.title,
          mime: document.mime,
          contentLength: textContent.length,
          generatedAt: new Date().toISOString(),
        },
      });

      generated++;
    } catch (error) {
      await logger.warn("Failed to generate embedding for document", {
        operation: "embed_process",
        additionalData: {
          userId,
          documentId: document.id,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      skipped++;
    }
  }

  return { processed, generated, skipped };
}
