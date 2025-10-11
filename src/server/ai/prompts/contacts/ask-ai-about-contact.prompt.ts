// Extracted and hardened prompt builder

import { ChatMessage } from "@/server/ai/core/llm.service";
import type { ContactWithContext } from "@/server/ai/contacts/utils/contact-utils";

// Input validation and sanitization
function sanitizeText(text: string | null | undefined, maxLength: number = 1000): string {
  if (!text) return "Not provided";
  return text
    .slice(0, maxLength)
    .replace(/[\r\n\t]/g, " ")
    .trim();
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Unknown date";
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return "Invalid date";
  }
}

function formatISOString(date: Date | string | null | undefined): string {
  if (!date) return "Unknown time";
  try {
    return new Date(date).toISOString();
  } catch {
    return "Invalid time";
  }
}

export function buildAskAIAboutContactPrompt(data: ContactWithContext): ChatMessage[] {
  // Validate input data
  if (!data || typeof data !== "object") {
    throw new Error("Invalid contact data provided");
  }

  const { contact, calendarEvents = [], interactions = [], notes = [], timeline = [] } = data;

  // Validate contact exists
  if (!contact || typeof contact !== "object") {
    throw new Error("Contact data is required");
  }

  // Safely build events text with proper error handling
  const eventsText = calendarEvents
    .slice(0, 5)
    .map((e) => {
      const title = sanitizeText(e?.title, 100);
      const eventType = sanitizeText(e?.eventType, 50);
      const startTime = formatDate(e?.startTime);
      return `${title} (${eventType}) - ${startTime}`;
    })
    .join("\n");

  // Safely build notes text
  const notesText = notes
    .slice(0, 3)
    .map((n) => sanitizeText(n?.content, 200))
    .join("\n");

  // Safely build interactions text
  const recentInteractions = interactions
    .slice(0, 3)
    .map((i) => {
      const type = sanitizeText(i?.type?.toUpperCase(), 20);
      const occurredAt = formatISOString(i?.occurredAt);
      const subject = sanitizeText(i?.subject, 100);
      return `${type} (${occurredAt}): ${subject}`;
    })
    .join("\n");

  // Safely build contact information
  const contactName = sanitizeText(contact?.displayName, 100);
  const contactEmail = sanitizeText(contact?.primaryEmail, 100);
  const contactPhone = sanitizeText(contact?.primaryPhone, 50);
  const contactStage = sanitizeText(contact?.lifecycleStage, 50);
  const contactTags =
    Array.isArray(contact?.tags) && contact.tags.length > 0
      ? contact.tags.map((tag) => sanitizeText(tag, 50)).join(", ")
      : "None";

  const currentNotes =
    notes.length > 0 ? notes.map((n) => sanitizeText(n?.content, 200)).join("; ") : "No notes";

  const prompt = `As an AI assistant for a wellness/yoga business, analyze this contact and provide conversational insights:

Contact: ${contactName}
Email: ${contactEmail}
Phone: ${contactPhone}
Stage: ${contactStage}
Tags: ${contactTags}
Current Notes: ${currentNotes}

Recent Calendar Events (${calendarEvents.length} total):
${eventsText || "No recent events"}

Recent Interactions (${interactions.length} total):
${recentInteractions || "No recent interactions"}

Contact Notes:
${notesText || "No notes available"}

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
- Actionable next steps for better service`;

  return [{ role: "user", content: prompt }];
}
