// AI LLM service for generating insights and analysis
import {
  getOpenRouterConfig,
  assertOpenRouterConfigured,
  openRouterHeaders,
} from "@/server/providers/openrouter.provider";
import { withGuardrails } from "@/server/ai/with-guardrails";
import { log } from "@/server/log";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
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

interface OpenRouterEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
  model: string;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
}

// Type guards
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

function isOpenRouterEmbeddingResponse(data: unknown): data is OpenRouterEmbeddingResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    Array.isArray((data as OpenRouterEmbeddingResponse).data) &&
    (data as OpenRouterEmbeddingResponse).data.length > 0 &&
    Array.isArray((data as OpenRouterEmbeddingResponse).data[0]?.embedding)
  );
}

export interface LLMResponse<T = unknown> {
  data: T;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export interface InsightRequest {
  subjectType: "contact" | "segment" | "inbox";
  subjectId?: string;
  kind: "summary" | "next_step" | "risk" | "persona";
  context: {
    interactions?: Array<{
      type: string;
      subject?: string;
      bodyText?: string;
      occurredAt: Date;
      source?: string;
    }>;
    contact?: {
      displayName: string;
      primaryEmail?: string;
      primaryPhone?: string;
    };
    timeframe?: string;
  };
}

export interface ContactSummary {
  displayName: string;
  keyPoints: string[];
  relationshipStatus: "cold" | "warm" | "hot" | "unknown";
  lastInteraction?: Date;
  interactionCount: number;
  businessContext?: string;
  personalNotes?: string;
}

export interface NextStepRecommendation {
  action: "email" | "call" | "meeting" | "follow_up" | "research";
  priority: "low" | "medium" | "high" | "urgent";
  reasoning: string;
  suggestedContent?: string;
  timeline: "immediate" | "within_week" | "within_month" | "no_rush";
}

export interface RiskAssessment {
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: string[];
  recommendations: string[];
  urgency: "immediate" | "soon" | "monitor" | "none";
}

export interface PersonaInsight {
  communicationStyle: "formal" | "casual" | "technical" | "mixed";
  responsePatterns: string[];
  preferences: string[];
  businessRole?: string;
  decisionMakingStyle: "analytical" | "intuitive" | "collaborative" | "decisive";
}

/**
 * Call OpenRouter with guardrails and error handling
 */
async function callOpenRouter<T>(
  userId: string,
  messages: ChatMessage[],
  responseSchema?: object,
): Promise<LLMResponse<T>> {
  assertOpenRouterConfigured();
  const config = getOpenRouterConfig();

  let rawData: OpenRouterChatResponse | null = null;
  let parsedContent: T | null = null;

  const result = await withGuardrails(userId, async () => {
    const headers = openRouterHeaders();

    const requestBody = {
      model: config.summaryModel,
      messages,
      temperature: 0.3,
      max_tokens: 1000,
      ...(responseSchema && { response_format: { type: "json_object" } }),
    };

    log.info(
      {
        op: "llm.request",
        userId,
        model: config.summaryModel,
        messageCount: messages.length,
      },
      "LLM request started",
    );

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }

    rawData = (await response.json()) as unknown as OpenRouterChatResponse;

    if (!isOpenRouterChatResponse(rawData)) {
      throw new Error("Invalid OpenRouter response format");
    }

    const content = rawData.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenRouter response");
    }

    try {
      if (responseSchema) {
        const parsed = JSON.parse(content) as unknown;
        parsedContent = parsed as T;
      } else {
        parsedContent = content as unknown as T;
      }
    } catch (parseError) {
      log.warn(
        {
          op: "llm.parse_error",
          userId,
          content,
          error: parseError,
        },
        "Failed to parse LLM response as JSON",
      );
      // For non-JSON schema, return content as string type
      parsedContent = responseSchema ? ({} as T) : (content as unknown as T);
    }

    return {
      data: parsedContent,
      model: rawData.model,
      inputTokens: rawData.usage?.prompt_tokens ?? 0,
      outputTokens: rawData.usage?.completion_tokens ?? 0,
      costUsd: 0, // OpenRouter usage tracking will handle cost calculation
    };
  });

  if ("error" in result) {
    throw new Error(`LLM request failed: ${result.error}`);
  }

  if (!rawData || parsedContent === null) {
    throw new Error("Failed to process OpenRouter response");
  }

  const finalRawData = rawData as OpenRouterChatResponse;
  const finalParsedContent = parsedContent as T;

  log.info(
    {
      op: "llm.success",
      userId,
      model: finalRawData.model,
      creditsLeft: result.creditsLeft,
    },
    "LLM request completed successfully",
  );

  return {
    data: finalParsedContent,
    model: finalRawData.model,
    inputTokens: finalRawData.usage?.prompt_tokens ?? 0,
    outputTokens: finalRawData.usage?.completion_tokens ?? 0,
    costUsd: 0, // OpenRouter usage tracking will handle cost calculation
  };
}

