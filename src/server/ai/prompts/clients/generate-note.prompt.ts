// Extracted prompt

import { ChatMessage } from "@/server/ai/core/llm.service";
import type { ContactWithContext } from "@/server/ai/types/connect-types";

export function buildGenerateNotePrompt(data: ContactWithContext): ChatMessage[] {
  const { contact, calendarEvents, interactions } = data;

  const prompt = `
Based on this contact's data, suggest relevant notes to add:

Contact: ${contact.displayName} (${contact.stage || "Unknown stage"})
Recent Events: ${
    calendarEvents
      .slice(0, 3)
      .map((e: ContactWithContext["calendarEvents"][0]) => e.title)
      .join(", ") || "None"
  }
Last Interaction: ${interactions[0] ? interactions[0].type : "None"}
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
