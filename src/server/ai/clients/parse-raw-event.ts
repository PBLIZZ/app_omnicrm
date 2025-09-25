// New file for AI-parsing raw events

import { generateText } from "@/server/ai/core/llm.service";
import { buildParseRawEventPrompt } from "@/server/ai/prompts/clients/parse-raw-event.prompt";
import { getOpenRouterConfig } from "@/server/ai/providers/openrouter";

export interface ParsedEvent {
  attendees: { displayName: string; email: string }[];
  businessWiki: string[];
  marketingWiki: string[];
}

export async function parseRawEvent(
  userId: string,
  eventType: "gmail" | "calendar",
  content: string,
): Promise<ParsedEvent> {
  // Input validation
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    throw new TypeError("userId must be a non-empty string");
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    throw new TypeError("content must be a non-empty string");
  }

  if (!eventType || (eventType !== "gmail" && eventType !== "calendar")) {
    throw new TypeError('eventType must be either "gmail" or "calendar"');
  }

  try {
    const messages = buildParseRawEventPrompt(eventType, content);

    // Validate OpenRouter configuration
    let config;
    try {
      config = getOpenRouterConfig();
      if (!config || !config.chatModel) {
        throw new Error("Invalid OpenRouter configuration: missing chatModel");
      }
    } catch (configError) {
      throw new Error(
        `OpenRouter configuration error: ${configError instanceof Error ? configError.message : String(configError)}`,
      );
    }

    const response = await generateText<ParsedEvent>(userId, {
      model: config.chatModel,
      messages,
    });

    // Validate response exists and has required structure
    if (!response || !response.data) {
      throw new Error("No response data received from LLM service");
    }

    const data = response.data;
    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid response format from LLM service");
    }

    // Validate required fields exist
    if (!Array.isArray(data.attendees)) {
      throw new Error("Response missing required attendees array");
    }

    if (!Array.isArray(data.businessWiki)) {
      throw new Error("Response missing required businessWiki array");
    }

    if (!Array.isArray(data.marketingWiki)) {
      throw new Error("Response missing required marketingWiki array");
    }

    return data;
  } catch (error) {
    console.error(`Failed to parse raw event for userId ${userId}:`, error);
    throw new Error(
      `Failed to parse raw event: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
