import type { ChatMessage } from "@/server/ai/core/llm.service";
import {
  PRIMARY_CATEGORIES,
  SUB_CATEGORIES,
  PRIMARY_CATEGORY_DESCRIPTIONS,
  SUB_CATEGORY_DESCRIPTIONS,
} from "@/constants/email-categories";

export function buildCategorizeEmailPrompt(emailData: {
  subject: string;
  bodyText: string;
  senderEmail: string;
  senderName: string;
}): ChatMessage[] {
  const primaryCategoriesList = PRIMARY_CATEGORIES.map(
    (cat) => `- ${cat}: ${PRIMARY_CATEGORY_DESCRIPTIONS[cat]}`,
  ).join("\n");

  const subCategoriesList = SUB_CATEGORIES.map(
    (cat) => `- ${cat}: ${SUB_CATEGORY_DESCRIPTIONS[cat]}`,
  ).join("\n");

  return [
    {
      role: "system",
      content: `You are an AI assistant that analyzes emails for wellness practitioners (yoga, massage, meditation, therapy, coaching).
Your task is to categorize emails and assess their business relevance.

Primary Categories:
${primaryCategoriesList}

Sub Categories:
${subCategoriesList}

Respond with valid JSON matching this schema:
{
  "primaryCategory": string,
  "subCategory": string,
  "confidence": number, // 0.0 to 1.0
  "businessRelevance": number, // 0.0 to 1.0 for wellness practice
  "reasoning": string,
  "extractedMetadata": {
    "senderDomain": string,
    "hasAppointmentLanguage": boolean,
    "hasPaymentLanguage": boolean,
    "isFromClient": boolean,
    "urgencyLevel": "low" | "medium" | "high" | "urgent"
  }
}`,
    },
    {
      role: "user",
      content: `Categorize this email for a wellness practitioner:

From: ${emailData.senderName} <${emailData.senderEmail}>
Subject: ${emailData.subject}

Email Body:
${emailData.bodyText.substring(0, 1500)}${emailData.bodyText.length > 1500 ? "..." : ""}

Analyze the content, sender, and context to provide accurate categorization and business relevance scoring.`,
    },
  ];
}
