import {
  assertOpenRouterConfigured,
  getOpenRouterConfig,
  openRouterHeaders,
} from "@/server/ai/providers/openrouter";
import type { SearchResult } from "@/server/services/semantic-search.service";

export interface ChatHistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatSource {
  id: string;
  type: string;
  title: string;
  snippet: string;
  similarity?: number;
  url?: string;
  metadata?: Record<string, unknown>;
}

interface OpenRouterChatChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterChatResponse {
  choices?: OpenRouterChatChoice[];
}

const DEFAULT_MAX_TOKENS = 1000;
const DEFAULT_TEMPERATURE = 0.7;
const MAX_CONTEXT_ITEMS = 8;
const SNIPPET_LENGTH = 400;

export async function generateChatCompletion(
  params: GenerateChatCompletionParams,
): Promise<{ response: string; sources: ChatSource[] }> {
  assertOpenRouterConfigured();
  const config = getOpenRouterConfig();

  const trimmedContext = params.context.slice(0, MAX_CONTEXT_ITEMS);
  const sources = trimmedContext.map(toChatSource);

  // Add timeout handling
  const timeoutMs = 30000; // 30 seconds default timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: openRouterHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        model: config.chatModel || "anthropic/claude-3-haiku",
        messages: buildMessagePayload(params.message, params.history, trimmedContext),
        max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: params.temperature ?? DEFAULT_TEMPERATURE,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      // Log full error details internally for debugging
      console.error("OpenRouter API error:", {
        status: response.status,
        statusText: response.statusText,
        response: errorText,
      });
      // Return generic error to client without sensitive details
      throw new Error(`OpenRouter chat error: ${response.status}`);
    }

    const data = (await response.json()) as OpenRouterChatResponse;
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("OpenRouter returned an empty response");
    }

    return {
      response: reply,
      sources,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout - please try again");
    }

    throw error;
  }
}

function buildMessagePayload(
  userMessage: string,
  history: ChatHistoryMessage[],
  context: SearchResult[],
): ChatHistoryMessage[] {
  const systemPrompt: ChatHistoryMessage = {
    role: "system",
    content: buildSystemPrompt(context),
  };

  const allowedRoles = new Set(["user", "assistant", "system"]);
  const normalizedHistory = history
    .filter((item) => {
      return (
        item &&
        typeof item.content === "string" &&
        item.content.trim().length > 0 &&
        typeof item.role === "string" &&
        allowedRoles.has(item.role)
      );
    })
    .map((item) => ({
      role: item.role as "user" | "assistant" | "system",
      content: item.content.trim(),
    }))
    .slice(-6);

  return [systemPrompt, ...normalizedHistory, { role: "user", content: userMessage }];
}

function buildSystemPrompt(context: SearchResult[]): string {
  const contextText = context
    .map((item, index) => {
      const header = `[${index + 1}] ${item.type.toUpperCase()} • ${item.title}`;
      const snippet = createSnippet(item.content);
      const similarity =
        typeof item.similarity === "number" ? ` (similarity: ${item.similarity.toFixed(2)})` : "";
      return `${header}${similarity}\n${snippet}`;
    })
    .join("\n\n");

  return [
    "You are an AI assistant for a wellness practice management platform.",
    "Provide concise, trustworthy answers that reference the supplied context when relevant.",
    "If the context is insufficient, acknowledge the limitation and suggest next steps.",
    "Always prioritize client privacy and professional tone.",
    `\nCONTEXT:\n${contextText || "No additional context available."}`,
  ].join(" ");
}

function toChatSource(result: SearchResult): ChatSource {
  return {
    id: result.id,
    type: result.type,
    title: result.title,
    snippet: createSnippet(result.content),
    ...(result.similarity !== undefined && { similarity: result.similarity }),
    url: result.url,
    metadata: result.metadata,
  };
}

function createSnippet(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= SNIPPET_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, SNIPPET_LENGTH - 3)}...`;
}

export function isValidChatRole(value: unknown): value is ChatHistoryMessage["role"] {
  return value === "user" || value === "assistant" || value === "system";
}
