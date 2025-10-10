/**
 * Data Intelligence - AI Insights Business Schemas
 *
 * Base drizzle types are re-exported for convenience:
 * - AiInsight (select type)
 * - CreateAiInsight (insert type)
 * - UpdateAiInsight (partial insert type)
 *
 * This module defines API-specific validation schemas.
 * Per architecture blueprint: No transforms, validated JSONB schemas.
 */

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { aiInsights } from "@/server/db/schema";
import { AiInsightContentSchema } from "@/lib/validation/jsonb";
import { PaginationQuerySchema, createPaginatedResponseSchema } from "@/lib/validation/common";

export type { AiInsight, CreateAiInsight, UpdateAiInsight } from "@/server/db/schema";

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const BaseAiInsightSchema = createSelectSchema(aiInsights);

/**
 * AI Insight schema with validated JSONB content field
 */
export const AiInsightSchema = BaseAiInsightSchema.extend({
  content: AiInsightContentSchema,
});

export type AiInsightDTO = z.infer<typeof AiInsightSchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const CreateAiInsightBodySchema = z.object({
  subjectType: z.string().min(1, "subjectType is required"),
  subjectId: z.string().uuid().optional(),
  kind: z.string().min(1, "kind is required"),
  content: AiInsightContentSchema,
  model: z.string().optional(),
  fingerprint: z.string().optional(),
});

export type CreateAiInsightBody = z.infer<typeof CreateAiInsightBodySchema>;

export const UpdateAiInsightBodySchema = CreateAiInsightBodySchema.partial();

export type UpdateAiInsightBody = z.infer<typeof UpdateAiInsightBodySchema>;

export const AiInsightsQuerySchema = PaginationQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(200).default(20), // Override max
  sort: z.enum(["createdAt"]).default("createdAt"),
  subjectType: z.string().optional(),
  subjectId: z.string().uuid().optional(),
  kind: z.array(z.string()).optional(),
  search: z.string().optional(),
});

export type AiInsightsQuery = z.infer<typeof AiInsightsQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * AI Insights List Response Schema
 * Note: Per architecture blueprint, transforms removed. UI enrichment (isRecent, contentPreview)
 * should happen in service layer mappers.
 */
export const AiInsightsListResponseSchema = createPaginatedResponseSchema(AiInsightSchema);

export type AiInsightsListResponse = z.infer<typeof AiInsightsListResponseSchema>;

export const AiInsightResponseSchema = z.object({
  item: AiInsightSchema,
});
