// New file for extract wisdom prompt

import type { ChatMessage } from "@/server/ai/core/llm.service";
import type { EmailClassification } from "@/server/db/business-schemas";

interface ExtractWisdomData {
  subject: string;
  bodyText: string;
  senderName: string;
  classification: EmailClassification;
}

export function buildExtractWisdomPrompt(data: ExtractWisdomData): ChatMessage[] {
  const { subject, bodyText, senderName, classification } = data;

  return [
    {
      role: "system",
      content: `You are an AI business intelligence assistant specialized in wellness practices.
Extract actionable insights, wisdom, and opportunities from email content.

Focus on:
- Key business insights that could help grow the practice
- Actionable next steps
- Wellness industry trends and opportunities
- Client communication patterns and mood
- Marketing intelligence and growth opportunities

Respond with valid JSON matching this schema:
{
  "keyInsights": string[], // 2-4 most important insights
  "actionItems": string[], // specific actionable steps
  "marketingTips": string[], // marketing insights (optional)
  "businessOpportunities": string[], // growth opportunities (optional)
  "clientMood": "positive" | "neutral" | "concerned" | "frustrated" | "excited" | null,
  "followUpRecommended": boolean,
  "followUpReason": string | null
}`,
    },
    {
      role: "user",
      content: `Extract business wisdom from this email:

Classification: ${classification.primaryCategory} / ${classification.subCategory}
Business Relevance: ${classification.businessRelevance}

From: ${senderName}
Subject: ${subject}

Content:
${bodyText.substring(0, 1200)}${bodyText.length > 1200 ? "..." : ""}

Provide actionable insights and business intelligence for a wellness practitioner.`,
    },
  ];
}
