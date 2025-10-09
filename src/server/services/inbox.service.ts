/**
 * Inbox Service for AI-Powered Quick Capture and Task Categorization
 *
 * This service handles the "dump everything" inbox where wellness practitioners can
 * quickly capture thoughts/tasks and let AI automatically categorize them into
 * life-business zones and convert them into actionable tasks.
 */
import { InboxRepository, ZonesRepository } from "@repo";
import type {
  InboxFilters as RepoInboxFilters,
  InboxItem as RepoInboxItem,
  Zone as RepoZone,
} from "@repo";
import { logger } from "@/lib/observability";
import { DbResult, ok, err } from "@/lib/utils/result";
import type {
  InboxProcessingResultDTO,
  BulkProcessInboxDTO,
  ProcessInboxItemDTO,
  UpdateInboxItem,
  VoiceInboxCaptureDTO,
  InboxItemWithUI,
  ZoneWithUI,
} from "@/server/db/business-schemas/productivity";
import { InboxItemWithUISchema, ZoneWithUISchema } from "@/server/db/business-schemas/productivity";
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

export class InboxService {
  private static transformInboxItem(rawItem: RepoInboxItem): InboxItemWithUI {
    return InboxItemWithUISchema.parse({
      id: rawItem.id,
      userId: rawItem.userId,
      rawText: rawItem.rawText,
      status: rawItem.status ?? "unprocessed",
      createdTaskId: rawItem.createdTaskId,
      processedAt: rawItem.processedAt,
      createdAt: rawItem.createdAt ?? new Date(),
      updatedAt: rawItem.updatedAt ?? new Date(),
    });
  }

  private static transformZoneData(rawZones: RepoZone[]): ZoneWithUI[] {
    return rawZones.map((zone) => ZoneWithUISchema.parse(zone));
  }

  private static buildProcessingContext(zones: ZoneWithUI[]): InboxProcessingContext {
    return {
      zones,
    };
  }

  /**
   * Quick capture - Create a new inbox item
   */
  static async quickCapture(
    userId: string,
    data: QuickCaptureInput,
  ): Promise<DbResult<InboxItemWithUI>> {
    try {
      const db = await getDb();
      const rawItem = await InboxRepository.createInboxItem(db, {
        ...data,
        userId,
      });

      return ok(this.transformInboxItem(rawItem));
    } catch (error) {
      await logger.error("Failed to create inbox item", {
        operation: "inbox_quick_capture",
        additionalData: { userId, error },
      });
      return err({
        code: "INBOX_QUICK_CAPTURE_ERROR",
        message: "Error creating inbox item via quick capture",
        details: error,
      });
    }
  }

  /**
   * Voice capture with transcription
   */
  static async voiceCapture(
    userId: string,
    data: VoiceInboxCaptureDTO,
  ): Promise<DbResult<InboxItemWithUI>> {
    try {
      const db = await getDb();
      const rawItem = await InboxRepository.createInboxItem(db, {
        rawText: data.transcription ?? "",
        userId,
      });

      return ok(this.transformInboxItem(rawItem));
    } catch (error) {
      await logger.error("Failed to create voice inbox item", {
        operation: "inbox_voice_capture",
        additionalData: { userId, error },
      });
      return err({
        code: "INBOX_VOICE_CAPTURE_ERROR",
        message: "Error creating voice inbox item",
        details: error,
      });
    }
  }

  /**
   * List inbox items with filtering
   */
  static async listInboxItems(
    userId: string,
    filters?: InboxFilters,
  ): Promise<DbResult<InboxItemWithUI[]>> {
    try {
      const db = await getDb();
      const { hasAiSuggestions: _ignored, ...repoFilters } = filters ?? {};
      const rawItems = await InboxRepository.listInboxItems(
        db,
        userId,
        repoFilters as RepoInboxFilters,
      );

      return ok(rawItems.map((item) => this.transformInboxItem(item)));
    } catch (error) {
      return err({
        code: "INBOX_LIST_ERROR",
        message: "Error listing inbox items",
        details: error,
      });
    }
  }