/**
 * Generate contact summary from interaction history
 */
export async function generateContactSummary(
  userId: string,
  request: InsightRequest,
): Promise<ContactSummary> {
  const { context } = request;
  const contactName = context.contact?.displayName ?? "Unknown Contact";
  const interactions = context.interactions ?? [];

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an AI assistant that analyzes customer interactions to create comprehensive contact summaries. 
Analyze the provided interaction history and generate a structured summary.

Respond with valid JSON matching this schema:
{
  "displayName": string,
  "keyPoints": string[], // 3-5 most important insights
  "relationshipStatus": "cold" | "warm" | "hot" | "unknown",
  "lastInteraction": string | null, // ISO date
  "interactionCount": number,
  "businessContext": string | null,
  "personalNotes": string | null
}`,
    },
    {
      role: "user",
      content: `Analyze interactions for: ${contactName}
Email: ${context.contact?.primaryEmail ?? "Unknown"}

Interaction History (${interactions.length} total):
${interactions
  .map(
    (i) =>
      `- ${i.type.toUpperCase()} (${i.occurredAt.toISOString()}): ${i.subject ?? "No subject"}
  ${i.bodyText ? i.bodyText.substring(0, 200) + (i.bodyText.length > 200 ? "..." : "") : ""}`,
  )
  .join("\n")}`,
    },
  ];

  const response = await callOpenRouter<ContactSummary>(userId, messages, {});
  return response.data;
}

/**
 * Generate next step recommendations
 */
export async function generateNextSteps(
  userId: string,
  request: InsightRequest,
): Promise<NextStepRecommendation> {
  const { context } = request;
  const contactName = context.contact?.displayName ?? "Unknown Contact";
  const interactions = context.interactions ?? [];

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an AI assistant that analyzes customer interactions to recommend next steps.
Based on the interaction history, suggest the most appropriate next action.

Respond with valid JSON matching this schema:
{
  "action": "email" | "call" | "meeting" | "follow_up" | "research",
  "priority": "low" | "medium" | "high" | "urgent", 
  "reasoning": string,
  "suggestedContent": string | null,
  "timeline": "immediate" | "within_week" | "within_month" | "no_rush"
}`,
    },
    {
      role: "user",
      content: `Recommend next steps for: ${contactName}

Recent interactions:
${interactions
  .slice(-5)
  .map((i) => `- ${i.type} (${i.occurredAt.toISOString()}): ${i.subject ?? "No subject"}`)
  .join("\n")}

What should be the next action?`,
    },
  ];

  const response = await callOpenRouter<NextStepRecommendation>(userId, messages, {});
  return response.data;
}

/**
 * Assess relationship risks
 */
