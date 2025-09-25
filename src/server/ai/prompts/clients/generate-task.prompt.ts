// Extracted prompt

import { ChatMessage } from "@/server/ai/core/llm.service";
import type { ContactWithContext } from "@/server/ai/types/connect-types";

// Constants
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_DAYS_SINCE_LAST_EVENT = 999;

export function buildGenerateTaskPrompt(data: ContactWithContext): ChatMessage[] {
  const { contact, calendarEvents } = data;

  const lastEvent = calendarEvents[0];

  const daysSinceLastEvent = lastEvent
    ? Math.floor((Date.now() - new Date(lastEvent.start_time).getTime()) / MS_PER_DAY)
    : DEFAULT_DAYS_SINCE_LAST_EVENT;

  const prompt = `
Based on this contact's data, suggest tasks to improve their experience:

Contact: ${contact.displayName}
Stage: ${contact.stage ?? "Unknown"}
Days since last event: ${daysSinceLastEvent}
Total events: ${calendarEvents.length}
Recent services: ${
    calendarEvents?.length
      ? calendarEvents
          .slice(0, 3)
          .map((e: ContactWithContext["calendarEvents"][0]) => e.title)
          .join(", ")
      : "None"
  }

Generate task suggestions in JSON format:
{
  "tasks": [
    {
      "title": "Clear, actionable task title",
      "description": "Detailed description with context",
      "priority": "urgent|high|medium|low",
      "estimatedMinutes": 15,
      "category": "follow-up|outreach|service|admin"
    }
  ]
}

Suggest 2-4 specific, actionable tasks. Consider:
- Follow-up timing based on last interaction
- Service recommendations based on history
- Relationship building opportunities
- Administrative tasks for better service

Categories:
- follow-up: Direct contact or check-in tasks
- outreach: Proactive communication or invitations
- service: Service delivery or customization tasks
- admin: Data management or planning tasks
`;

  return [{ role: "user", content: prompt }];
}
