/**
 * Inbox Service for AI-Powered Quick Capture and Task Categorization
 *
 * This service handles the "dump everything" inbox where wellness practitioners can
 * quickly capture thoughts/tasks and let AI automatically categorize them into
 * life-business zones and convert them into actionable tasks.
 */

import { InboxRepository, ZonesRepository } from "@omnicrm/repo";
import { getOpenRouterConfig, assertOpenRouterConfigured, openRouterHeaders } from "@/server/providers/openrouter.provider";
import { withGuardrails } from "@/server/ai/with-guardrails";
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
    currentEnergy?: number; // 1-5 scale from daily pulse
    availableTime?: number; // Minutes available
    preferences?: {
      preferredZone?: string;
      workingHours?: {
        start: string;
        end: string;
      };
    };
  };
  zones: ZoneDTO[];
}

interface OpenRouterChatResponse {
  choices: Array<{ message: { content: string } }>;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function isOpenRouterChatResponse(data: unknown): data is OpenRouterChatResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "choices" in data &&
    Array.isArray((data as OpenRouterChatResponse).choices) &&
    (data as OpenRouterChatResponse).choices.length > 0 &&
    typeof (data as OpenRouterChatResponse).choices[0]?.message?.content === "string"
  );
}

export class InboxService {
  /**
   * Quick capture - Create a new inbox item
   */
  static async quickCapture(
    userId: string,
    data: CreateInboxItemDTO
  ): Promise<InboxItemDTO> {
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
  static async voiceCapture(
    userId: string,
    data: VoiceInboxCaptureDTO
  ): Promise<InboxItemDTO> {
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
  static async listInboxItems(
    userId: string,
    filters?: InboxFilters
  ): Promise<InboxItemDTO[]> {
    return await InboxRepository.listInboxItems(userId, filters);
  }

  /**
   * Get inbox statistics
   */
  static async getInboxStats(userId: string) {
    return await InboxRepository.getInboxStats(userId);
  }

  /**
   * AI-powered processing of inbox item into tasks
   */
  static async processInboxItem(
    userId: string,
    data: ProcessInboxItemDTO
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
      const categorization = await this.aiCategorizeInboxItem(
        userId,
        item.rawText,
        { userContext: data.userContext, zones }
      );

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

      return categorization;
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
    data: BulkProcessInboxDTO
  ): Promise<{
    processed: InboxItemDTO[];
    results?: InboxProcessingResultDTO[];
  }> {
    try {
      if (data.action === "archive") {
        const processed = await InboxRepository.bulkUpdateStatus(
          userId,
          data.itemIds,
          "archived"
        );
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
            const categorization = await this.aiCategorizeInboxItem(
              userId,
              item.rawText,
              { userContext: data.userContext, zones }
            );
            results.push(categorization);

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
    createdTaskId?: string
  ): Promise<InboxItemDTO | null> {
    return await InboxRepository.markAsProcessed(userId, itemId, createdTaskId);
  }

  /**
   * Private: AI categorization logic
   */
  private static async aiCategorizeInboxItem(
    userId: string,
    rawText: string,
    context: InboxProcessingContext
  ): Promise<InboxProcessingResultDTO> {
    const config = getOpenRouterConfig();
    const headers = openRouterHeaders();

    // Build zone context for AI
    const zoneList = context.zones.map(z => z.name).join(", ");

    // Build user context string
    let userContextStr = "";
    if (context.userContext) {
      const { currentEnergy, availableTime, preferences } = context.userContext;
      userContextStr = `
Current Context:
- Energy Level: ${currentEnergy ? `${currentEnergy}/5` : "Not specified"}
- Available Time: ${availableTime ? `${availableTime} minutes` : "Not specified"}
- Preferred Zone: ${preferences?.preferredZone || "No preference"}
- Working Hours: ${preferences?.workingHours ? `${preferences.workingHours.start} - ${preferences.workingHours.end}` : "Not specified"}`;
    }

    const systemPrompt = `You are an AI assistant specialized in helping wellness practitioners organize their work and life. Your task is to analyze raw text input and categorize it into the appropriate life-business zone while extracting actionable tasks.

Available Zones: ${zoneList}

Zone Descriptions:
- Personal Wellness: Self-care activities, personal health goals, mindfulness practices
- Self Care: Rest, relaxation, personal time, hobbies, mental health
- Admin & Finances: Bookkeeping, taxes, administrative tasks, financial planning
- Business Development: Marketing, networking, business growth, strategy
- Social Media & Marketing: Content creation, social media posts, marketing campaigns
- Client Care: Client sessions, follow-ups, client communication, service delivery

Respond with valid JSON matching this exact schema:
{
  "suggestedZone": string, // Must be one of the available zones
  "suggestedPriority": "low" | "medium" | "high" | "urgent",
  "suggestedProject": string | null, // Optional project name if this relates to a larger initiative
  "extractedTasks": [
    {
      "name": string, // Clear, actionable task name
      "description": string | null, // Optional detailed description
      "estimatedMinutes": number | null, // Estimated time to complete (optional)
      "dueDate": string | null // ISO date string if there's a deadline (optional)
    }
  ],
  "confidence": number, // 0.0 to 1.0, confidence in the categorization
  "reasoning": string // Brief explanation of the categorization decision
}`;

    const userPrompt = `Please analyze the following input and categorize it appropriately:

Raw Input: "${rawText}"
${userContextStr}

Consider the user's current context when making suggestions. Break down the input into specific, actionable tasks and categorize them into the most appropriate life-business zone.`;

    const requestBody = {
      model: config.chatModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    };

    await logger.info("AI categorization request started", {
      operation: "inbox_ai_categorization",
      additionalData: {
        userId,
        model: config.chatModel,
        textLength: rawText.length,
        hasUserContext: !!context.userContext,
      },
    });

    const result = await withGuardrails(userId, async () => {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${error}`);
      }

      const rawData = (await response.json()) as unknown;

      if (!isOpenRouterChatResponse(rawData)) {
        throw new Error("Invalid OpenRouter response format");
      }

      const content = rawData.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in OpenRouter response");
      }

      try {
        const parsed = JSON.parse(content) as unknown;
        return parsed as InboxProcessingResultDTO;
      } catch (parseError) {
        await logger.warn("Failed to parse AI categorization response", {
          operation: "inbox_ai_categorization",
          additionalData: { userId, content, parseError },
        });
        // Fallback to default categorization
        return {
          suggestedZone: "Personal Wellness",
          suggestedPriority: "medium" as const,
          suggestedProject: null,
          extractedTasks: [{
            name: rawText.length > 50 ? rawText.substring(0, 50) + "..." : rawText,
            description: rawText,
            estimatedMinutes: 30,
            dueDate: null,
          }],
          confidence: 0.1,
          reasoning: "Failed to parse AI response, using default categorization",
        };
      }
    });

    if ("error" in result) {
      throw new Error(`AI categorization failed: ${result.error}`);
    }

    await logger.info("AI categorization completed", {
      operation: "inbox_ai_categorization",
      additionalData: {
        userId,
        confidence: result.confidence,
        suggestedZone: result.suggestedZone,
        creditsLeft: result.creditsLeft,
      },
    });

    return result;
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
    data: UpdateInboxItemDTO
  ): Promise<InboxItemDTO | null> {
    return await InboxRepository.updateInboxItem(userId, itemId, data);
  }
}