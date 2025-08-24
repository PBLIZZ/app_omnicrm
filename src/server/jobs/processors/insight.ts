import { supaAdminGuard } from "@/server/db/supabase-admin";
import { getDb } from "@/server/db/client";
import { interactions, contacts } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  generateContactSummary,
  generateNextSteps, 
  generateRiskAssessment,
  generatePersonaInsight,
  type InsightRequest
} from "@/server/ai/llm.service";
import { log } from "@/server/log";
import type { JobRecord } from "../types";

// Type guard for insight job payload
interface InsightJobPayload {
  subjectType?: "contact" | "segment" | "inbox";
  subjectId?: string;
  kind?: "summary" | "next_step" | "risk" | "persona";
  batchId?: string;
}

function isInsightPayload(payload: unknown): payload is InsightJobPayload {
  return typeof payload === "object" && payload !== null;
}

export async function runInsight(job: JobRecord): Promise<void> {
  const startTime = Date.now();
  const db = await getDb();
  
  try {
    // Parse job payload
    const payload = isInsightPayload(job.payload) ? job.payload : {};
    const subjectType = payload.subjectType ?? "inbox";
    const subjectId = payload.subjectId;
    const kind = payload.kind ?? "summary";
    
    log.info({
      op: "insight.start",
      userId: job.userId,
      subjectType,
      subjectId,
      kind,
      jobId: job.id
    }, "Starting insight generation");

    let insightContent: Record<string, unknown>;
    let model: string | null = null;

    if (subjectType === "contact" && subjectId) {
      // Generate contact-specific insights
      insightContent = await generateContactInsight(db, job.userId, subjectId, kind);
      model = "openrouter/auto"; // This will be set by the LLM service
    } else if (subjectType === "inbox") {
      // Generate inbox-level insights
      insightContent = await generateInboxInsight(db, job.userId, kind);
      model = "openrouter/auto";
    } else {
      // Fallback to placeholder for unsupported types
      insightContent = { 
        placeholder: true, 
        reason: "Unsupported subject type or missing subject ID"
      };
    }

    // Store the generated insight
    await supaAdminGuard.insert("ai_insights", {
      userId: job.userId,
      subjectType,
      subjectId: subjectId ?? null,
      kind,
      content: insightContent,
      model,
    });

    const duration = Date.now() - startTime;
    log.info({
      op: "insight.complete",
      userId: job.userId,
      subjectType,
      kind,
      duration,
      jobId: job.id
    }, "Insight generation completed");

  } catch (error) {
    const duration = Date.now() - startTime;
    log.error({
      op: "insight.error",
      userId: job.userId,
      error: error instanceof Error ? error.message : String(error),
      duration,
      jobId: job.id
    }, "Insight generation failed");
    throw error;
  }
}

/**
 * Generate insights for a specific contact
 */
async function generateContactInsight(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  contactId: string,
  kind: string
): Promise<Record<string, unknown>> {
  // Get contact details
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
    .limit(1);

  if (!contact) {
    throw new Error(`Contact not found: ${contactId}`);
  }

  // Get recent interactions for this contact
  const contactInteractions = await db
    .select({
      type: interactions.type,
      subject: interactions.subject,
      bodyText: interactions.bodyText,
      occurredAt: interactions.occurredAt,
      source: interactions.source
    })
    .from(interactions)
    .where(and(
      eq(interactions.userId, userId),
      eq(interactions.contactId, contactId)
    ))
    .orderBy(desc(interactions.occurredAt))
    .limit(50); // Last 50 interactions for context

  const request: InsightRequest = {
    subjectType: "contact",
    subjectId: contactId,
    kind: kind as "summary" | "next_step" | "risk" | "persona",
    context: {
      contact: {
        displayName: contact.displayName,
        ...(contact.primaryEmail ? { primaryEmail: contact.primaryEmail } : {}),
        ...(contact.primaryPhone ? { primaryPhone: contact.primaryPhone } : {})
      },
      interactions: contactInteractions.map(i => ({
        type: i.type,
        ...(i.subject ? { subject: i.subject } : {}),
        ...(i.bodyText ? { bodyText: i.bodyText } : {}),
        occurredAt: i.occurredAt,
        ...(i.source ? { source: i.source } : {})
      }))
    }
  };

  // Generate the appropriate insight type
  switch (kind) {
    case "summary":
      return await generateContactSummary(userId, request) as unknown as Record<string, unknown>;
    case "next_step":
      return await generateNextSteps(userId, request) as unknown as Record<string, unknown>;
    case "risk":
      return await generateRiskAssessment(userId, request) as unknown as Record<string, unknown>;
    case "persona":
      return await generatePersonaInsight(userId, request) as unknown as Record<string, unknown>;
    default:
      throw new Error(`Unknown insight kind: ${kind}`);
  }
}

/**
 * Generate inbox-level insights (across all interactions)
 */
async function generateInboxInsight(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  kind: string
): Promise<Record<string, unknown>> {
  // Get recent interactions across all contacts
  const recentInteractions = await db
    .select({
      type: interactions.type,
      subject: interactions.subject,
      bodyText: interactions.bodyText,
      occurredAt: interactions.occurredAt,
      source: interactions.source,
      contactId: interactions.contactId
    })
    .from(interactions)
    .where(eq(interactions.userId, userId))
    .orderBy(desc(interactions.occurredAt))
    .limit(100); // Recent activity for inbox insights

  // For inbox insights, we focus on summaries - removing unused variable for non-summary cases
  // const request: InsightRequest = {
  //   subjectType: "inbox",
  //   kind: kind as "summary" | "next_step" | "risk" | "persona",
  //   context: {
  //     interactions: recentInteractions.map(i => ({
  //       type: i.type,
  //       ...(i.subject ? { subject: i.subject } : {}),
  //       ...(i.bodyText ? { bodyText: i.bodyText } : {}),
  //       occurredAt: i.occurredAt,
  //       ...(i.source ? { source: i.source } : {})
  //     })),
  //     timeframe: "recent"
  //   }
  // };

  // For inbox insights, we mainly focus on summaries
  switch (kind) {
    case "summary":
      // Generate an overall activity summary
      return {
        type: "inbox_summary",
        totalInteractions: recentInteractions.length,
        interactionBreakdown: recentInteractions.reduce((acc, i) => {
          acc[i.type] = (acc[i.type] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        dateRange: {
          from: recentInteractions.length > 0 ? recentInteractions[recentInteractions.length - 1]!.occurredAt : null,
          to: recentInteractions.length > 0 ? recentInteractions[0]!.occurredAt : null
        },
        uniqueContacts: new Set(recentInteractions.map(i => i.contactId).filter(Boolean)).size
      };
    default:
      // For non-summary inbox insights, return a placeholder
      return { 
        placeholder: true, 
        reason: `Inbox-level ${kind} insights not yet implemented` 
      };
  }
}
