// New prompt for parsing calendar attendees

import { ChatMessage } from "@/server/ai/core/llm.service";

export function buildParseEventAttendeesPrompt(description: string): ChatMessage[] {
  // Sanitize input to prevent prompt injection using JSON.stringify
  const sanitizedDescription = JSON.stringify(description).slice(1, -1); // Remove outer quotes

  return [
    {
      role: "system",
+      content: `You are an AI that extracts attendee information from calendar event descriptions. Parse names and emails accurately. Respond with a valid JSON array of objects with schema: {displayName: string, email: string}. Requirements:
+- Return empty array [] if no attendees found
+- Validate email format (must contain @ and domain)
+- Ignore system/noreply emails
+- Remove duplicates based on email address`,
    },
    {
      role: "user",
      content: `Extract attendees from: "${sanitizedDescription}"`,
    },
  ];
}
