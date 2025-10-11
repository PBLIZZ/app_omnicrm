// Import necessary providers and utilities
import {
  openRouterHeaders,
  getOpenRouterConfig,
  assertOpenRouterConfigured,
} from "@/server/ai/providers/openrouter";
import { getOpenAIClient } from "@/server/ai/providers/openai";
// import { getAnthropicClient } from "@/server/ai/providers/anthropic";

// Core types
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseSchema?: object;
}

export interface LLMResponse<T = unknown> {
  data: T;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

// Unified generateText function
export async function generateText<T>(
  userId: string,
  options: LLMOptions,
): Promise<LLMResponse<T>> {
  // Runtime validation
  if (!userId || typeof userId !== "string") {
    throw new Error("userId must be a non-empty string");
  }

  if (!options.model || typeof options.model !== "string") {
    throw new Error("model must be a non-empty string");
  }

  if (!Array.isArray(options.messages) || options.messages.length === 0) {
    throw new Error("messages must be a non-empty array");
  }

  if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 2)) {
    throw new Error("temperature must be between 0 and 2");
  }

  if (options.maxTokens !== undefined && (options.maxTokens < 1 || options.maxTokens > 4000)) {
    throw new Error("maxTokens must be between 1 and 4000");
  }
  if (options.model.startsWith("gpt")) {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      stream: false,
      response_format: options.responseSchema ? { type: "json_object" } : { type: "text" },
    });

    const rawData = response;
    // Parse accordingly
    return {
      data: rawData as T,
      model: options.model,
      inputTokens: rawData.usage?.prompt_tokens ?? 0,
      outputTokens: rawData.usage?.completion_tokens ?? 0,
      costUsd: 0,
    };
  } else if (options.model.startsWith("claude")) {
    throw new Error(
      `Claude model ${options.model} is not supported. Please use OpenAI models (gpt-*) or OpenRouter models.`,
    );
  } else {
    // Existing OpenRouter logic
    assertOpenRouterConfigured();
    const config = getOpenRouterConfig();
    const headers = openRouterHeaders();

    const requestBody = {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      ...(options.responseSchema && { response_format: { type: "json_object" } }),
    };

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} ${error}`);
    }

    const rawData = (await response.json()) as {
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      [key: string]: unknown;
    };
    // Add parsing and validation here as needed

    return {
      data: rawData as T, // Simplify for now; add proper parsing later
      model: options.model,
      inputTokens: rawData.usage?.prompt_tokens ?? 0,
      outputTokens: rawData.usage?.completion_tokens ?? 0,
      costUsd: 0, // To be calculated
    };
  }
}

interface InsightRequest {
  subjectType: string;
  subjectId: string;
  kind: string;
  context: Record<string, unknown>;
}

export async function generateContactSummary(
  userId: string,
  request: InsightRequest,
): Promise<InsightResponse> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a CRM analyst. Generate a concise contact summary based on the provided data. Focus on key relationship insights, communication patterns, and business value.",
    },
    {
      role: "user",
      content: `Analyze this contact data and provide a summary:

${JSON.stringify(request.context, null, 2)}`,
    },
  ];

  try {
    const response = await generateText<{
      title: string;
      summary: string;
      confidence: number;
      tags: string[];
      priority: string;
    }>(userId, {
      model: "default",
      messages,
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          tags: { type: "array", items: { type: "string" } },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        },
        required: ["title", "summary", "confidence", "tags", "priority"],
      },
    });

    return response.data;
  } catch (_error) {
    return {
      title: "Contact Summary",
      summary: "Unable to generate summary due to processing error",
      confidence: 0.1,
      tags: ["error"],
      priority: "low",
    };
  }
}

export async function generateNextSteps(
  userId: string,
  request: InsightRequest,
): Promise<InsightResponse> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a CRM strategist. Analyze the contact data and suggest specific, actionable next steps to advance the relationship. Focus on concrete actions with clear timelines.",
    },
    {
      role: "user",
      content: `Based on this contact data, what are the recommended next steps?

${JSON.stringify(request.context, null, 2)}`,
    },
  ];

  try {
    const response = await generateText<{
      title: string;
      summary: string;
      confidence: number;
      tags: string[];
      priority: string;
    }>(userId, {
      model: "default",
      messages,
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          tags: { type: "array", items: { type: "string" } },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        },
        required: ["title", "summary", "confidence", "tags", "priority"],
      },
    });

    return response.data;
  } catch (_error) {
    return {
      title: "Next Steps",
      summary: "Unable to generate next steps due to processing error",
      confidence: 0.1,
      tags: ["error"],
      priority: "low",
    };
  }
}

export async function generateRiskAssessment(
  userId: string,
  request: InsightRequest,
): Promise<InsightResponse> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a risk assessment specialist. Analyze the contact data for potential business risks, relationship challenges, or opportunities that require attention. Be specific about risk factors and mitigation strategies.",
    },
    {
      role: "user",
      content: `Assess the risks and opportunities for this contact:

${JSON.stringify(request.context, null, 2)}`,
    },
  ];

  try {
    const response = await generateText<{
      title: string;
      summary: string;
      confidence: number;
      tags: string[];
      priority: string;
    }>(userId, {
      model: "default",
      messages,
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          tags: { type: "array", items: { type: "string" } },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        },
        required: ["title", "summary", "confidence", "tags", "priority"],
      },
    });

    return response.data;
  } catch (_error) {
    return {
      title: "Risk Assessment",
      summary: "Unable to assess risks due to processing error",
      confidence: 0.1,
      tags: ["error"],
      priority: "low",
    };
  }
}

export async function generatePersonaInsight(
  userId: string,
  request: InsightRequest,
): Promise<InsightResponse> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a persona analyst. Analyze the contact data to identify personality traits, communication preferences, decision-making patterns, and behavioral insights that can inform relationship management strategies.",
    },
    {
      role: "user",
      content: `Analyze the persona and behavioral patterns for this contact:

${JSON.stringify(request.context, null, 2)}`,
    },
  ];

  try {
    const response = await generateText<{
      title: string;
      summary: string;
      confidence: number;
      tags: string[];
      priority: string;
    }>(userId, {
      model: "default",
      messages,
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          tags: { type: "array", items: { type: "string" } },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        },
        required: ["title", "summary", "confidence", "tags", "priority"],
      },
    });

    return response.data;
  } catch (_error) {
    return {
      title: "Persona Insight",
      summary: "Unable to analyze persona due to processing error",
      confidence: 0.1,
      tags: ["error"],
      priority: "low",
    };
  }
}

// interface AnthropicResponse { content: Array<{ text: string }>; usage: { input_tokens: number; output_tokens: number }; }

// interface AnthropicClient { messages: { create: (params: { model: string; messages: ChatMessage[]; temperature: number; max_tokens: number }) => Promise<AnthropicResponse>; }; }

// const getAnthropicClient = (): AnthropicClient => ({ ... as above });

// ... existing code ... (for future expansions like other providers)
