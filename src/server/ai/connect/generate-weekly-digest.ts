// New file for generating weekly email digest

import { getDb } from "@/server/db/client";
import { interactions, aiInsights } from "@/server/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { generateText, ChatMessage } from "@/server/ai/core/llm.service";
import { WeeklyDigestInsight } from "@/server/ai/types/connect-types";
import { logger } from "@/lib/observability";

function buildWeeklyDigestPrompt(emailSummary: any[], insights: any[]): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are an AI assistant that generates comprehensive weekly email digests for wellness practitioners. Analyze email interactions and insights to provide structured summaries with key patterns, important communications, and actionable insights.",
    },
    {
      role: "user",
      content: `Generate a weekly digest based on the following email interactions and insights:
  
Email Summary: ${JSON.stringify(emailSummary, null, 2)}
Insights: ${JSON.stringify(insights, null, 2)}

Please provide a structured weekly digest that highlights key patterns, important emails, and actionable insights.`,
    },
  ];
}

export async function generateWeeklyDigest(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {},
): Promise<WeeklyDigestInsight> {
  const db = await getDb();

  const endDate = options.endDate ?? new Date();
  const startDate = options.startDate ?? new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const emailInteractions = await db
    .select()
    .from(interactions)
    .where(
      and(
        eq(interactions.userId, userId),
        eq(interactions.type, "email"),
        sql`${interactions.occurredAt} >= ${startDate}`,
        sql`${interactions.occurredAt} <= ${endDate}`,
      ),
    )
    .orderBy(desc(interactions.occurredAt));

  const insights = await db
    .select()
    .from(aiInsights)
    .where(
      and(
        eq(aiInsights.userId, userId),
        eq(aiInsights.subjectType, "inbox"),
        sql`${aiInsights.createdAt} >= ${startDate}`,
        sql`${aiInsights.createdAt} <= ${endDate}`,
      ),
    );

  interface EmailSummary {
    subject: string;
    bodyText: string;
    source: string;
    occurredAt: Date;
  }

  const emailSummary: EmailSummary[] = emailInteractions
    .map((interaction) => ({
      subject: interaction.subject ?? "No subject",
      bodyText: interaction.bodyText?.substring(0, 200) ?? "",
      source: interaction.source ?? "unknown",
      occurredAt: interaction.occurredAt,
    }))
    .slice(0, 30);

  const messages = buildWeeklyDigestPrompt(emailSummary, insights);

  await logger.info("Generating weekly digest", {
    operation: "generate_weekly_digest",
    additionalData: {
      startDate,
      endDate,
      emailInteractionsLength: emailInteractions.length,
      insightsLength: insights.length,
      emailSummary,
    },
  });

  const response = await generateText<WeeklyDigestInsight>(userId, {
    model: "default",
    messages,
  });

  return {
    ...response.data,
    timeframe: { startDate, endDate },
  };
}
