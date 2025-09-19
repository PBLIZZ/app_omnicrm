import { z } from "zod";

/**
 * AI Insight DTO Schema
 *
 * Stable UI-focused contract for AI-generated insights.
 */
export const AiInsightDTOSchema = z.object({
  id: z.string().uuid(),
  subjectType: z.enum(["contact", "segment", "inbox"]),
  subjectId: z.string().uuid().nullable(),
  kind: z.enum(["summary", "next_step", "risk", "persona"]),
  content: z.unknown(), // JSON structured LLM output
  model: z.string().nullable(),
  fingerprint: z.string().nullable(), // Content hash for deduplication
  createdAt: z.coerce.date(),
});

export type AiInsightDTO = z.infer<typeof AiInsightDTOSchema>;

/**
 * AI Usage DTO Schema
 *
 * Tracking AI model usage and costs
 */
export const AiUsageDTOSchema = z.object({
  id: z.string().uuid(),
  model: z.string(),
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  costUsd: z.string(), // Stored as string for precise decimal handling
  createdAt: z.coerce.date(),
});

export type AiUsageDTO = z.infer<typeof AiUsageDTOSchema>;

/**
 * AI Quota DTO Schema
 *
 * User AI usage quotas and limits
 */
export const AiQuotaDTOSchema = z.object({
  periodStart: z.coerce.date(),
  creditsLeft: z.number().int().min(0),
});

export type AiQuotaDTO = z.infer<typeof AiQuotaDTOSchema>;

/**
 * Create AI Insight DTO Schema
 */
export const CreateAiInsightDTOSchema = z.object({
  subjectType: z.enum(["contact", "segment", "inbox"]),
  subjectId: z.string().uuid().optional(),
  kind: z.enum(["summary", "next_step", "risk", "persona"]),
  content: z.unknown(),
  model: z.string().optional(),
  fingerprint: z.string().optional(),
});

export type CreateAiInsightDTO = z.infer<typeof CreateAiInsightDTOSchema>;