// Extracted from contact-ai-actions.service.ts

import { generateText } from "@/server/ai/core/llm.service";
import { getContactData } from "@/server/ai/clients/utils/contact-utils"; // Assume extracted helper
import { sanitizeText, sanitizeTitle, sanitizeDate } from "@/lib/utils/sanitization";

export interface ContactAIInsightResponse {
  insights: string;
  suggestions: string[];
  nextSteps: string[];
  confidence: number;
  keyFindings: string[];
  error?: boolean;
  errorMessage?: string;
}

function buildAskAIAboutContactPrompt(data: any): any[] {
  // Validate presence of contact basics
  if (!data.contact || (!data.contact.name && !data.contact.id)) {
    throw new Error("Contact data is missing required fields (name or id)");
  }

  const contact = data.contact;
  const name = sanitizeText(contact.name) || "Unknown";
  const title = sanitizeText(contact.title) || "Unknown";
  const company = sanitizeText(contact.company) || "Unknown";
  const lastInteraction = sanitizeText(contact.lastInteraction) || "Unknown";
  const notes = sanitizeText(contact.notes) || "None";
  const messages = contact.messages || [];
  const tags = contact.tags || [];
  const rawTimeline = contact.rawTimeline || [];

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
- Title: ${title}
- Company: ${company}
- Last Interaction: ${lastInteraction}

**Notes:** ${notes}

**Messages (${messages.length} total):**
${messages
  .slice(0, 5)
  .map(
    (msg: any, i: number) => `${i + 1}. ${sanitizeTitle(msg.subject)} - ${sanitizeDate(msg.date)}`,
  )
  .join("\n")}

**Tags:** ${tags.join(", ") || "None"}

**Timeline Events (${rawTimeline.length} total):**
${rawTimeline
  .slice(0, 3)
  .map(
    (event: any, i: number) =>
      `${i + 1}. ${sanitizeTitle(event.title)} - ${sanitizeDate(event.date)}`,
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
    messages,
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
