// New file for extract wisdom prompt

import { ChatMessage } from "@/server/ai/core/llm.service";
import { EmailClassification } from "@/server/ai/types/connect-types";

export function buildExtractWisdomPrompt(data: {
  subject: string;
  bodyText: string;
  senderName: string;
  classification: EmailClassification;
}): ChatMessage[] {
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

For wellness tags, use these categories when relevant:
Services: Yoga, Massage, Meditation, Pilates, Reiki, Acupuncture, Personal Training, Nutrition Coaching, Life Coaching, Therapy
Health Focus: Stress Relief, Weight Loss, Flexibility, Strength, Pain Management, Mental Health, Spiritual Growth, Mindfulness
Client Types: Senior, Young Adult, Professional, Parent, Student, Beginner, Intermediate, Advanced

Respond with valid JSON matching this schema:
{
  "keyInsights": string[], // 2-4 most important insights
  "actionItems": string[], // specific actionable steps
  "wellnessTags": string[], // relevant wellness/health tags
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

Classification: ${data.classification.primaryCategory} / ${data.classification.subCategory}
Business Relevance: ${data.classification.businessRelevance}

From: ${data.senderName}
Subject: ${data.subject}

Content:
${data.bodyText.substring(0, 1200)}${data.bodyText.length > 1200 ? "..." : ""}

Provide actionable insights and business intelligence for a wellness practitioner.`,
    },
  ];
}
