// New file for weekly digest prompt

import { ChatMessage } from "@/server/ai/core/llm.service";
import type { EmailSummaryItem } from "@/server/ai/types/connect-types";

export function buildWeeklyDigestPrompt(data: {
  startDate: Date;
  endDate: Date;
  emailInteractionsLength: number;
  insightsLength: number;
  emailSummary: EmailSummaryItem[];
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are an AI business intelligence analyst for wellness practitioners.
Analyze the past week's email activity to provide actionable business insights.

Focus on:
- Overall email trends and patterns
- Business opportunities and growth insights
- Client communication patterns and sentiment
- Marketing intelligence and competitive insights
- Actionable recommendations for the upcoming week

Respond with valid JSON matching this schema:
{
  "summary": {
    "totalEmails": number,
    "clientEmails": number,
    "businessIntelligenceEmails": number,
    "avgBusinessRelevance": number
  },
  "keyInsights": string[],
  "businessOpportunities": string[],
  "clientMoodTrends": {
    "positive": number,
    "neutral": number,
    "concerned": number,
    "frustrated": number
  },
  "marketingIntelligence": string[],
  "actionItems": string[],
  "recommendations": string[]
}`,
    },
    {
      role: "user",
      content: `Analyze this week's email activity (${data.startDate.toDateString()} to ${data.endDate.toDateString()}):

Total interactions: ${data.emailInteractionsLength}
AI insights generated: ${data.insightsLength}

Recent email sample:
${data.emailSummary
  .map(
    (email, idx: number) =>
      `${idx + 1}. [${email.occurredAt.toDateString()}] ${email.subject}
   ${email.bodyText}
   Source: ${email.source}`,
  )
  .join("\n\n")}

Provide comprehensive business intelligence and actionable recommendations.`,
    },
  ];
}
