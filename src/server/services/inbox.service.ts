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
import { DbResult, isErr } from "@/lib/utils/result";
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
      wordCount: baseData.rawText.split(/\s+/).length,
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
  static async quickCapture(userId: string, data: CreateInboxItem): Promise<InboxItem> {
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

      return item;
    } catch (error) {
      await logger.error("Failed to create inbox item", {
        operation: "inbox_quick_capture",
        additionalData: { userId, error },
      });
      throw error;
    }
  }

  /**
   * Voice capture with transcription
   */
  static async voiceCapture(userId: string, data: VoiceInboxCaptureDTO): Promise<InboxItem> {
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

      return item;
    } catch (error) {
      await logger.error("Failed to create voice inbox item", {
        operation: "inbox_voice_capture",
        additionalData: { userId, error },
      });
      throw error;
    }
  }

  /**
   * List inbox items with filtering
   */
  static async listInboxItems(userId: string, filters?: InboxFilters): Promise<InboxItem[]> {
    // listInboxItems returns DbResult, need to unwrap
    const result = await InboxRepository.listInboxItems(userId, filters);
    const rawItems = this.unwrapDbResult(result);

    return rawItems.map((item) => this.transformInboxItem(item));
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
  static async getInboxStats(userId: string): Promise<{
    unprocessed: number;
    processed: number;
    archived: number;
    total: number;
  }> {
    return await InboxRepository.getInboxStats(userId);
  }

  /**
   * AI-powered processing of inbox item into tasks
   */
  static async processInboxItem(
    userId: string,
    data: ProcessInboxItem,
  ): Promise<InboxProcessingResultDTO> {
    assertOpenRouterConfigured();

    try {
      // Get the inbox item (returns direct type, not DbResult)
      const rawItem = await InboxRepository.getInboxItemById(userId, data.itemId);
      if (!rawItem) {
        throw new Error("Inbox item not found");
      }
      const item = this.transformInboxItem(rawItem);

      // Get available zones for categorization (returns DbResult)
      const zonesResult = await ZonesRepository.listZones();
      const rawZones = this.unwrapDbResult(zonesResult);
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

      return {
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
    } catch (error) {
      await logger.error("Failed to process inbox item with AI", {
        operation: "inbox_ai_processing",
        additionalData: { userId, itemId: data.itemId, error },
      });
      throw error;
    }
  }

  /**
   * Bulk process multiple inbox items
   */
  static async bulkProcessInbox(
    userId: string,
    data: BulkProcessInboxDTO,
  ): Promise<{
    processed: InboxItem[];
    results?: InboxProcessingResultDTO[];
  }> {
    try {
      if (data.action === "archive") {
        // bulkUpdateStatus returns direct type, not DbResult
        const processed = await InboxRepository.bulkUpdateStatus(userId, data.itemIds, "archived");
        return { processed: processed.map((item) => this.transformInboxItem(item)) };
      }

      if (data.action === "delete") {
        await InboxRepository.bulkDeleteInboxItems(userId, data.itemIds);
        return { processed: [] };
      }

      if (data.action === "process") {
        // AI process each item
        const zonesResult = await ZonesRepository.listZones();
        const rawZones = this.unwrapDbResult(zonesResult);
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

        return { processed: items, results };
      }

      throw new Error(`Invalid bulk action: ${data.action}`);
    } catch (error) {
      await logger.error("Failed to bulk process inbox items", {
        operation: "inbox_bulk_process",
        additionalData: { userId, action: data.action, error },
      });
      throw error;
    }
  }

  /**
   * Mark inbox item as processed with optional task reference
   */
  static async markAsProcessed(
    userId: string,
    itemId: string,
    createdTaskId?: string,
  ): Promise<InboxItem | null> {
    // markAsProcessed returns direct type, not DbResult
    const rawItem = await InboxRepository.markAsProcessed(userId, itemId, createdTaskId);
    return rawItem ? this.transformInboxItem(rawItem) : null;
  }

  /**
   * Delete an inbox item
   */
  static async deleteInboxItem(userId: string, itemId: string): Promise<boolean> {
    return await InboxRepository.deleteInboxItem(userId, itemId);
  }

  /**
   * Get single inbox item
   */
  static async getInboxItem(userId: string, itemId: string): Promise<InboxItem | null> {
    // getInboxItemById returns direct type, not DbResult
    const rawItem = await InboxRepository.getInboxItemById(userId, itemId);
    return rawItem ? this.transformInboxItem(rawItem) : null;
  }

  /**
   * Update an inbox item
   */
  static async updateInboxItem(
    userId: string,
    itemId: string,
    data: UpdateInboxItem,
  ): Promise<InboxItem | null> {
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
    return rawItem ? this.transformInboxItem(rawItem) : null;
  }
}
