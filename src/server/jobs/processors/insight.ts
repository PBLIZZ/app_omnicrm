import type { JobRecord } from "@/server/jobs/types";
import { getDb } from "@/server/db/client";
import { contacts, interactions } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/observability";
import {
  generateNextSteps,
  generateRiskAssessment,
  generatePersonaInsight,
} from "@/server/ai/core/llm.service"; // Added /core
// TODO: generateContactInsights was removed during refactoring
// import { generateContactInsights } from "@/server/ai/contacts/generate-contact-insights";

// Extended insight types from insight-writer
type InsightKind =
  | "summary"
  | "next_step"
  | "risk"
  | "persona"
  | "thread_summary"
  | "next_best_action"
  | "weekly_digest"
  | "lead_score"
  | "duplicate_contact_suspected";
type InsightSubjectType = "contact" | "segment" | "inbox";

// Generated insight structure from insight-writer

// Insight generation task structure

// Context types for different insight kinds
interface SummaryContext {
  contactId: string;
  recentInteractions: string[];
  lastContactDate?: string;
}

interface NextStepContext {
  contactId: string;
  currentStage: string;
  recentActivities: string[];
}

interface RiskContext {
  contactId: string;
  warningSignals: string[];
  lastInteractionDate?: string;
}

interface PersonaContext {
  contactId: string;
  demographics: Record<string, unknown>;
  preferences: string[];
}

type InsightContext = SummaryContext | NextStepContext | RiskContext | PersonaContext;

interface InsightRequest {
  subjectType: string;
  subjectId: string;
  kind: "summary" | "next_step" | "risk" | "persona";
  context: InsightContext;
}

/**
 * InsightWriter class - handles all insight generation and management
 * Merged functionality from insight-writer.ts
 */
export class InsightWriter {
  /**
   * Generate and store AI insight
   */
  async generateInsight(task: InsightGenerationTask): Promise<string | null> {
    try {
      // 1. Generate insight content based on type and context
      const insight = await this.generateInsightContent(task);
      if (!insight) return null;

      // 2. Create AI insight record
      const aiInsight: NewAiInsight = {
        userId: task.userId,
        subjectType: task.subjectType,
        subjectId: task.subjectId,
        kind: task.kind,
        content: {
          title: insight.title,
          summary: insight.summary,
          confidence: insight.confidence,
          tags: insight.tags,
          priority: insight.priority,
          status: "new",
          props: insight.props,
          actions: insight.actions,
        },
        model: this.getModelForInsightType(task.kind),
      };

      // 3. Store insight with automatic fingerprinting
      const insightId = await this.storeInsight(aiInsight);
      return insightId;
    } catch (error) {
      await logger.error(
        "Failed to generate insight",
        {
          operation: "jobs.insight.generate",
          additionalData: {
            taskKind: task.kind,
            userId: (task.userId?.slice(0, 8) ?? "unknown") + "...",
          },
        },
        error instanceof Error ? error : undefined,
      );
      return null;
    }
  }

  /**
   * Generate thread summary insight
   */
  async generateThreadSummary(
    userId: string,
    contactId: string,
    interactionIds: string[],
  ): Promise<string | null> {
    const task: InsightGenerationTask = {
      userId,
      subjectType: "contact",
      subjectId: contactId,
      kind: "thread_summary",
      context: { interactionIds },
    };

    return await this.generateInsight(task);
  }

  /**
   * Generate next best action insight
   */
  async generateNextBestAction(
    userId: string,
    contactId: string,
    context?: Record<string, unknown>,
  ): Promise<string | null> {
    const task: InsightGenerationTask = {
      userId,
      subjectType: "contact",
      subjectId: contactId,
      kind: "next_best_action",
      context,
    };

    return await this.generateInsight(task);
  }

  /**
   * Generate weekly digest insight
   */
  async generateWeeklyDigest(userId: string): Promise<string | null> {
    const task: InsightGenerationTask = {
      userId,
      subjectType: "inbox",
      subjectId: null,
      kind: "weekly_digest",
    };

    return await this.generateInsight(task);
  }

