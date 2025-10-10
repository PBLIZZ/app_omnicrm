/**
 * Inbox Service for AI-Powered Quick Capture and Task Categorization
 *
 * This service handles the "dump everything" inbox where wellness practitioners can
 * quickly capture thoughts/tasks and let AI automatically categorize them into
 * life-business zones and convert them into actionable tasks.
 */
import { createInboxRepository, createZonesRepository } from "@repo";
import type { InboxFilters as RepoInboxFilters, InboxItem as RepoInboxItem } from "@repo";
import { logger } from "@/lib/observability";
import { AppError } from "@/lib/errors/app-error";
import type {
  InboxProcessingResultDTO,
  BulkProcessInboxDTO,
  ProcessInboxItemDTO,
  UpdateInboxItem,
  VoiceInboxCaptureDTO,
} from "@/server/db/business-schemas/productivity";
import type { InboxItem, Zone } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { categorizeInboxItem } from "@/server/ai/connect/categorize-inbox-item";
import type { InboxProcessingContext } from "@/server/db/business-schemas";
import { assertOpenRouterConfigured } from "@/server/ai/providers/openrouter";

export interface InboxFilters extends RepoInboxFilters {
  hasAiSuggestions?: boolean;
}

type QuickCaptureInput = {
  rawText: string;
  status?: "unprocessed" | "processed" | "archived" | undefined;
  createdTaskId?: string | null | undefined;
};

/**
 * Map InboxItem with default values for required fields
 */
function mapToInboxItem(rawItem: RepoInboxItem): InboxItem {
  return {
    id: rawItem.id,
    userId: rawItem.userId,
    rawText: rawItem.rawText,
    status: rawItem.status ?? "unprocessed",
    createdTaskId: rawItem.createdTaskId,
    processedAt: rawItem.processedAt,
    createdAt: rawItem.createdAt ?? new Date(),
    updatedAt: rawItem.updatedAt ?? new Date(),
  };
}

/**
 * Build processing context for AI categorization
 */
function buildProcessingContext(zones: Zone[]): InboxProcessingContext {
  return {
    zones,
  };
}

const transformInboxItem = mapToInboxItem;

/**
 * Quick capture - Create a new inbox item
 */
