import { z } from "zod";

// ============================================================================
// AI INSIGHTS DTO SCHEMAS - Aligned with database schema
// ============================================================================

// AI Insights content structure (stored in JSONB content column)
export const InsightContentSchema = z.object({
  title: z.string(),
  summary: z.string(),
  score: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()),
  priority: z.enum(["low", "medium", "high", "critical"]),
  references: z
    .array(
      z.object({
        table: z.string(),
        id: z.string().uuid(),
      }),
    )
    .optional(),
  props: z.record(z.unknown()).optional(), // Kind-specific payload
  actions: z
    .array(
      z.object({
        type: z.string(),
        label: z.string(),
        payload: z.record(z.unknown()),
      }),
    )
    .optional(),
  ttlHours: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  status: z.enum(["new", "viewed", "dismissed", "applied"]).default("new"),
});

// Full AI Insight schema (mirrors ai_insights table structure exactly)
export const AIInsightSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  subjectType: z.string(), // contact | segment | inbox
  subjectId: z.string().uuid().nullable(),
  kind: z.string(), // summary | next_step | risk | persona
  content: z.record(z.unknown()), // JSONB field - structured LLM output
  model: z.string().nullable(),
  createdAt: z.string().datetime(), // timestamp with timezone
  fingerprint: z.string().nullable(), // Generated in database
});

// Enhanced AI Insight schema with structured content validation
export const AIInsightWithStructuredContentSchema = AIInsightSchema.extend({
  content: InsightContentSchema, // Structured content for type safety
});

// Schema for creating new AI insights
export const NewAIInsightSchema = AIInsightSchema.omit({
  id: true,
  createdAt: true,
  fingerprint: true,
});

// Schema for updating existing AI insights
export const UpdateAIInsightSchema = AIInsightSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  fingerprint: true,
});

// Subject types for insights
export const InsightSubjectType = {
  CONTACT: "contact",
  THREAD: "thread",
  ACCOUNT: "account",
  PROJECT: "project",
  TASK: "task",
  EMAIL: "email",
  MEETING: "meeting",
  CAMPAIGN: "campaign",
  PIPELINE: "pipeline",
  SEGMENT: "segment",
} as const;

// Insight kinds taxonomy
export const InsightKind = {
  // Summaries
  THREAD_SUMMARY: "thread_summary",
  MEETING_SUMMARY: "meeting_summary",
  ACCOUNT_SUMMARY: "account_summary",
  WEEKLY_DIGEST: "weekly_digest",

  // Actions/NBA
  NEXT_BEST_ACTION: "next_best_action",
  REPLY_DRAFT: "reply_draft",
  SUBJECT_LINE_SUGGESTIONS: "subject_line_suggestions",
  PLAYBOOK_RECOMMENDATION: "playbook_recommendation",

  // Scoring
  LEAD_SCORE: "lead_score",
  HEALTH_SCORE: "health_score",
  UPSELL_SCORE: "upsell_score",
  CHURN_RISK: "churn_risk",

  // Segmentation
  SMART_SEGMENT_DEFINITION: "smart_segment_definition",
  CLUSTER_ASSIGNMENT: "cluster_assignment",

  // Enrichment
  ENTITY_ENRICHMENT: "entity_enrichment",
  TITLE_INFERENCE: "title_inference",
  COMPANY_MATCH: "company_match",

  // Quality/Guardrails
  PII_DETECTED: "pii_detected",
  POLICY_FLAG: "policy_flag",
  ANOMALY_DETECTED: "anomaly_detected",
  DUPLICATE_CONTACT_SUSPECTED: "duplicate_contact_suspected",

  // Analytics
  CAMPAIGN_DRIVER_ANALYSIS: "campaign_driver_analysis",
  COHORT_INSIGHT: "cohort_insight",
  TOPIC_TREND: "topic_trend",
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AIInsight = z.infer<typeof AIInsightSchema>;
export type AIInsightWithStructuredContent = z.infer<typeof AIInsightWithStructuredContentSchema>;
export type NewAIInsight = z.infer<typeof NewAIInsightSchema>;
export type UpdateAIInsight = z.infer<typeof UpdateAIInsightSchema>;
export type InsightContent = z.infer<typeof InsightContentSchema>;
export type InsightSubjectType = (typeof InsightSubjectType)[keyof typeof InsightSubjectType];
export type InsightKind = (typeof InsightKind)[keyof typeof InsightKind];