  private async generateInsightContent(
    task: InsightGenerationTask,
  ): Promise<GeneratedInsight | null> {
    // Generate insights based on kind
    switch (task.kind) {
      case "thread_summary":
        return this.generateThreadSummaryContent(task);

      case "next_best_action":
        return this.generateNextBestActionContent(task);

      case "weekly_digest":
        return this.generateWeeklyDigestContent(task);

      case "lead_score":
        return this.generateLeadScoreContent(task);

      case "summary":
      case "next_step":
      case "risk":
      case "persona":
        // Use existing LLM service for these types
        return await this.generateLLMInsight(task);

      default:
        await logger.warn("Insight generation not implemented", {
          operation: "jobs.insight.generate_by_kind",
          additionalData: { taskKind: task.kind },
        });
        return null;
    }
  }

  private async generateLLMInsight(task: InsightGenerationTask): Promise<GeneratedInsight | null> {
    const db = await getDb();

    if (task.subjectType === "contact" && task.subjectId) {
      // Get contact and interactions for LLM service
      const [contact] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, task.subjectId), eq(contacts.userId, task.userId)))
        .limit(1);

      if (!contact) return null;

      const contactInteractions = await db
        .select({
          type: interactions.type,
          subject: interactions.subject,
          bodyText: interactions.bodyText,
          occurredAt: interactions.occurredAt,
          source: interactions.source,
        })
        .from(interactions)
        .where(
          and(eq(interactions.userId, task.userId), eq(interactions.contactId, task.subjectId)),
        )
        .orderBy(desc(interactions.occurredAt))
        .limit(50);

      const request: InsightRequest = {
        subjectType: "contact",
        subjectId: task.subjectId,
        kind: task.kind as "summary" | "next_step" | "risk" | "persona",
        context: {
          contact: {
            displayName: contact.displayName,
            ...(contact.primaryEmail ? { primaryEmail: contact.primaryEmail } : {}),
            ...(contact.primaryPhone ? { primaryPhone: contact.primaryPhone } : {}),
          },
          interactions: contactInteractions.map((i) => ({
            type: i.type,
            ...(i.subject ? { subject: i.subject } : {}),
            ...(i.bodyText ? { bodyText: i.bodyText } : {}),
            occurredAt: i.occurredAt,
            ...(i.source ? { source: i.source } : {}),
          })),
        },
      };

      let llmResult: unknown;
      if (task.kind === "summary") {
        // TODO: generateContactInsights was removed during refactoring
        // For now, return a basic summary placeholder
        await logger.warn("Contact insights generation not implemented", {
          operation: "jobs.insight.generate_contact_summary",
          additionalData: { taskKind: task.kind },
        });
        return null;
      } else {
        switch (task.kind) {
          case "next_step":
            llmResult = await generateNextSteps(task.userId, request);
            break;
          case "risk":
            llmResult = await generateRiskAssessment(task.userId, request);
            break;
          case "persona":
            llmResult = await generatePersonaInsight(task.userId, request);
            break;
        }
      }

      // Convert LLM result to GeneratedInsight format
      if (typeof llmResult === "object" && llmResult !== null) {
        const result = llmResult as Record<string, unknown>;
        const actions = Array.isArray(result["actions"])
          ? (result["actions"] as Array<{
              type: string;
              label: string;
              payload: Record<string, unknown>;
            }>)
          : [];
        return {
          title: String(result["title"] ?? `${task.kind} insight`),
          summary: String(result["summary"] ?? result["content"] ?? "Generated insight"),
          confidence: Number(result["confidence"] ?? 0.7),
          tags: Array.isArray(result["tags"]) ? (result["tags"] as string[]) : [task.kind],
          priority: (result["priority"] as "low" | "medium" | "high" | "critical") ?? "medium",
          props: (result["props"] as Record<string, unknown>) ?? result,
          actions,
        };
      }
    }

    return null;
  }

  private async generateThreadSummaryContent(
    task: InsightGenerationTask,
  ): Promise<GeneratedInsight> {
    const db = await getDb();

    if (!task.subjectId || !task.context?.["interactionIds"]) {
      throw new Error("Thread summary requires contact ID and interaction IDs");
    }

    // interactionIds available in context if needed: task.context['interactionIds']

    // Get the specified interactions
    const threadInteractions = await db
      .select({
        type: interactions.type,
        subject: interactions.subject,
        bodyText: interactions.bodyText,
        occurredAt: interactions.occurredAt,
        source: interactions.source,
      })
      .from(interactions)
      .where(and(eq(interactions.userId, task.userId), eq(interactions.contactId, task.subjectId)))
      .orderBy(desc(interactions.occurredAt))
      .limit(20);

    // Generate summary based on actual interaction data
    const totalInteractions = threadInteractions.length;
    const interactionTypes = Array.from(new Set(threadInteractions.map((i) => i.type)));
    const hasEmailContent = threadInteractions.some((i) => i.bodyText);

    return {
      title: `Thread Summary: ${totalInteractions} interactions`,
      summary: `Recent thread contains ${totalInteractions} ${interactionTypes.join(", ")} interactions${hasEmailContent ? " with detailed content" : ""}.`,
      confidence: 0.8,
      tags: ["thread", "summary", ...interactionTypes],
      priority: "medium",
      props: {
        totalInteractions,
        interactionTypes,
        dateRange: {
          from: threadInteractions[threadInteractions.length - 1]?.occurredAt,
          to: threadInteractions[0]?.occurredAt,
        },
        hasContent: hasEmailContent,
      },
    };
  }

  private async generateNextBestActionContent(
    task: InsightGenerationTask,
  ): Promise<GeneratedInsight> {
    const db = await getDb();

    if (!task.subjectId) {
      throw new Error("Next best action requires contact ID");
    }

    // Get contact and recent interactions to determine best action
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, task.subjectId), eq(contacts.userId, task.userId)))
      .limit(1);

    if (!contact) {
      throw new Error(`Contact not found: ${task.subjectId}`);
    }

    const recentInteractions = await db
      .select({
        type: interactions.type,
        subject: interactions.subject,
        occurredAt: interactions.occurredAt,
      })
      .from(interactions)
      .where(and(eq(interactions.userId, task.userId), eq(interactions.contactId, task.subjectId)))
      .orderBy(desc(interactions.occurredAt))
      .limit(10);

    const hasRecentActivity = recentInteractions.length > 0;
    const lastInteractionDays = hasRecentActivity
      ? (() => {
          const firstInteraction = recentInteractions[0];
          if (!firstInteraction) {
            throw new Error(
              "Unexpected: recentInteractions has length > 0 but first element is undefined",
            );
          }
          return Math.floor(
            (Date.now() - new Date(firstInteraction.occurredAt).getTime()) / (1000 * 60 * 60 * 24),
          );
        })()
      : 999;

    let suggestion = "Follow up with contact";
    let priority: "low" | "medium" | "high" | "critical" = "medium";

    if (lastInteractionDays > 30) {
      suggestion = "Re-engage with contact - no recent activity";
      priority = "high";
    } else if (lastInteractionDays < 7) {
      suggestion = "Continue active conversation";
      priority = "high";
    }

    return {
      title: suggestion,
      summary: `Contact has ${recentInteractions.length} recent interactions. Last activity: ${lastInteractionDays} days ago.`,
      confidence: 0.7,
      tags: ["follow-up", "engagement", contact.stage ?? "unknown"],
      priority,
      props: {
        contactName: contact.displayName,
        lastInteractionDays,
        recentInteractionCount: recentInteractions.length,
        interactionTypes: Array.from(new Set(recentInteractions.map((i) => i.type))),
      },
      actions: [
        {
          type: "create_task",
          label: "Create follow-up task",
          payload: {
            title: `Follow up with ${contact.displayName}`,
            priority,
            contactId: contact.id,
          },
        },
      ],
    };
  }

  private async generateWeeklyDigestContent(
    task: InsightGenerationTask,
  ): Promise<GeneratedInsight> {
    const db = await getDb();

    // Get interactions from the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyInteractions = await db
      .select({
        contactId: interactions.contactId,
        type: interactions.type,
        occurredAt: interactions.occurredAt,
      })
      .from(interactions)
      .where(and(eq(interactions.userId, task.userId)))
      .orderBy(desc(interactions.occurredAt))
      .limit(200);

    // Get all contacts for the user
    const allContacts = await db
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
        stage: contacts.stage,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(eq(contacts.userId, task.userId));

    const totalInteractions = weeklyInteractions.length;
    const uniqueContacts = new Set(weeklyInteractions.map((i) => i.contactId).filter(Boolean)).size;
    const newContacts = allContacts.filter(
      (c) => new Date(c.createdAt).getTime() > weekAgo.getTime(),
    ).length;

    // Find active contacts (interactions in last 7 days)
    const activeContactIds = new Set(
      weeklyInteractions
        .filter((i) => new Date(i.occurredAt).getTime() > weekAgo.getTime())
        .map((i) => i.contactId)
        .filter(Boolean),
    );

    const activeContacts = allContacts.filter((c) => activeContactIds.has(c.id));
    const opportunities = activeContacts.filter(
      (c) => c.stage === "Prospect" || c.stage === "New Client",
    );

    return {
      title: `Weekly digest: ${opportunities.length} opportunities, ${totalInteractions} interactions`,
      summary: `This week: ${totalInteractions} interactions with ${uniqueContacts} contacts. ${newContacts} new contacts added.`,
      confidence: 0.9,
      tags: ["digest", "weekly", "summary"],
      priority: "medium",
      props: {
        dateRange: {
          from: weekAgo.toISOString(),
          to: new Date().toISOString(),
        },
        metrics: {
          totalInteractions,
          uniqueContacts,
          newContacts,
          opportunityContacts: opportunities.length,
        },
        breakdown: weeklyInteractions.reduce(
          (acc, i) => {
            acc[i.type] = (acc[i.type] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    };
  }

  private async generateLeadScoreContent(task: InsightGenerationTask): Promise<GeneratedInsight> {
    const db = await getDb();

    if (!task.subjectId) {
      throw new Error("Lead score requires contact ID");
    }

    // Get contact and interactions for scoring
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, task.subjectId), eq(contacts.userId, task.userId)))
      .limit(1);

    if (!contact) {
      throw new Error(`Contact not found: ${task.subjectId}`);
    }

    const contactInteractions = await db
      .select({
        type: interactions.type,
        occurredAt: interactions.occurredAt,
        bodyText: interactions.bodyText,
      })
      .from(interactions)
      .where(and(eq(interactions.userId, task.userId), eq(interactions.contactId, task.subjectId)))
      .orderBy(desc(interactions.occurredAt))
      .limit(30);

    // Calculate lead score based on real data
    const totalInteractions = contactInteractions.length;
    const recentInteractions = contactInteractions.filter(
      (i) => new Date(i.occurredAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000, // last 30 days
    ).length;
    const hasEmailContent = contactInteractions.some((i) => i.bodyText);
    const hasContact = !!contact.primaryEmail || !!contact.primaryPhone;

    // Simple scoring algorithm
    let score = 0;
    score += Math.min(totalInteractions * 10, 40); // up to 40 points for interactions
    score += Math.min(recentInteractions * 15, 30); // up to 30 points for recent activity
    score += hasEmailContent ? 20 : 0; // 20 points for email content
    score += hasContact ? 10 : 0; // 10 points for contact info

    const scoreCategory = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
    const priority: "low" | "medium" | "high" | "critical" =
      score >= 80 ? "critical" : score >= 60 ? "high" : "medium";

    return {
      title: `Lead score: ${score}/100`,
      summary: `${scoreCategory.charAt(0).toUpperCase() + scoreCategory.slice(1)}-scoring prospect with ${totalInteractions} total interactions, ${recentInteractions} recent.`,
      confidence: 0.8,
      tags: ["lead", "scoring", scoreCategory],
      priority,
      props: {
        score0To100: score,
        category: scoreCategory,
        breakdown: {
          totalInteractions,
          recentInteractions,
          hasEmailContent,
          hasContactInfo: hasContact,
        },
        reasons: [
          `${totalInteractions} total interactions`,
          `${recentInteractions} recent interactions`,
          ...(hasEmailContent ? ["Has detailed email content"] : []),
          ...(hasContact ? ["Complete contact information"] : []),
        ],
      },
      actions:
        score >= 70
          ? [
              {
                type: "create_task",
                label: "High priority follow-up",
                payload: {
                  title: `Follow up with high-scoring lead: ${contact.displayName}`,
                  priority: "high",
                  contactId: contact.id,
                },
              },
            ]
          : [],
    };
  }

  private getModelForInsightType(kind: InsightKind): string {
    // Map insight kinds to appropriate AI models
    const modelMappings: Record<string, string> = {
      thread_summary: "gpt-5",
      next_best_action: "gpt-5",
      lead_score: "omni.ml.rankerv2",
      weekly_digest: "omni.ml.digestv1",
      duplicate_contact_suspected: "omni.ml.dedupe-v3",
      summary: "openrouter/auto",
      next_step: "openrouter/auto",
      risk: "openrouter/auto",
      persona: "openrouter/auto",
    };

    return modelMappings[kind] ?? "gpt-5";
  }

  private async storeInsight(insight: NewAiInsight): Promise<string> {
    const db = await getDb();

    const result = await db.execute(sql`
      INSERT INTO ai_insights (
        user_id, subject_type, subject_id, kind, content, model, created_at
      ) VALUES (
        ${insight.userId}, ${insight.subjectType}, ${insight.subjectId},
        ${insight.kind}, ${JSON.stringify(insight.content)}, ${insight.model},
        ${new Date().toISOString()}
      )
      RETURNING id
    `);

    const row = result[0] as { id: string };
    return row.id;
  }

  /**
   * Get recent insights for user
   */
  async getRecentInsights(
    userId: string,
    options: {
      subjectType?: InsightSubjectType;
      subjectId?: string;
      kinds?: InsightKind[];
      limit?: number;
    } = {},
  ): Promise<Array<Record<string, unknown>>> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT id, subject_type, subject_id, kind, content, model, created_at
      FROM ai_insights
      WHERE user_id = ${userId}
        ${options.subjectType ? sql`AND subject_type = ${options.subjectType}` : sql``}
        ${options.subjectId ? sql`AND subject_id = ${options.subjectId}` : sql``}
        ${options.kinds?.length ? sql`AND kind = ANY(${options.kinds})` : sql``}
      ORDER BY created_at DESC
      LIMIT ${options.limit ?? 20}
    `);

    return result as Array<Record<string, unknown>>;
  }

  /**
   * Mark insight as viewed/dismissed/applied
   */
  async updateInsightStatus(
    insightId: string,
    status: "viewed" | "dismissed" | "applied",
  ): Promise<void> {
    const db = await getDb();

    await db.execute(sql`
      UPDATE ai_insights
      SET content = jsonb_set(content, '{status}', ${JSON.stringify(status)})
      WHERE id = ${insightId}
    `);
  }
}

export async function runInsight(job: JobRecord<"insight">): Promise<void> {
  const startTime = Date.now();
  const insightWriter = new InsightWriter();

  try {
    // Parse job payload
    const payload = job.payload;
    const subjectType = payload.subjectType ?? "inbox";
    const subjectId = payload.subjectId;
    const kind = payload.kind ?? "summary";

    await logger.info("Starting insight generation", {
      operation: "insight_generate",
      additionalData: {
        userId: job.userId,
        subjectType,
        subjectId,
        kind,
        jobId: job.id,
      },
    });

    // Create task for InsightWriter
    const task: InsightGenerationTask = {
      userId: job.userId,
      subjectType,
      subjectId: subjectId ?? null,
      kind,
      context: payload.context,
    };

    // Generate insight using InsightWriter
    const insightId = await insightWriter.generateInsight(task);

    if (!insightId) {
      throw new Error(`Failed to generate insight for kind: ${kind}`);
    }

    const duration = Date.now() - startTime;
    await logger.info("Insight generation completed", {
      operation: "insight_generate",
      additionalData: {
        userId: job.userId,
        subjectType,
        kind,
        duration,
        insightId,
        jobId: job.id,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    await logger.error(
      "Insight generation failed",
      {
        operation: "insight_generate",
        additionalData: {
          userId: job.userId,
          duration,
          jobId: job.id,
        },
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}
