/**
 * Inbox Queue Service
 *
 * This service handles queuing inbox items for background intelligent processing.
 * Items are queued immediately and processed later by the background service.
 */

import { createInboxRepository } from "@repo";
import { logger } from "@/lib/observability";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";

interface QueuedItem {
  inboxItemId: string;
  userId: string;
  rawText: string;
  queuedAt: Date;
  priority: "low" | "medium" | "high";
}

/**
 * Queue an inbox item for intelligent processing
 */
export async function queueInboxItemForProcessing(
  userId: string,
  inboxItemId: string,
  rawText: string,
  priority: "low" | "medium" | "high" = "medium",
): Promise<void> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    // Update the inbox item to mark it as queued for processing
    await inboxRepo.updateInboxItem(userId, inboxItemId, {
      details: {
        queuedForProcessing: true,
        queuedAt: new Date().toISOString(),
        priority,
        status: "queued",
      },
    });

    await logger.info("Inbox item queued for intelligent processing", {
      operation: "queue_inbox_item",
      additionalData: { userId, inboxItemId, priority },
    });
  } catch (error) {
    await logger.error("Failed to queue inbox item for processing", {
      operation: "queue_inbox_item",
      additionalData: { userId, inboxItemId, error },
    });
    throw new AppError("Failed to queue item for processing", "DB_ERROR", "database", false);
  }
}

/**
 * Get all queued items for processing
 */
export async function getQueuedItemsForProcessing(): Promise<QueuedItem[]> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    // Get all inbox items that are queued for processing
    const allItems = await inboxRepo.listInboxItems("", { status: ["unprocessed"] });

    const queuedItems: QueuedItem[] = [];

    for (const item of allItems.items) {
      if (
        item.details &&
        typeof item.details === "object" &&
        "queuedForProcessing" in item.details &&
        (item.details as any).queuedForProcessing === true
      ) {
        queuedItems.push({
          inboxItemId: item.id,
          userId: item.userId,
          rawText: item.rawText,
          queuedAt: new Date((item.details as any).queuedAt || item.createdAt),
          priority: (item.details as any).priority || "medium",
        });
      }
    }

    // Sort by priority and queued time
    queuedItems.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // High priority first
      }

      return a.queuedAt.getTime() - b.queuedAt.getTime(); // Earlier items first
    });

    return queuedItems;
  } catch (error) {
    await logger.error("Failed to get queued items for processing", {
      operation: "get_queued_items",
      additionalData: { error },
    });
    throw new AppError("Failed to retrieve queued items", "DB_ERROR", "database", false);
  }
}

/**
 * Mark an item as processed (remove from queue)
 */
export async function markItemAsProcessed(userId: string, inboxItemId: string): Promise<void> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    await inboxRepo.updateInboxItem(userId, inboxItemId, {
      details: {
        processedAt: new Date().toISOString(),
        status: "processed",
      },
    });

    await logger.info("Inbox item marked as processed", {
      operation: "mark_item_processed",
      additionalData: { userId, inboxItemId },
    });
  } catch (error) {
    await logger.error("Failed to mark item as processed", {
      operation: "mark_item_processed",
      additionalData: { userId, inboxItemId, error },
    });
    throw new AppError("Failed to mark item as processed", "DB_ERROR", "database", false);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  totalQueued: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  oldestQueued: Date | null;
}> {
  try {
    const queuedItems = await getQueuedItemsForProcessing();

    const stats = {
      totalQueued: queuedItems.length,
      highPriority: queuedItems.filter((item) => item.priority === "high").length,
      mediumPriority: queuedItems.filter((item) => item.priority === "medium").length,
      lowPriority: queuedItems.filter((item) => item.priority === "low").length,
      oldestQueued: queuedItems.length > 0 ? queuedItems[0]?.queuedAt || null : null,
    };

    return stats;
  } catch (error) {
    await logger.error("Failed to get queue statistics", {
      operation: "get_queue_stats",
      additionalData: { error },
    });
    throw new AppError("Failed to retrieve queue statistics", "DB_ERROR", "database", false);
  }
}