  /**
   * Extract supported filter parameters from the query object
   */
  static extractFilterParams(query: {
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
  static async getInboxStats(
    userId: string,
  ): Promise<
    DbResult<{
      unprocessed: number;
      processed: number;
      archived: number;
      total: number;
      recentActivity: number;
    }>
  > {
    try {
      const db = await getDb();
      const stats = await InboxRepository.getInboxStats(db, userId);

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentItems = await InboxRepository.listInboxItems(db, userId, {
        createdAfter: oneDayAgo,
      });

      return ok({
        ...stats,
        recentActivity: recentItems.length,
      });
    } catch (error) {
      return err({
        code: "INBOX_STATS_ERROR",
        message: "Error fetching inbox statistics",
        details: error,
      });
    }
  }

  /**
   * Delete an inbox item
   */
  static async deleteInboxItem(userId: string, itemId: string): Promise<DbResult<boolean>> {
    try {
      const db = await getDb();
      const result = await InboxRepository.deleteInboxItem(db, userId, itemId);
      return ok(result);
    } catch (error) {
      return err({
        code: "INBOX_DELETE_ERROR",
        message: "Error deleting inbox item",
        details: error,
      });
    }
  }

  /**
   * Get single inbox item
   */
  static async getInboxItem(
    userId: string,
    itemId: string,
  ): Promise<DbResult<InboxItemWithUI | null>> {
    try {
      const db = await getDb();
      const rawItem = await InboxRepository.getInboxItemById(db, userId, itemId);
      return ok(rawItem ? this.transformInboxItem(rawItem) : null);
    } catch (error) {
      return err({
        code: "INBOX_GET_ERROR",
        message: "Error getting inbox item",
        details: error,
      });
    }
  }

  /**
   * Update an inbox item
   */
  static async updateInboxItem(
    userId: string,
    itemId: string,
    data: UpdateInboxItem,
  ): Promise<DbResult<InboxItemWithUI | null>> {
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

      const db = await getDb();
      const rawItem = await InboxRepository.updateInboxItem(db, userId, itemId, updateData);
      return ok(rawItem ? this.transformInboxItem(rawItem) : null);
    } catch (error) {
      return err({
        code: "INBOX_UPDATE_ERROR",
        message: "Error updating inbox item",
        details: error,
      });
    }
  }

  /**
   * AI-powered processing of a single inbox item
   */
  static async processInboxItem(
    userId: string,
    data: ProcessInboxItemDTO,
  ): Promise<DbResult<InboxProcessingResultDTO>> {
    try {
      assertOpenRouterConfigured();

      const db = await getDb();
      const rawItem = await InboxRepository.getInboxItemById(db, userId, data.itemId);
      if (!rawItem) {
        return err({
          code: "INBOX_ITEM_NOT_FOUND",
          message: "Inbox item not found",
        });
      }

      const rawZones = await ZonesRepository.listZones(db);
      const zones = this.transformZoneData(rawZones);
      const processingContext = this.buildProcessingContext(zones);

      const categorization = await categorizeInboxItem(userId, rawItem.rawText, processingContext);

      switch (data.action) {
        case "archive":
          await InboxRepository.updateInboxItem(db, userId, data.itemId, {
            status: "archived",
          });
          break;
        case "delete":
          await InboxRepository.deleteInboxItem(db, userId, data.itemId);
          break;
        case "create_task":
        default:
          await InboxRepository.markAsProcessed(db, userId, data.itemId, data.taskData?.projectId);
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

      return ok(normalized);
    } catch (error) {
      await logger.error("Failed to process inbox item", {
        operation: "inbox_ai_processing",
        additionalData: { userId, itemId: data.itemId, error },
      });
      return err({
        code: "INBOX_PROCESS_ERROR",
        message: "Error processing inbox item",
        details: error,
      });
    }
  }

  /**
   * Bulk process inbox items
   */
  static async bulkProcessInbox(
    userId: string,
    data: BulkProcessInboxDTO,
  ): Promise<DbResult<{ processed: InboxItemWithUI[]; results?: InboxProcessingResultDTO[] }>> {
    try {
      const db = await getDb();

      if (data.itemIds.length === 0) {
        return ok({ processed: [] });
      }

      if (data.action === "archive") {
        const updated = await InboxRepository.bulkUpdateStatus(db, userId, data.itemIds, "archived");
        return ok({ processed: updated.map((item) => this.transformInboxItem(item)) });
      }

      if (data.action === "delete") {
        await InboxRepository.bulkDeleteInboxItems(db, userId, data.itemIds);
        return ok({ processed: [] });
      }

      assertOpenRouterConfigured();

      const rawZones = await ZonesRepository.listZones(db);
      const zones = this.transformZoneData(rawZones);
      const processingContext = this.buildProcessingContext(zones);

      const processed: InboxItemWithUI[] = [];
      const results: InboxProcessingResultDTO[] = [];

      for (const itemId of data.itemIds) {
        const rawItem = await InboxRepository.getInboxItemById(db, userId, itemId);
        if (!rawItem || rawItem.status === "archived") {
          continue;
        }

        const categorization = await categorizeInboxItem(
          userId,
          rawItem.rawText,
          processingContext,
        );

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

        const marked = await InboxRepository.markAsProcessed(db, userId, itemId);
        if (marked) {
          processed.push(this.transformInboxItem(marked));
        }
      }

      return ok({ processed, results });
    } catch (error) {
      await logger.error("Failed to bulk process inbox items", {
        operation: "inbox_bulk_process",
        additionalData: { userId, action: data.action, error },
      });
      return err({
        code: "INBOX_BULK_PROCESS_ERROR",
        message: "Error bulk processing inbox items",
        details: error,
      });
    }
  }

  /**
   * Mark an inbox item as processed
   */
  static async markAsProcessed(
    userId: string,
    itemId: string,
    createdTaskId?: string,
  ): Promise<DbResult<InboxItemWithUI | null>> {
    try {
      const db = await getDb();
      const rawItem = await InboxRepository.markAsProcessed(db, userId, itemId, createdTaskId);
      return ok(rawItem ? this.transformInboxItem(rawItem) : null);
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
      return err({
        code: "INBOX_MARK_PROCESSED_ERROR",
        message: "Error marking inbox item as processed",
        details: error,
      });
    }
  }
}
