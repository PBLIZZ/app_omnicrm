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
import type {
  InboxItemDTO,
  CreateInboxItemDTO,
  UpdateInboxItemDTO,
  InboxProcessingResultDTO,
  ProcessInboxItemDTO,
  BulkProcessInboxDTO,
  VoiceInboxCaptureDTO,
  InboxFilters,
  ZoneDTO,
} from "@omnicrm/contracts";
import { categorizeInboxItem } from "@/server/ai/connect/categorize-inbox-item";

// AI Processing Types
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
  zones: ZoneDTO[];
}

export class InboxService {
  /**
   * Build processing context with zones and user context
   * @param zones - Available zones for categorization
   * @param userContextData - Optional user context data
   * @returns InboxProcessingContext with zones and optional user context
   */
  private static buildProcessingContext(
    zones: ZoneDTO[],
    userContextData?: any,
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
  static async quickCapture(userId: string, data: CreateInboxItemDTO): Promise<InboxItemDTO> {
    try {
      const item = await InboxRepository.createInboxItem({
        ...data,
        userId,
      });

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
  static async voiceCapture(userId: string, data: VoiceInboxCaptureDTO): Promise<InboxItemDTO> {
    try {
      const item = await InboxRepository.createInboxItem({
        rawText: data.transcription,
        userId,
      });

      await logger.info("Inbox item created via voice capture", {
        operation: "inbox_voice_capture",
        additionalData: {
          userId,
          itemId: item.id,
          confidence: data.confidence,
          audioQuality: data.audioMetadata?.quality,
          audioDuration: data.audioMetadata?.duration,
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
  static async listInboxItems(userId: string, filters?: InboxFilters): Promise<InboxItemDTO[]> {
    return await InboxRepository.listInboxItems(userId, filters);
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
    data: ProcessInboxItemDTO,
  ): Promise<InboxProcessingResultDTO> {
    assertOpenRouterConfigured();

    try {
      // Get the inbox item
      const item = await InboxRepository.getInboxItemById(userId, data.id);
      if (!item) {
        throw new Error("Inbox item not found");
      }

      // Get available zones for categorization
      const zones = await ZonesRepository.listZones();

      // Process with AI
      const processingContext = this.buildProcessingContext(zones, data.userContext);

      const categorization = await categorizeInboxItem(userId, item.rawText, processingContext);

      await logger.info("Inbox item processed with AI", {
        operation: "inbox_ai_processing",
        additionalData: {
          userId,
          itemId: data.id,
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
            return undefined;
          })(),
        })),
      } as InboxProcessingResultDTO;
    } catch (error) {
      await logger.error("Failed to process inbox item with AI", {
        operation: "inbox_ai_processing",
        additionalData: { userId, itemId: data.id, error },
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
    processed: InboxItemDTO[];
    results?: InboxProcessingResultDTO[];
  }> {
    try {
      if (data.action === "archive") {
        const processed = await InboxRepository.bulkUpdateStatus(userId, data.itemIds, "archived");
        return { processed };
      }

      if (data.action === "delete") {
        await InboxRepository.bulkDeleteInboxItems(userId, data.itemIds);
        return { processed: [] };
      }

      if (data.action === "process") {
        // AI process each item
        const zones = await ZonesRepository.listZones();
        const items = [];
        const results = [];

        for (const itemId of data.itemIds) {
          const item = await InboxRepository.getInboxItemById(userId, itemId);
          if (item && item.status === "unprocessed") {
            const processingContext = this.buildProcessingContext(zones, data.userContext);

            const categorization = await categorizeInboxItem(
              userId,
              item.rawText,
              processingContext,
            );
            // Convert date strings to Date objects for type safety
            const result: InboxProcessingResultDTO = {
              ...categorization,
              suggestedProject: categorization.suggestedProject ?? undefined,
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
                  return undefined;
                })(),
              })),
            };
            results.push(result);

            // Mark as processed (without creating task yet - that's handled in task creation flow)
            const processed = await InboxRepository.markAsProcessed(userId, itemId);
            if (processed) {
              items.push(processed);
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
  ): Promise<InboxItemDTO | null> {
    return await InboxRepository.markAsProcessed(userId, itemId, createdTaskId);
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
  static async getInboxItem(userId: string, itemId: string): Promise<InboxItemDTO | null> {
    return await InboxRepository.getInboxItemById(userId, itemId);
  }

  /**
   * Update an inbox item
   */
  static async updateInboxItem(
    userId: string,
    itemId: string,
    data: UpdateInboxItemDTO,
  ): Promise<InboxItemDTO | null> {
    return await InboxRepository.updateInboxItem(userId, itemId, data);
  }
}
