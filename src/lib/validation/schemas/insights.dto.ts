import { z } from "zod";

// AI Insights content envelope (standardized structure)
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
  props: z.record(z.string(), z.unknown()).optional(), // Kind-specific payload
  actions: z
    .array(
      z.object({
        type: z.string(),
        label: z.string(),
        payload: z.record(z.string(), z.unknown()),
      }),
    )
    .optional(),
  ttlHours: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  status: z.enum(["new", "viewed", "dismissed", "applied"]).default("new"),
});

// Mirror the ai_insights table structure
export const AIInsightSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  subjectType: z.string(),
  subjectId: z.string().uuid().nullable(),
  kind: z.string(),
  content: InsightContentSchema,
  model: z.string().nullable(),
  createdAt: z.string().datetime(),
  fingerprint: z.string().optional(), // Generated column
});

export const NewAIInsightSchema = AIInsightSchema.omit({
  id: true,
  createdAt: true,
  fingerprint: true,
});

// Subject types for insights
export const InsightSubjectType = {
  CONTACT: "contact",
  THREAD: "thread",
  ACCOUNT: "account",
  WORKSPACE: "workspace",
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

// Kind-specific props schemas (examples)
export const LeadScorePropsSchema = z.object({
  score0To100: z.number().int().min(0).max(100),
  reasons: z.array(z.string()),
  weights: z.record(z.string(), z.number()),
});

export const NextBestActionPropsSchema = z.object({
  suggestion: z.string(),
  expectedValueEur: z.number().optional(),
  effort: z.enum(["low", "medium", "high"]),
  why: z.array(z.string()),
});

export const ThreadSummaryPropsSchema = z.object({
  bullets: z.array(z.string()),
  tone: z.string(),
  entities: z.record(z.string(), z.array(z.string())),
});

export type AIInsight = z.infer<typeof AIInsightSchema>;
export type NewAIInsight = z.infer<typeof NewAIInsightSchema>;
export type InsightContent = z.infer<typeof InsightContentSchema>;
export type InsightSubjectType = (typeof InsightSubjectType)[keyof typeof InsightSubjectType];
export type InsightKind = (typeof InsightKind)[keyof typeof InsightKind];
