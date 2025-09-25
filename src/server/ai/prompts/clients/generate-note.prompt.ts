// Extracted prompt

import { ChatMessage } from "@/server/ai/core/llm.service";
import type { ContactWithContext } from "@/server/ai/types/connect-types";

export function buildGenerateNotePrompt(data: ContactWithContext): ChatMessage[] {
  const { contact, calendarEvents, interactions } = data;

  // Safely get recent events with fallback
  const recentEvents =
    calendarEvents
      ?.slice(0, 3)
      .filter((event) => event && event.title)
      .map((event) => event.title)
      .join(", ") || "None";

  // Safely get last interaction with fallback
  const lastInteraction = interactions && interactions.length > 0 ? interactions[0].type : "None";

  const prompt = `
Based on this contact's data, suggest relevant notes to add:

Contact: ${contact.displayName} (${contact.stage || "Unknown stage"})
Recent Events: ${recentEvents}
Last Interaction: ${lastInteraction}
Current Tags: ${Array.isArray(contact.tags) ? contact.tags.join(", ") : "None"}

Generate note suggestions in JSON format:
{
  "notes": [
    {
      "content": "Specific note content",
      "category": "interaction|observation|follow-up|preference",
      "priority": "high|medium|low"
    }
  ]
}

Suggest 3-5 relevant notes that would be valuable to track about this contact.
Categories:
- interaction: Record of specific interactions
- observation: Behavioral or preference observations  
- follow-up: Reminders for future actions
- preference: Service or communication preferences
`;

  return [{ role: "user", content: prompt }];
}
