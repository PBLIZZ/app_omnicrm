// Extracted from contact-ai-actions.service.ts

import { generateText, ChatMessage } from "@/server/ai/core/llm.service";
import { getContactData, ContactWithContext } from "@/server/ai/contacts/utils/contact-utils";
import { sanitizeText, sanitizeTitle, sanitizeDate } from "@/lib/utils/sanitization";

// Type interfaces for contact data structures
interface ContactMessage {
  subject: string;
  date: string;
}

interface ContactTimelineEvent {
  title: string;
  date: string;
}

interface ContactData {
  contact: {
    id: string;
    name: string;
    title?: string;
    company?: string;
    lastInteraction?: string;
    notes?: string;
    messages: ContactMessage[];
    tags: string[];
    rawTimeline: ContactTimelineEvent[];
  };
}

export interface ContactAIInsightResponse {
  insights: string;
  suggestions: string[];
  nextSteps: string[];
  confidence: number;
  keyFindings: string[];
  error?: boolean;
  errorMessage?: string;
}

// Type guard to validate contact data structure
function isValidContactData(data: unknown): data is ContactData {
  if (!data || typeof data !== "object") return false;

  const contactData = data as Record<string, unknown>;
  if (!contactData.contact || typeof contactData.contact !== "object") return false;

  const contact = contactData.contact as Record<string, unknown>;
  return (
    (typeof contact.name === "string" || typeof contact.id === "string") &&
    Array.isArray((contact as { messages?: unknown }).messages) &&
    Array.isArray((contact as { tags?: unknown }).tags) &&
    Array.isArray((contact as { rawTimeline?: unknown }).rawTimeline)
  );
}

function buildAskAIAboutContactPrompt(data: ContactWithContext): ChatMessage[] {
  // Validate presence of contact basics
  if (!data.contact || (!data.contact.displayName && !data.contact.id)) {
    throw new Error("Contact data is missing required fields (displayName or id)");
  }

  const contact = data.contact;
  const name = sanitizeText(contact.displayName) || "Unknown";
  const email = sanitizeText(contact.primaryEmail) || "Unknown";
  const phone = sanitizeText(contact.primaryPhone) || "Unknown";
  const lastInteraction = data.interactions[0]
    ? sanitizeDate(data.interactions[0].occurredAt.toISOString())
    : "Unknown";
  const notesText = data.notes.map((note) => note.content).join("; ") || "None";
  const messages = data.interactions.filter((i) => i.type === "email") || [];
  const tags = Array.isArray(contact.tags) ? (contact.tags as string[]) : [];
  const timeline = data.timeline || [];

  const systemMessage = {
    role: "system" as const,
    content: `You are a professional CRM analyst. Your role is to analyze contact data and provide concise, actionable insights in JSON format only. 

Your response must be a valid JSON object with these exact keys:
- summary: A brief 2-3 sentence overview of the contact
- key_contact_points: Array of important interaction highlights
- sentiment: Overall relationship sentiment (positive/neutral/negative)
- notable_actions: Array of significant actions or behaviors
- suggested_followups: Array of objects with priority (high/medium/low) and timeframe (immediate/this week/this month)
- tags: Array of relevant tags for categorization

Be concise, professional, and data-driven. Use bullet points for arrays.`,
  };

  const userMessage = {
    role: "user" as const,
    content: `Analyze this contact:

**Basic Info:**
- Name: ${name}
- Email: ${email}
- Phone: ${phone}
- Last Interaction: ${lastInteraction}

**Notes:** ${notesText}

**Messages (${messages.length} total):**
${messages
  .slice(0, 5)
  .map(
    (msg, i) =>
      `${i + 1}. ${sanitizeTitle(msg.subject || "No Subject")} - ${sanitizeDate(msg.occurredAt.toISOString())}`,
  )
  .join("\n")}

**Tags:** ${tags.join(", ") || "None"}

**Timeline Events (${timeline.length} total):**
${timeline
  .slice(0, 3)
  .map(
    (event, i) =>
      `${i + 1}. ${sanitizeTitle(event.title)} - ${sanitizeDate(event.occurredAt.toISOString())}`,
  )
  .join("\n")}

Provide your analysis as a JSON object only.`,
  };

  return [systemMessage, userMessage];
}

export async function askAIAboutContact(
  userId: string,
  contactId: string,
): Promise<ContactAIInsightResponse> {
  const contactData = await getContactData(userId, contactId);

  if (!contactData.contact) {
    throw new Error("Contact not found");
  }

  const messages = buildAskAIAboutContactPrompt(contactData);

  const response = await generateText<{
    summary: string;
    key_contact_points: string[];
    sentiment: string;
    notable_actions: string[];
    suggested_followups: Array<{ priority: string; timeframe: string }>;
    tags: string[];
  }>(userId, {
    model: "default",
    messages: messages,
    responseSchema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        key_contact_points: { type: "array", items: { type: "string" } },
        sentiment: { type: "string" },
        notable_actions: { type: "array", items: { type: "string" } },
        suggested_followups: {
          type: "array",
          items: {
            type: "object",
            properties: {
              priority: { type: "string" },
              timeframe: { type: "string" },
            },
          },
        },
        tags: { type: "array", items: { type: "string" } },
      },
      required: [
        "summary",
        "key_contact_points",
        "sentiment",
        "notable_actions",
        "suggested_followups",
        "tags",
      ],
    },
  });

  const aiData = response.data;

  // Map the AI response to our expected interface
  return {
    insights: aiData.summary,
    suggestions: aiData.key_contact_points,
    nextSteps: aiData.suggested_followups.map((f) => `${f.priority} priority: ${f.timeframe}`),
    confidence: 0.8, // Could be calculated based on data completeness
    keyFindings: aiData.notable_actions,
  };
}
