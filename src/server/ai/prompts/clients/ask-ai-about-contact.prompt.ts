// Extracted prompt

import { ChatMessage } from "@/server/ai/core/llm.service";
import type { ContactWithContext } from "@/server/ai/clients/utils/contact-utils";

export function buildAskAIAboutContactPrompt(data: ContactWithContext): ChatMessage[] {
  const { contact, calendarEvents, interactions, notes, timeline } = data;

  const eventsText = calendarEvents
    .slice(0, 5)
    .map(
      (e) =>
        `${e.title} (${e.eventType ?? "Unknown"}) - ${new Date(e.startTime).toLocaleDateString()}`,
    )
    .join("\n");

  const notesText = notes
    .slice(0, 3)
    .map((n) => n.content)
    .join("\n");

  const recentInteractions = interactions
    .slice(0, 3)
    .map(
      (i) =>
        `${i.type.toUpperCase()} (${i.occurredAt?.toISOString() ?? "Unknown time"}): ${i.subject ?? "No subject"}`,
    )
    .join("\n");

  const prompt = `
As an AI assistant for a wellness/yoga business, analyze this contact and provide conversational insights:

Contact: ${contact?.displayName ?? "Unknown"}
Email: ${contact?.primaryEmail ?? "No email"}
Phone: ${contact?.primaryPhone ?? "No phone"}
Stage: ${contact?.lifecycleStage ?? "Unknown"}
Tags: ${Array.isArray(contact?.tags) ? contact.tags.join(", ") : "None"}
Current Notes: ${notes.length > 0 ? notes.map((n) => n.content).join("; ") : "No notes"}

Recent Calendar Events (${calendarEvents.length} total):
${eventsText ?? "No recent events"}

Recent Interactions (${interactions.length} total):
${recentInteractions ?? "No recent interactions"}

Contact Notes:
${notesText ?? "No notes recorded"}

Timeline Events: ${timeline.length} events recorded

Please provide insights in JSON format:
{
  "insights": "3-4 sentences of conversational analysis about this contact's relationship with the business",
  "suggestions": ["3-4 specific actionable suggestions for improving the relationship"],
  "nextSteps": ["2-3 immediate next steps to take with this contact"],
  "keyFindings": ["3-4 key insights or patterns about this contact"],
  "confidence": 0.85
}

Focus on:
- Relationship health and engagement patterns
- Business opportunities and risks
- Communication preferences
- Service interests and needs
- Actionable next steps for better service
`;

  return [{ role: "user", content: prompt }];
}
