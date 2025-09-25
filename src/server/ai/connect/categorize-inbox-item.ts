// New file for categorizing inbox items
import { generateText } from "@/server/ai/core/llm.service";
import { logger } from "@/lib/observability";

// Prompt function defined inline until separate file is created
function buildCategorizeInboxItemPrompt(rawText: string, context: InboxProcessingContext) {
  const availableZones = context.zones.map((zone) => zone.name).join(", ");

  return [
    {
      role: "system" as const,
      content: `You are an AI assistant that helps categorize inbox items for productivity management. 
      
Available zones: ${availableZones}

Analyze the provided text and extract:
1. Suggested zone (must be one of the available zones)
2. Priority level (low, medium, high, urgent)
3. Suggested project name (if applicable)
4. Any extractable tasks with details
5. Confidence score (0-1)
6. Reasoning for your decisions

Return a JSON object with the exact structure expected by InboxProcessingResultDTO.`,
    },
    {
      role: "user" as const,
      content: `Please categorize this inbox item: ${rawText}`,
    },
  ];
}

interface InboxProcessingResultDTO {
  suggestedZone: string;
  suggestedPriority: "low" | "medium" | "high" | "urgent";
  suggestedProject: string | undefined;
  extractedTasks: {
    name: string;
    description?: string;
    estimatedMinutes?: number;
    dueDate?: string;
  }[];
  confidence: number;
  reasoning: string;
}

interface InboxProcessingContext {
  zones: { name: string }[];
  userContext?: {
    currentEnergy: number;
    availableTime: number;
    preferences: { preferredZone?: string; workingHours?: { start: string; end: string } };
  };
}

export async function categorizeInboxItem(
  userId: string,
  rawText: string,
  context: InboxProcessingContext,
): Promise<InboxProcessingResultDTO> {
  const messages = buildCategorizeInboxItemPrompt(rawText, context);

  await logger.info("AI categorization request started", {
    operation: "inbox_ai_categorization",
    additionalData: {
      userId,
      textLength: rawText.length,
      hasUserContext: !!context.userContext,
    },
  });

  const response = await generateText<InboxProcessingResultDTO>(userId, {
    model: "default",
    messages,
  });

  await logger.info("AI categorization completed", {
    operation: "inbox_ai_categorization",
    additionalData: {
      userId,
      confidence: response.data.confidence,
      suggestedZone: response.data.suggestedZone,
    },
  });

  return response.data;
}