export async function generateRiskAssessment(
  userId: string,
  request: InsightRequest,
): Promise<RiskAssessment> {
  const { context } = request;
  const interactions = context.interactions ?? [];

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an AI assistant that analyzes customer relationships to identify risks.
Look for patterns that might indicate relationship deterioration, missed opportunities, or other concerns.

Respond with valid JSON matching this schema:
{
  "riskLevel": "low" | "medium" | "high" | "critical",
  "factors": string[], // specific risk factors identified
  "recommendations": string[], // actions to mitigate risks
  "urgency": "immediate" | "soon" | "monitor" | "none"
}`,
    },
    {
      role: "user",
      content: `Assess relationship risks based on interaction patterns:

${interactions
  .map((i) => `${i.type} - ${i.occurredAt.toISOString()} - ${i.subject ?? "No subject"}`)
  .join("\n")}

Identify any concerning patterns or risks.`,
    },
  ];

  const response = await callOpenRouter<RiskAssessment>(userId, messages, {});
  return response.data;
}

/**
 * Generate persona insights
 */
export async function generatePersonaInsight(
  userId: string,
  request: InsightRequest,
): Promise<PersonaInsight> {
  const { context } = request;
  const interactions = context.interactions ?? [];

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an AI assistant that analyzes communication patterns to build contact personas.
Analyze the interaction content to understand communication style and preferences.

Respond with valid JSON matching this schema:
{
  "communicationStyle": "formal" | "casual" | "technical" | "mixed",
  "responsePatterns": string[], // how they typically respond
  "preferences": string[], // their apparent preferences  
  "businessRole": string | null,
  "decisionMakingStyle": "analytical" | "intuitive" | "collaborative" | "decisive"
}`,
    },
    {
      role: "user",
      content: `Build a communication persona from these interactions:

${interactions
  .map((i) => `${i.type}: ${i.bodyText?.substring(0, 300) ?? "No content"}`)
  .join("\n---\n")}

What patterns do you see in their communication?`,
    },
  ];

  const response = await callOpenRouter<PersonaInsight>(userId, messages, {});
  return response.data;
}

/**
 * Generate text embeddings using OpenRouter
 */
export async function generateEmbedding(userId: string, text: string): Promise<number[]> {
  assertOpenRouterConfigured();
  const config = getOpenRouterConfig();

  let rawData: OpenRouterEmbeddingResponse | null = null;
  let embedding: number[] | null = null;

  const result = await withGuardrails(userId, async () => {
    const headers = openRouterHeaders();

    const requestBody = {
      model: config.embedModel,
      input: text.trim(),
    };

    log.info(
      {
        op: "embedding.request",
        userId,
        model: config.embedModel,
        textLength: text.length,
      },
      "Embedding request started",
    );

    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter Embeddings API error: ${response.status} ${error}`);
    }

    rawData = (await response.json()) as unknown as OpenRouterEmbeddingResponse;

    if (!isOpenRouterEmbeddingResponse(rawData)) {
      throw new Error("Invalid OpenRouter embedding response format");
    }

    const embeddingData = rawData.data[0]?.embedding;
    if (!embeddingData || !Array.isArray(embeddingData)) {
      throw new Error("No embedding data in OpenRouter response");
    }
    embedding = embeddingData;

    return {
      data: embedding,
      model: rawData.model,
      inputTokens: rawData.usage?.prompt_tokens ?? 0,
      outputTokens: 0, // Embeddings don't generate tokens
      costUsd: 0, // OpenRouter usage tracking will handle cost calculation
    };
  });

  if ("error" in result) {
    throw new Error(`Embedding request failed: ${result.error}`);
  }

  if (!rawData || !embedding) {
    throw new Error("Failed to process OpenRouter embedding response");
  }

  const finalRawData = rawData as OpenRouterEmbeddingResponse;
  const finalEmbedding = embedding as number[];

  log.info(
    {
      op: "embedding.success",
      userId,
      model: finalRawData.model,
      embeddingLength: finalEmbedding.length,
      creditsLeft: result.creditsLeft,
    },
    "Embedding request completed successfully",
  );

  return finalEmbedding;
}