export async function quickCaptureService(
  userId: string,
  data: QuickCaptureInput,
): Promise<InboxItem> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    const rawItem = await inboxRepo.createInboxItem({
      ...data,
      userId,
    });

    return transformInboxItem(rawItem);
  } catch (error) {
    await logger.error("Failed to create inbox item", {
      operation: "inbox_quick_capture",
      additionalData: { userId, error },
    });
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create inbox item",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Voice capture with transcription
 */
export async function voiceCaptureService(
  userId: string,
  data: VoiceInboxCaptureDTO,
): Promise<InboxItem> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    const rawItem = await inboxRepo.createInboxItem({
      rawText: data.transcription ?? "",
      userId,
    });

    return transformInboxItem(rawItem);
  } catch (error) {
    await logger.error("Failed to create voice inbox item", {
      operation: "inbox_voice_capture",
      additionalData: { userId, error },
    });
    throw new AppError(
      error instanceof Error ? error.message : "Error creating voice inbox item",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * List inbox items with filtering
 */
export async function listInboxItemsService(
  userId: string,
  filters?: InboxFilters,
): Promise<InboxItem[]> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    const { hasAiSuggestions: _ignored, ...repoFilters } = filters ?? {};
    const rawItems = await inboxRepo.listInboxItems(userId, repoFilters as RepoInboxFilters);

    return rawItems.map((item) => transformInboxItem(item));
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Error listing inbox items",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Extract supported filter parameters from the query object
 */
export function extractFilterParams(query: {
  status?: ("unprocessed" | "processed" | "archived")[] | undefined;
  search?: string | undefined;
  createdAfter?: Date | undefined;
  createdBefore?: Date | undefined;
  hasAiSuggestions?: boolean | undefined;
  stats?: boolean | undefined;
}): InboxFilters {
  const { stats: _stats, hasAiSuggestions, ...rest } = query ?? {};

  const filters: InboxFilters = {};

  if (Array.isArray(rest.status) && rest.status.length > 0) {
    filters.status = rest.status;
  }

  if (typeof rest.search === "string" && rest.search.trim().length > 0) {
    filters.search = rest.search;
  }

  if (rest.createdAfter instanceof Date) {
    filters.createdAfter = rest.createdAfter;
  }

  if (rest.createdBefore instanceof Date) {
    filters.createdBefore = rest.createdBefore;
  }

  if (typeof hasAiSuggestions === "boolean") {
    filters.hasAiSuggestions = hasAiSuggestions;
  }

  return filters;
}

/**
 * Get inbox statistics including recent activity count
 */
export async function getInboxStatsService(userId: string): Promise<{
  unprocessed: number;
  processed: number;
  archived: number;
  total: number;
  recentActivity: number;
}> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    const stats = await inboxRepo.getInboxStats(userId);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentItems = await inboxRepo.listInboxItems(userId, {
      createdAfter: oneDayAgo,
    });

    return {
      ...stats,
      recentActivity: recentItems.length,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Error fetching inbox statistics",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Delete an inbox item
 */
export async function deleteInboxItemService(userId: string, itemId: string): Promise<boolean> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    return await inboxRepo.deleteInboxItem(userId, itemId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Error deleting inbox item",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get single inbox item
 */
export async function getInboxItemService(
  userId: string,
  itemId: string,
): Promise<InboxItem | null> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    const rawItem = await inboxRepo.getInboxItemById(userId, itemId);
    return rawItem ? transformInboxItem(rawItem) : null;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Error getting inbox item",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Update an inbox item
 */
export async function updateInboxItemService(
  userId: string,
  itemId: string,
  data: UpdateInboxItem,
): Promise<InboxItem | null> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    const { id: _ignoredId, ...rest } = data;

    const updateData: Partial<{
      rawText: string;
      status: "unprocessed" | "processed" | "archived";
      createdTaskId: string | null;
    }> = {};

    if (rest.rawText !== undefined) {
      updateData.rawText = rest.rawText;
    }

    if (rest.status !== undefined && rest.status !== null) {
      updateData.status = rest.status;
    }

    if (rest.createdTaskId !== undefined) {
      updateData.createdTaskId = rest.createdTaskId;
    }

    const rawItem = await inboxRepo.updateInboxItem(userId, itemId, updateData);
    return rawItem ? transformInboxItem(rawItem) : null;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Error updating inbox item",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * AI-powered processing of a single inbox item
 */
export async function processInboxItemService(
  userId: string,
  data: ProcessInboxItemDTO,
): Promise<InboxProcessingResultDTO> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);
  const zonesRepo = createZonesRepository(db);

  try {
    // Check OpenRouter configuration first
    assertOpenRouterConfigured();

    const rawItem = await inboxRepo.getInboxItemById(userId, data.itemId);
    if (!rawItem) {
      throw new AppError("Inbox item not found", "NOT_FOUND", "database", false, 404);
    }

    const rawZones = await zonesRepo.listZones();
    const processingContext = buildProcessingContext(rawZones);

    const categorization = await categorizeInboxItem(userId, rawItem.rawText, processingContext);

    switch (data.action) {
      case "archive":
        await inboxRepo.updateInboxItem(userId, data.itemId, {
          status: "archived",
        });
        break;
      case "delete":
        await inboxRepo.deleteInboxItem(userId, data.itemId);
        break;
      case "create_task":
      default:
        await inboxRepo.markAsProcessed(userId, data.itemId, data.taskData?.projectId);
        break;
    }

    const normalized: InboxProcessingResultDTO = {
      ...categorization,
      suggestedProject: categorization.suggestedProject ?? null,
      extractedTasks: categorization.extractedTasks.map((task) => ({
        ...task,
        dueDate:
          task.dueDate != null
            ? task.dueDate instanceof Date
              ? task.dueDate
              : new Date(task.dueDate)
            : null,
      })),
    };

    return normalized;
  } catch (error) {
    await logger.error("Failed to process inbox item", {
      operation: "inbox_ai_processing",
      additionalData: { userId, itemId: data.itemId, error },
    });

    // Handle specific error types
    if (error instanceof Error) {
      // OpenRouter not configured
      if (error.message.includes("OpenRouter") || error.message.includes("not configured")) {
        throw new AppError(
          "AI processing is not available",
          "SERVICE_UNAVAILABLE",
          "system",
          true,
          503,
        );
      }

      // AI processing failures
      if (error.message.includes("categorize") || error.message.includes("AI")) {
        throw new AppError(
          "AI processing temporarily unavailable",
          "SERVICE_UNAVAILABLE",
          "system",
          true,
          503,
        );
      }
    }

    // Generic error
    throw new AppError(
      error instanceof Error ? error.message : "Error processing inbox item",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Bulk process inbox items
 */
export async function bulkProcessInboxService(
  userId: string,
  data: BulkProcessInboxDTO,
): Promise<{ processed: InboxItem[]; results?: InboxProcessingResultDTO[] }> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    if (data.itemIds.length === 0) {
      return { processed: [] };
    }

    if (data.action === "archive") {
      const updated = await inboxRepo.bulkUpdateStatus(userId, data.itemIds, "archived");
      return { processed: updated.map((item) => transformInboxItem(item)) };
    }

    if (data.action === "delete") {
      await inboxRepo.bulkDeleteInboxItems(userId, data.itemIds);
      return { processed: [] };
    }

    assertOpenRouterConfigured();

    const zonesRepo = createZonesRepository(db);
    const rawZones = await zonesRepo.listZones();
    const processingContext = buildProcessingContext(rawZones);

    const processed: InboxItem[] = [];
    const results: InboxProcessingResultDTO[] = [];

    for (const itemId of data.itemIds) {
      const rawItem = await inboxRepo.getInboxItemById(userId, itemId);
      if (!rawItem || rawItem.status === "archived") {
        continue;
      }

      const categorization = await categorizeInboxItem(userId, rawItem.rawText, processingContext);

      const normalized: InboxProcessingResultDTO = {
        ...categorization,
        suggestedProject: categorization.suggestedProject ?? null,
        extractedTasks: categorization.extractedTasks.map((task) => ({
          ...task,
          dueDate:
            task.dueDate != null
              ? task.dueDate instanceof Date
                ? task.dueDate
                : new Date(task.dueDate)
              : null,
        })),
      };

      results.push(normalized);

      const marked = await inboxRepo.markAsProcessed(userId, itemId);
      if (marked) {
        processed.push(transformInboxItem(marked));
      }
    }

    return { processed, results };
  } catch (error) {
    await logger.error("Failed to bulk process inbox items", {
      operation: "inbox_bulk_process",
      additionalData: { userId, action: data.action, error },
    });
    throw new AppError(
      error instanceof Error ? error.message : "Error bulk processing inbox items",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Mark an inbox item as processed
 */
export async function markAsProcessedService(
  userId: string,
  itemId: string,
  createdTaskId?: string,
): Promise<InboxItem | null> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    const rawItem = await inboxRepo.markAsProcessed(userId, itemId, createdTaskId);
    return rawItem ? transformInboxItem(rawItem) : null;
  } catch (error) {
    await logger.error(
      "Error marking inbox item as processed",
      {
        operation: "inbox_mark_processed",
        userId,
        additionalData: { itemId },
      },
      error instanceof Error ? error : undefined,
    );
    throw new AppError(
      error instanceof Error ? error.message : "Error marking inbox item as processed",
      "DB_ERROR",
      "database",
      false,
    );
  }
}
