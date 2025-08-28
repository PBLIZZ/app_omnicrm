/** GET /api/debug/pipeline-status — check complete pipeline status (auth required). */
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { rawEvents, interactions, embeddings } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { err, ok } from "@/server/http/responses";
import { log } from "@/server/log";
import { toApiError } from "@/server/jobs/types";

export async function GET(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  try {
    const db = await getDb();
    
    // Check raw_events
    const gmailRawEvents = await db
      .select({
        id: rawEvents.id,
        sourceId: rawEvents.sourceId,
        createdAt: rawEvents.createdAt,
        sourceMeta: rawEvents.sourceMeta,
      })
      .from(rawEvents)
      .where(and(
        eq(rawEvents.userId, userId),
        eq(rawEvents.provider, "gmail")
      ))
      .orderBy(desc(rawEvents.createdAt))
      .limit(5);
    
    // Check interactions
    const gmailInteractions = await db
      .select({
        id: interactions.id,
        subject: interactions.subject,
        sourceId: interactions.sourceId,
        createdAt: interactions.createdAt,
        bodyText: interactions.bodyText,
      })
      .from(interactions)
      .where(and(
        eq(interactions.userId, userId),
        eq(interactions.source, "gmail")
      ))
      .orderBy(desc(interactions.createdAt))
      .limit(5);
    
    // Check embeddings
    const interactionEmbeddings = await db
      .select({
        id: embeddings.id,
        ownerId: embeddings.ownerId,
        createdAt: embeddings.createdAt,
        meta: embeddings.meta,
      })
      .from(embeddings)
      .where(and(
        eq(embeddings.userId, userId),
        eq(embeddings.ownerType, "interaction")
      ))
      .orderBy(desc(embeddings.createdAt))
      .limit(5);
    
    // Cross-reference to see complete pipeline items
    const pipelineItems = gmailRawEvents.map(rawEvent => {
      // Find matching interaction
      const matchingInteraction = gmailInteractions.find(
        interaction => interaction.sourceId === rawEvent.sourceId
      );
      
      // Find matching embedding
      const matchingEmbedding = matchingInteraction 
        ? interactionEmbeddings.find(embedding => embedding.ownerId === matchingInteraction.id)
        : null;
      
      return {
        rawEventId: rawEvent.id,
        sourceId: rawEvent.sourceId,
        rawEventCreated: rawEvent.createdAt,
        
        interactionId: matchingInteraction?.id ?? null,
        subject: matchingInteraction?.subject ?? null,
        interactionCreated: matchingInteraction?.createdAt ?? null,
        bodyPreview: matchingInteraction?.bodyText ? matchingInteraction.bodyText.slice(0, 100) + "..." : null,
        
        embeddingId: matchingEmbedding?.id ?? null,
        embeddingCreated: matchingEmbedding?.createdAt ?? null,
        embeddingMeta: matchingEmbedding?.meta ?? null,
        
        stages: {
          rawEvent: true,
          interaction: !!matchingInteraction,
          embedding: !!matchingEmbedding,
        },
        
        completionPercentage: [
          true, // raw event exists
          !!matchingInteraction,
          !!matchingEmbedding,
        ].filter(Boolean).length / 3 * 100,
      };
    });
    
    const summary = {
      totalRawEvents: gmailRawEvents.length,
      totalInteractions: gmailInteractions.length,
      totalEmbeddings: interactionEmbeddings.length,
      
      fullyProcessed: pipelineItems.filter(item => item.completionPercentage === 100).length,
      partiallyProcessed: pipelineItems.filter(item => item.completionPercentage > 0 && item.completionPercentage < 100).length,
      unprocessed: pipelineItems.filter(item => item.completionPercentage === 0).length,
    };
    
    log.info({ 
      userId, 
      summary,
      pipelineItemsCount: pipelineItems.length
    }, "pipeline_status_checked");
    
    return ok({
      success: true,
      summary,
      pipelineItems,
      recommendations: [
        summary.totalRawEvents === 0 ? "Run /api/debug/gmail-simple-insert to get Gmail data" : null,
        summary.totalInteractions < summary.totalRawEvents ? "Run /api/debug/process-gmail to extract structured data" : null,
        summary.totalEmbeddings < summary.totalInteractions ? "Run /api/debug/embed-gmail to generate embeddings" : null,
        summary.fullyProcessed > 0 ? "Pipeline working! You have complete email processing." : null,
      ].filter(Boolean),
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error({ userId, error: errorMsg }, "pipeline_status_check_failed");
    
    return err(500, "Failed to check pipeline status");
  }
}