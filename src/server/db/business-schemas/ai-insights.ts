/**
 * Data Intelligence - AI Insights Business Schemas
 *
 * Base drizzle types are re-exported for convenience:
 * - AiInsight (select type)
 * - CreateAiInsight (insert type)
 * - UpdateAiInsight (partial insert type)
 *
 * This module defines API-specific validation schemas and UI transformers.
 */

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { aiInsights } from "@/server/db/schema";

export type { AiInsight, CreateAiInsight, UpdateAiInsight } from "@/server/db/schema";

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const BaseAiInsightSchema = createSelectSchema(aiInsights);

export const AiInsightSchema = BaseAiInsightSchema.extend({
  content: z.unknown(), // JSONB payload can be string or object
});

export type AiInsightDTO = z.infer<typeof AiInsightSchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const CreateAiInsightBodySchema = z.object({
  subjectType: z.string().min(1, "subjectType is required"),
  subjectId: z.string().uuid().optional(),
  kind: z.string().min(1, "kind is required"),
  content: z.unknown(),
  model: z.string().optional(),
  fingerprint: z.string().optional(),
});

export type CreateAiInsightBody = z.infer<typeof CreateAiInsightBodySchema>;

export const UpdateAiInsightBodySchema = CreateAiInsightBodySchema.partial();

export type UpdateAiInsightBody = z.infer<typeof UpdateAiInsightBodySchema>;

export const AiInsightsQuerySchema = z.object({
  subjectType: z.string().optional(),
  subjectId: z.string().uuid().optional(),
  kind: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(20),
  order: z.enum(["asc", "desc"]).default("desc"),
  sort: z.enum(["createdAt"]).default("createdAt"),
});

export type AiInsightsQuery = z.infer<typeof AiInsightsQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const AiInsightsListResponseSchema = z.object({
  items: z.array(AiInsightSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type AiInsightsListResponse = z.infer<typeof AiInsightsListResponseSchema>;

export const AiInsightResponseSchema = z.object({
  item: AiInsightSchema,
});

// ============================================================================
// UI SCHEMAS
// ============================================================================

export const AiInsightWithUISchema = AiInsightSchema.transform((data) => ({
  ...data,
  isRecent: data.createdAt
    ? new Date(data.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    : false,
  contentPreview:
    typeof data.content === "string"
      ? data.content.slice(0, 100) + (data.content.length > 100 ? "..." : "")
      : data.content && typeof data.content === "object"
        ? JSON.stringify(data.content).slice(0, 100) + "..."
        : "No content",
})) satisfies z.ZodType<AiInsightDTO & { isRecent: boolean; contentPreview: string }>;

export type AiInsightWithUI = z.infer<typeof AiInsightWithUISchema>;
