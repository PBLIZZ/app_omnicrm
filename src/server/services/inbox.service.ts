/**
 * Inbox Service for AI-Powered Quick Capture and Task Categorization
 *
 * This service handles the "dump everything" inbox where wellness practitioners can
 * quickly capture thoughts/tasks and let AI automatically categorize them into
 * life-business zones and convert them into actionable tasks.
 */

import { InboxRepository, ZonesRepository } from "@repo";
import { assertOpenRouterConfigured } from "@/server/ai/providers/openrouter";
import { logger } from "@/lib/observability";
import { DbResult, isErr, Result, ok, err } from "@/lib/utils/result";
import type {
  InboxItem,
  CreateInboxItem,
  UpdateInboxItem,
  InboxProcessingResultDTO,
  ProcessInboxItem,
  BulkProcessInboxDTO,
  VoiceInboxCaptureDTO,
} from "@/server/db/business-schemas/inbox";
import type { Zone } from "@/server/db/business-schemas/zones";
import { ZoneSchema } from "@/server/db/business-schemas/zones";
import { categorizeInboxItem } from "@/server/ai/connect/categorize-inbox-item";

// Repository-compatible filter types
export interface InboxFilters {
  status?: ("unprocessed" | "processed" | "archived")[];
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  hasAiSuggestions?: boolean;
}

export interface InboxAICategorization {
  suggestedZone: string;
  suggestedPriority: "low" | "medium" | "high" | "urgent";
  suggestedProject?: string;
  extractedTasks: Array<{
    name: string;
    description?: string;
    estimatedMinutes?: number;
    dueDate?: Date;
  }>;
  confidence: number;
  reasoning: string;
}

export interface InboxProcessingContext {
  userContext?: {
    currentEnergy: number;
    availableTime: number;
    preferences: {
      preferredZone?: string;
      workingHours?: {
        start: string;
        end: string;
      };
    };
  };
  zones: Zone[];
}

export class InboxService {
  // Helper function to unwrap DbResult
  private static unwrapDbResult<T>(result: DbResult<T>): T {
    if (isErr(result)) {
      const error = result.error as { message: string };
      throw new Error(`Database error: ${error.message}`);
    }
    return (result as { success: true; data: T }).data;
  }

  // Helper function to transform repository inbox item to business schema
  private static transformInboxItem(rawItem: {
    id: string;
    userId: string;
    rawText: string;
    status: "processed" | "unprocessed" | "archived" | null;
    createdTaskId: string | null;
    processedAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }): InboxItem {
    const baseData = {
      id: rawItem.id,
      userId: rawItem.userId,
      rawText: rawItem.rawText,
      status: (rawItem.status || "unprocessed") as "unprocessed" | "processed" | "archived",
      createdTaskId: rawItem.createdTaskId,
      processedAt: rawItem.processedAt,
      createdAt: rawItem.createdAt || new Date(),
      updatedAt: rawItem.updatedAt || new Date(),
    };

    // Apply business schema transform for computed fields
    return {
      ...baseData,
      isProcessed: baseData.status === "processed",
      wordCount: (() => {
        const trimmed = baseData.rawText.trim();
        return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
      })(),
      preview: baseData.rawText.slice(0, 100) + (baseData.rawText.length > 100 ? "..." : ""),
    };
  }

  // Helper function to transform raw zone data to business schema
  private static transformZoneData(
    rawZones: Array<{
      id: number;
      name: string;
      color: string | null;
      iconName: string | null;
    }>,
  ): Zone[] {
    return rawZones.map((zone) => ZoneSchema.parse(zone));
  }

  /**
   * Build processing context with zones and user context
   * @param zones - Available zones for categorization
   * @param userContextData - Optional user context data
   * @returns InboxProcessingContext with zones and optional user context
   */
  private static buildProcessingContext(
    zones: Zone[],
    userContextData?: InboxProcessingContext["userContext"],
  ): InboxProcessingContext {
    const processingContext: InboxProcessingContext = { zones };

    if (userContextData !== undefined) {
      const prefs: { preferredZone?: string; workingHours?: { start: string; end: string } } = {};

      if (userContextData && "preferences" in userContextData && userContextData.preferences) {
        const preferences = userContextData.preferences;
        if (preferences.preferredZone) {
          prefs.preferredZone = preferences.preferredZone;
        }
        if (
          preferences.workingHours &&
          preferences.workingHours.start &&
          preferences.workingHours.end
        ) {
          prefs.workingHours = {
            start: preferences.workingHours.start,
            end: preferences.workingHours.end,
          };
        }
      }

      const userContext: NonNullable<InboxProcessingContext["userContext"]> = {
        currentEnergy: userContextData.currentEnergy ?? 50,
        availableTime: userContextData.availableTime ?? 60,
        preferences: prefs,
      };
      processingContext.userContext = userContext;
    }

    return processingContext;
  }

