/**
 * AI Insights Business Schema - derived from database schema
 *
 * Handles AI-generated insights and analysis data
 */

import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { aiInsights } from "@/server/db/schema";

// Create base schemas from drizzle table
const insertAiInsightSchema = createInsertSchema(aiInsights);
const selectAiInsightSchema = createSelectSchema(aiInsights);

const BaseAiInsightSchema = selectAiInsightSchema;

export const AiInsightSchema = BaseAiInsightSchema.transform((data: any) => ({
  ...data,
  // UI computed fields
  isRecent: new Date(data.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000, // Within 24h
  contentPreview:
    typeof data.content === "string"
      ? data.content.slice(0, 100) + (data.content.length > 100 ? "..." : "")
      : typeof data.content === "object" && data.content !== null
        ? JSON.stringify(data.content).slice(0, 100) + "..."
        : "No content",
}));

export type AiInsight = z.infer<typeof AiInsightSchema>;

export const CreateAiInsightSchema = insertAiInsightSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiInsight = z.infer<typeof CreateAiInsightSchema>;

export const UpdateAiInsightSchema = BaseAiInsightSchema.partial().required({ id: true });
export type UpdateAiInsight = z.infer<typeof UpdateAiInsightSchema>;
