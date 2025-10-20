/**
 * Enhanced Inbox Service with Intelligent Processing
 *
 * This service extends the basic inbox functionality with intelligent AI processing
 * that can split bulk input into individual tasks, categorize by zones, assign to projects,
 * and detect task hierarchies with HITL approval workflow.
 */

import { createInboxRepository } from "@repo";
import { logger } from "@/lib/observability";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";
import { queueInboxItemForProcessing, getQueueStats } from "./inbox-queue.service";
import { assertOpenRouterConfigured } from "@/server/ai/providers/openrouter";
import { z } from "zod";

// Enhanced schemas for intelligent processing
export const IntelligentQuickCaptureSchema = z.object({
  rawText: z.string().min(1),
  enableIntelligentProcessing: z.boolean().default(true),
  source: z.string().optional().default("manual"),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
});

export const IntelligentProcessingResponseSchema = z.object({
  inboxItem: z.any(), // InboxItem type
  queued: z.boolean(),
  message: z.string(),
  queueStats: z
    .object({
      totalQueued: z.number(),
      highPriority: z.number(),
      mediumPriority: z.number(),
      lowPriority: z.number(),
    })
    .optional(),
});

export type IntelligentQuickCapture = z.infer<typeof IntelligentQuickCaptureSchema>;
export type IntelligentProcessingResponse = z.infer<typeof IntelligentProcessingResponseSchema>;

/**
 * Enhanced quick capture with intelligent processing queue
 */
export async function intelligentQuickCaptureService(
  userId: string,
  data: IntelligentQuickCapture,
): Promise<IntelligentProcessingResponse> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    // Create the inbox item first
    const inboxItem = await inboxRepo.createInboxItem({
      userId,
      rawText: data.rawText,
    });

    if (!data.enableIntelligentProcessing) {
      // Return basic response for non-intelligent processing
      return {
        inboxItem,
        queued: false,
        message: "Inbox item created successfully. Use manual processing to categorize.",
      };
    }

    // Check if AI processing is available
    let aiAvailable = true;
    try {
      assertOpenRouterConfigured();
    } catch (error) {
      aiAvailable = false;
      await logger.warn("AI processing not available, queuing for later processing", {
        operation: "intelligent_quick_capture",
        additionalData: { userId, error: error instanceof Error ? error.message : "Unknown error" },
      });
    }

    // Queue the item for background processing
    await queueInboxItemForProcessing(
      userId,
      inboxItem.id,
      data.rawText,
      data.priority || "medium",
    );

    // Get queue stats
    const queueStats = await getQueueStats();

    await logger.info("Inbox item queued for intelligent processing", {
      operation: "intelligent_quick_capture",
      additionalData: {
        userId,
        inboxItemId: inboxItem.id,
        priority: data.priority,
        aiAvailable,
        queueStats,
      },
    });

    return {
      inboxItem,
      queued: true,
      message: aiAvailable
        ? `Item queued for intelligent processing. ${queueStats.totalQueued} items in queue.`
        : `Item queued for processing when AI becomes available. ${queueStats.totalQueued} items in queue.`,
      queueStats,
    };
  } catch (error) {
    await logger.error("Intelligent quick capture failed", {
      operation: "intelligent_quick_capture",
      additionalData: { userId, error },
    });

    throw new AppError(
      error instanceof Error ? error.message : "Failed to process intelligent quick capture",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get queue statistics for the user
 */
export async function getQueueStatsService(): Promise<{
  totalQueued: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  oldestQueued: Date | null;
}> {
  try {
    return await getQueueStats();
  } catch (error) {
    await logger.error("Failed to get queue statistics", {
      operation: "get_queue_stats_service",
      additionalData: { error },
    });
    throw new AppError("Failed to retrieve queue statistics", "DB_ERROR", "database", false);
  }
}

/**
 * Check if intelligent processing is available
 */
export async function isIntelligentProcessingAvailable(): Promise<boolean> {
  try {
    assertOpenRouterConfigured();
    return true;
  } catch {
    return false;
  }
}