  /**
   * Quick capture - Create a new inbox item
   */
  static async quickCapture(userId: string, data: CreateInboxItem): Promise<DbResult<InboxItem>> {
    try {
      // createInboxItem returns direct type, not DbResult
      const rawItem = await InboxRepository.createInboxItem({
        ...data,
        userId,
      });

      const item = this.transformInboxItem(rawItem);

      await logger.info("Inbox item created via quick capture", {
        operation: "inbox_quick_capture",
        additionalData: {
          userId,
          itemId: item.id,
          textLength: data.rawText.length,
        },
      });

      return ok(item);
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
  static async voiceCapture(userId: string, data: VoiceInboxCaptureDTO): Promise<DbResult<InboxItem>> {
    try {
      // createInboxItem returns direct type, not DbResult
      const rawItem = await InboxRepository.createInboxItem({
        rawText: data.transcription ?? "",
        userId,
      });

      const item = this.transformInboxItem(rawItem);

      await logger.info("Inbox item created via voice capture", {
        operation: "inbox_voice_capture",
        additionalData: {
          userId,
          itemId: item.id,
          transcriptionLength: data.transcription?.length ?? 0,
          audioDuration: data.duration,
        },
      });

      return ok(item);
    } catch (error) {
      await logger.error("Failed to create voice inbox item", {
        operation: "inbox_voice_capture",
        additionalData: { userId, error },
      });
      return err({
        code: "INBOX_VOICE_CAPTURE_ERROR",
        message: "Error creating inbox item via voice capture",
        details: error,
      });
    }
  }

  /**
   * List inbox items with filtering
   */
  static async listInboxItems(userId: string, filters?: InboxFilters): Promise<DbResult<InboxItem[]>> {
    try {
      // listInboxItems returns DbResult, need to unwrap
      const result = await InboxRepository.listInboxItems(userId, filters);
      if (isErr(result)) {
        return err({
          code: "INBOX_LIST_FAILED",
          message: "Failed to list inbox items",
          details: result.error,
        });
      }
      const rawItems = result.data;

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
   * Extract filter parameters from query object, removing stats parameter
   */
  static extractFilterParams(queryParams?: Record<string, unknown>): InboxFilters {
    if (!queryParams) {
      return {};
    }

    // Remove 'stats' parameter and return remaining as filters
    const filterEntries = Object.entries(queryParams).filter(([key]) => key !== "stats");
    return Object.fromEntries(filterEntries) as InboxFilters;
  }

  /**
   * Get inbox statistics
   */
  static async getInboxStats(userId: string): Promise<DbResult<{
    unprocessed: number;
    processed: number;
    archived: number;
    total: number;
  }>> {
    try {
      const stats = await InboxRepository.getInboxStats(userId);
      return ok(stats);
    } catch (error) {
      return err({
        code: "INBOX_STATS_ERROR",
        message: "Error getting inbox stats",
        details: error,
      });
    }
  }

  /**
   * AI-powered processing of inbox item into tasks
   */
  static async processInboxItem(
    userId: string,
    data: ProcessInboxItem,
  ): Promise<DbResult<InboxProcessingResultDTO>> {
    try {
      assertOpenRouterConfigured();

      // Get the inbox item (returns direct type, not DbResult)
      const rawItem = await InboxRepository.getInboxItemById(userId, data.itemId);
      if (!rawItem) {
        return err({
          code: "INBOX_ITEM_NOT_FOUND",
          message: "Inbox item not found",
        });
      }
      const item = this.transformInboxItem(rawItem);

      // Get available zones for categorization (returns DbResult)
      const zonesResult = await ZonesRepository.listZones();
      if (isErr(zonesResult)) {
        return err({
          code: "INBOX_PROCESS_ZONES_FAILED",
          message: "Failed to get zones for inbox processing",
          details: zonesResult.error,
        });
      }
      const rawZones = zonesResult.data;
      const zones = this.transformZoneData(rawZones);

      // Process with AI
      const processingContext = this.buildProcessingContext(zones, undefined);

      const categorization = await categorizeInboxItem(userId, item.rawText, processingContext);

      await logger.info("Inbox item processed with AI", {
        operation: "inbox_ai_processing",
        additionalData: {
          userId,
          itemId: data.itemId,
          confidence: categorization.confidence,
          suggestedZone: categorization.suggestedZone,
          extractedTasksCount: categorization.extractedTasks.length,
        },
      });

      const result = {
        ...categorization,
        extractedTasks: categorization.extractedTasks.map((t) => ({
          ...t,
          dueDate: (() => {
            if (
              typeof t.dueDate !== "undefined" &&
              t.dueDate !== null &&
              !isNaN(Date.parse(String(t.dueDate)))
            ) {
              return new Date(t.dueDate);
            }
            return null;
          })(),
        })),
      } as InboxProcessingResultDTO;

      return ok(result);
    } catch (error) {
      await logger.error("Failed to process inbox item with AI", {
        operation: "inbox_ai_processing",
        additionalData: { userId, itemId: data.itemId, error },
      });
      return err({
        code: "INBOX_PROCESS_ERROR",
        message: "Error processing inbox item with AI",
        details: error,
      });
    }
  }

  /**
   * Bulk process multiple inbox items
   */
  static async bulkProcessInbox(
    userId: string,
    data: BulkProcessInboxDTO,
  ): Promise<DbResult<{
    processed: InboxItem[];
    results?: InboxProcessingResultDTO[];
  }>> {
    try {
      if (data.action === "archive") {
        // bulkUpdateStatus returns direct type, not DbResult
        const processed = await InboxRepository.bulkUpdateStatus(userId, data.itemIds, "archived");
        return ok({ processed: processed.map((item) => this.transformInboxItem(item)) });
      }

      if (data.action === "delete") {
        await InboxRepository.bulkDeleteInboxItems(userId, data.itemIds);
        return ok({ processed: [] });
      }

      if (data.action === "process") {
        // AI process each item
        const zonesResult = await ZonesRepository.listZones();
        if (isErr(zonesResult)) {
          return err({
            code: "BULK_PROCESS_ZONES_FAILED",
            message: "Failed to get zones for bulk processing",
            details: zonesResult.error,
          });
        }
        const rawZones = zonesResult.data;
        const zones = this.transformZoneData(rawZones);
        const items: InboxItem[] = [];
        const results: InboxProcessingResultDTO[] = [];

        for (const itemId of data.itemIds) {
          const rawItem = await InboxRepository.getInboxItemById(userId, itemId);
          if (rawItem && rawItem.status === "unprocessed") {
            const item = this.transformInboxItem(rawItem);
            const processingContext = this.buildProcessingContext(zones, undefined);

            const categorization = await categorizeInboxItem(
              userId,
              item.rawText,
              processingContext,
            );
            // Convert date strings to Date objects for type safety
            const result: InboxProcessingResultDTO = {
              ...categorization,
              suggestedProject: categorization.suggestedProject ?? null,
              extractedTasks: categorization.extractedTasks.map((task) => ({
                ...task,
                dueDate: (() => {
                  if (
                    typeof task.dueDate !== "undefined" &&
                    task.dueDate !== null &&
                    !isNaN(Date.parse(String(task.dueDate)))
                  ) {
                    return new Date(task.dueDate);
                  }
                  return null;
                })(),
              })),
            };
            results.push(result);

            // Mark as processed (returns direct type, not DbResult)
            const processedItem = await InboxRepository.markAsProcessed(userId, itemId);
            if (processedItem) {
              items.push(this.transformInboxItem(processedItem));
            }
          }
        }

        await logger.info("Bulk inbox processing completed", {
          operation: "inbox_bulk_process",
          additionalData: {
            userId,
            requestedCount: data.itemIds.length,
            processedCount: items.length,
          },
        });

        return ok({ processed: items, results });
      }

      return err({
        code: "INVALID_BULK_ACTION",
        message: `Invalid bulk action: ${data.action}`,
      });
    } catch (error) {
      await logger.error("Failed to bulk process inbox items", {
        operation: "inbox_bulk_process",
        additionalData: { userId, action: data.action, error },
      });
      return err({
        code: "BULK_PROCESS_ERROR",
        message: "Error in bulk inbox processing",
        details: error,
      });
    }
  }

  /**
   * Mark inbox item as processed with optional task reference
   */
  static async markAsProcessed(
    userId: string,
    itemId: string,
    createdTaskId?: string,
  ): Promise<DbResult<InboxItem | null>> {
    try {
      // markAsProcessed returns direct type, not DbResult
      const rawItem = await InboxRepository.markAsProcessed(userId, itemId, createdTaskId);
      return ok(rawItem ? this.transformInboxItem(rawItem) : null);
    } catch (error) {
      return err({
        code: "INBOX_MARK_PROCESSED_ERROR",
        message: "Error marking inbox item as processed",
        details: error,
      });
    }
  }

  /**
   * Delete an inbox item
   */
  static async deleteInboxItem(userId: string, itemId: string): Promise<DbResult<boolean>> {
    try {
      const result = await InboxRepository.deleteInboxItem(userId, itemId);
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
  static async getInboxItem(userId: string, itemId: string): Promise<DbResult<InboxItem | null>> {
    try {
      // getInboxItemById returns direct type, not DbResult
      const rawItem = await InboxRepository.getInboxItemById(userId, itemId);
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
  ): Promise<DbResult<InboxItem | null>> {
    try {
      // updateInboxItem returns direct type, not DbResult
      // Extract id from data as it's passed separately to repository
      const { id: _, ...rest } = data;

      // Filter out undefined values to match repository type expectations
      const updateData = Object.fromEntries(
        Object.entries(rest).filter(([, value]) => value !== undefined),
      ) as Partial<{
        userId: string;
        rawText: string;
        status: "unprocessed" | "processed" | "archived" | null;
        createdTaskId: string | null;
        processedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>;

      const rawItem = await InboxRepository.updateInboxItem(userId, itemId, updateData);
      return ok(rawItem ? this.transformInboxItem(rawItem) : null);
    } catch (error) {
      return err({
        code: "INBOX_UPDATE_ERROR",
        message: "Error updating inbox item",
        details: error,
      });
    }
  }
}
