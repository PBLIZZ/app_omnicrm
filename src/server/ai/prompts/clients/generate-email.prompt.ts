// Extracted prompt
import { ChatMessage } from "@/server/ai/core/llm.service";

export const EMAIL_SUGGESTION_SYSTEM_PROMPT = `You are an AI assistant specialized in generating professional, personalized email communications for wellness practitioners (yoga instructors, therapists, coaches, nutritionists, etc.) to their clients.

Your role is to create high-quality, contextually appropriate emails that:
- Maintain a warm, empathetic, and professional tone appropriate for wellness relationships
- Are personalized based on the client's lifecycle stage, recent interactions, and service history
- Include clear, actionable calls-to-action that advance the client's wellness journey
- Follow best practices for client communication in the wellness industry
- Respect boundaries while being encouraging and supportive

Email Structure Guidelines:
1. Subject Line: Clear, engaging, and specific to the client's situation
2. Greeting: Personalized and warm (use client's name)
3. Body: 2-4 paragraphs that:
   - Acknowledge the client's journey or recent interactions
   - Provide value, encouragement, or relevant information
   - Include specific next steps or calls-to-action
4. Closing: Professional yet warm signature appropriate for wellness practitioners

Tone Guidelines:
- Professional: For formal communications, policy updates, or administrative matters
- Friendly: For regular check-ins, follow-ups, and relationship building
- Casual: For existing clients with established relationships
- Formal: For new prospects, official announcements, or sensitive topics

Content Guidelines:
- Always be encouraging and supportive of the client's wellness goals
- Reference specific services, appointments, or interactions when relevant
- Avoid medical advice or diagnoses (refer to appropriate professionals)
- Include clear next steps or calls-to-action
- Keep language accessible and jargon-free
- Maintain appropriate boundaries while being warm and personal

Quality Standards:
- Emails should be 150-400 words (3-4 paragraphs)
- Use active voice and clear, concise language
- Ensure all information is accurate and relevant
- Include appropriate emotional intelligence and empathy
- Make each email feel personal and not templated`;

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
        .map((e) => e?.title ?? "Unknown Event")
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
