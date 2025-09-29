// New prompt for parsing raw events

import { ChatMessage } from "@/server/ai/core/llm.service";

export function buildParseRawEventPrompt(
  eventType: "gmail" | "calendar",
  content: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are an AI parser for ${eventType} events. Extract attendees (names and emails) and wiki details (business processes/strategies for businessWiki, marketing ideas/campaigns for marketingWiki). Respond with JSON: {attendees: [{displayName: string, email: string}], businessWiki: string[], marketingWiki: string[]}. Be accurate and ignore irrelevant data.`,
    },
    {
      role: "user",
      content: `Parse this ${eventType} content: "${content}"`,
    },
  ];
}
