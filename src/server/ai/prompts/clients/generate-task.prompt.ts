// Extracted prompt

import { ChatMessage } from "@/server/ai/core/llm.service";
import type { ContactWithContext } from "@/server/ai/types/connect-types";
import { MS_PER_DAY, DEFAULT_DAYS_SINCE_LAST_EVENT } from "@/constants/time";

export function buildGenerateTaskPrompt(data: ContactWithContext): ChatMessage[] {
  const { contact, calendarEvents } = data;

  const lastEvent = calendarEvents?.[0];

  const daysSinceLastEvent =
    lastEvent && lastEvent.start_time
      ? Math.floor((Date.now() - new Date(lastEvent.start_time).getTime()) / MS_PER_DAY)
      : DEFAULT_DAYS_SINCE_LAST_EVENT;

  // Safely get recent services with fallback
  const recentServices =
    calendarEvents
      ?.slice(0, 3)
      .map((e) => e?.title ?? "Unknown Event")
      .join(", ") || "None";

  const prompt = `
Based on this contact's data, suggest tasks to improve their experience:

Contact: ${contact.displayName}
Stage: ${contact.stage ?? "Unknown"}
Days since last event: ${daysSinceLastEvent}
Total events: ${calendarEvents.length}
Recent services: ${recentServices}

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
