/**
 * AI Insights Business Schema - API-specific schemas only
 *
 * For base types, import from @/server/db/schema:
 * - AiInsight (select type)
 * - CreateAiInsight (insert type)
 * - UpdateAiInsight (partial insert type)
 *
 * This file contains ONLY UI-enhanced versions and API-specific schemas.
 */

import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { aiInsights, type AiInsight } from "@/server/db/schema";

// Re-export base types from schema for convenience
export type { AiInsight, CreateAiInsight, UpdateAiInsight } from "@/server/db/schema";

// Create base schema from drizzle table for UI enhancements
const selectAiInsightSchema = createSelectSchema(aiInsights);

/**
 * UI-Enhanced AI Insight Schema
 * Extends base AiInsight with computed fields for UI display
 */
export const AiInsightWithUISchema = selectAiInsightSchema.transform((data) => ({
  ...data,
  // UI computed fields
  isRecent: new Date(data.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000, // Within 24h
  contentPreview:
    typeof data.content === "string"
      ? data.content.slice(0, 100) + (data.content.length > 100 ? "..." : "")
      : typeof data.content === "object" && data.content !== null
        ? JSON.stringify(data.content).slice(0, 100) + "..."
        : "No content",
})) satisfies z.ZodType<AiInsight & { isRecent: boolean; contentPreview: string }>;

export type AiInsightWithUI = z.infer<typeof AiInsightWithUISchema>;
