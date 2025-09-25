// Extracted prompt
import { ChatMessage } from "@/server/ai/core/llm.service";

export const EMAIL_SUGGESTION_SYSTEM_PROMPT =
  "You are an AI that generates professional email suggestions for wellness practitioners.";

interface ContactWithContext {
  contact: {
    displayName: string;
    primaryEmail: string;
    lifecycleStage?: string;
  };
  calendarEvents: Array<{
    title: string;
    start: Date;
    end?: Date;
    location?: string;
    description?: string;
    id?: string;
  }>;
  interactions: Array<{
    type: string;
    occurredAt: Date;
  }>;
}

export function buildGenerateEmailPrompt(
  data: ContactWithContext,
  purpose?: string,
): ChatMessage[] {
  const { contact, calendarEvents, interactions } = data;

  const lastEvent = calendarEvents[0];
  const lastInteraction = interactions[0];

  const prompt = `
Generate an email for this wellness/yoga business contact:

Contact: ${contact.displayName}
Email: ${contact.primaryEmail}
Stage: ${contact.lifecycleStage ?? "Unknown"}
Last Event: ${lastEvent && lastEvent.start ? `${lastEvent.title} on ${new Date(lastEvent.start).toLocaleDateString()}` : "None"}
Last Interaction: ${lastInteraction ? `${lastInteraction.type} on ${new Date(lastInteraction.occurredAt).toLocaleDateString()}` : "None"}
Purpose: ${purpose ?? "General follow-up"}

${
  calendarEvents.length > 0
    ? `Recent Services: ${calendarEvents
        .slice(0, 3)
        .map((e) => e.title)
        .join(", ")}`
    : ""
}

Please generate an email in JSON format:
{
  "subject": "Personalized subject line",
  "content": "Professional yet warm email content (3-4 paragraphs)",
  "tone": "friendly",
  "purpose": "Brief description of email purpose"
}

Guidelines:
- Be warm but professional
- Reference specific services if available
- Include a clear call-to-action
- Keep it personal and relevant to their wellness journey
- Tone should be "professional", "friendly", "casual", or "formal"
`;

  return [{ role: "user", content: prompt }];
}
