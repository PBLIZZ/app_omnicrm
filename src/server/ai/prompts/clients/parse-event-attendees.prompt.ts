// New prompt for parsing calendar attendees

import { ChatMessage } from "@/server/ai/core/llm.service";

export function buildParseEventAttendeesPrompt(description: string): ChatMessage[] {
  // Sanitize input to prevent prompt injection
  const sanitizedDescription = description
    .replace(/["\\]/g, "\\$&") // Escape quotes and backslashes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\t/g, "\\t") // Escape tabs
    .substring(0, 1000); // Limit length to prevent abuse

  return [
    {
      role: "system",
      content: `You are an AI that extracts attendee information from calendar event descriptions. Parse names and emails accurately. Respond with JSON array of {displayName: string, email: string}. Ignore system emails.`,
    },
    {
      role: "user",
      content: `Extract attendees from: "${sanitizedDescription}"`,
    },
  ];
}
