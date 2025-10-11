// Main orchestrator for contact insights

import { logger } from "@/lib/observability";
import { getUserContext } from "packages/repo/src/auth-user.repo";
import { getContactData } from "./utils/contact-utils";
import { getDb } from "@/server/db/client";
import { contacts, notes } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { analyzeEventPatterns } from "./analyze-event-patterns";
import { analyzeGmailPatterns } from "./analyze-gmail-patterns";
import { generateAIAnalysis } from "./generate-ai-analysis";

interface ContactInsightsWithNote {
  noteContent: string;
  lifecycleStage: string;
  tags: string[];
  confidenceScore: number;
}

const fallback = (): ContactInsightsWithNote => ({
  noteContent: "Fallback",
  lifecycleStage: "Prospect",
  tags: [],
  confidenceScore: 0.1,
});

// Helper function to safely parse JSON tags
function parseTagsSafely(tagsJson: string | null, contactEmail: string): string[] {
  if (!tagsJson) return [];

  try {
    return JSON.parse(tagsJson);
  } catch (error) {
    console.error(`Failed to parse tags for contact ${contactEmail}:`, error);
    return [];
  }
}

export async function generateContactInsights(
  userId: string,
  contactEmail: string, // or contactId
  options: { forceRefresh?: boolean; fetchOnly?: boolean } = {},
): Promise<ContactInsightsWithNote> {
  try {
    logger
      .info("Generating insights", {
        operation: "generate_insights",
        additionalData: { userId, contactEmail, forceRefresh: options.forceRefresh },
      })
      .catch(() => {}); // Fire-and-forget logging

    const userContext = await getUserContext(userId);
    if (userContext && contactEmail.toLowerCase() === userContext.email.toLowerCase()) {
      logger.info("Skipping own email", { operation: "skip_own_email" }).catch(() => {}); // Fire-and-forget logging
      return fallback();
    }

    const db = await getDb();

    // Inline recent enrichment check: query DB for last enriched
    const recentEnrichment = await db
      .select({
        updatedAt: contacts.updatedAt,
        lifecycleStage: contacts.lifecycleStage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, contactEmail)))
      .limit(1);

    if (recentEnrichment.length > 0 && !options.forceRefresh) {
      logger
        .info("Using cached insights", {
          operation: "using_cached_insights",
          additionalData: { lastEnriched: recentEnrichment[0]?.updatedAt },
        })
        .catch(() => {}); // Fire-and-forget logging
      if (recentEnrichment[0]) {
        const rec = recentEnrichment[0];
        const tags = parseTagsSafely(rec.tags as string, contactEmail);

        return {
          noteContent: "",
          lifecycleStage: rec.lifecycleStage || "Prospect",
          tags,
          confidenceScore: parseFloat(rec.confidenceScore || "0.5"),
        };
      }
    }

    const contactData = await getContactData(userId, contactEmail);

    const events = contactData.calendarEvents;
    const gmailInteractions = contactData.interactions;

    // Check if we have new data since last enrichment
    const lastEnrichmentTime = recentEnrichment[0]?.updatedAt || new Date(0);

    // If no events or interactions, no new data
    if (events.length === 0 && gmailInteractions.length === 0) {
      return fallback();
    }

    // Check if any data is newer than last enrichment
    const hasNewData = [...events, ...gmailInteractions].some((item) => {
      const timestamp = "startTime" in item ? item.startTime : item.occurredAt;
      return timestamp && new Date(timestamp) > lastEnrichmentTime;
    });

    if (!hasNewData && !options.forceRefresh) {
      // Inline getExistingInsights: query DB for existing insights
      const existingInsights = await db
        .select({
          id: contacts.id,
          lifecycleStage: contacts.lifecycleStage,
          tags: contacts.tags,
          confidenceScore: contacts.confidenceScore,
        })
        .from(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, contactEmail)))
        .limit(1);

      if (existingInsights.length > 0 && existingInsights[0]) {
        const ex = existingInsights[0];
        const tags = parseTagsSafely(ex.tags as string, contactEmail);

        return {
          noteContent: "",
          lifecycleStage: ex.lifecycleStage || "Prospect",
          tags,
          confidenceScore: parseFloat(ex.confidenceScore || "0.5"),
        };
      }
    }

    const [eventAnalysis, gmailAnalysis] = await Promise.all([
      analyzeEventPatterns(
        events.map((event) => ({
          ...event,
          start_time: event.startTime?.toISOString() || "",
        })),
      ),
      analyzeGmailPatterns(
        gmailInteractions.map((interaction) => ({
          ...interaction,
          threadId: interaction.sourceId || "",
          isOutbound: interaction.type === "sent",
          labels: [],
          subject: interaction.subject || "",
          bodyText: interaction.bodyText || "",
          occurredAt: interaction.occurredAt.toISOString(),
        })),
      ),
    ]);

    // Add to eventAnalysis if missing
    const fullEventAnalysis = {
      ...eventAnalysis,
      averageEventsPerMonth: eventAnalysis.averageEventsPerMonth || 0,
    };
    const aiInsights = await generateAIAnalysis(
      userId,
      contactEmail,
      events.map((event) => ({
        ...event,
        start_time: event.startTime?.toISOString() || "",
        description: event.description || "",
      })),
      gmailInteractions.map((interaction) => ({
        ...interaction,
        isOutbound: interaction.type === "sent",
        labels: [],
      })),
      fullEventAnalysis,
      gmailAnalysis,
    );

    // Wrap contact update and notes insert in a transaction
    await db.transaction(async (tx) => {
      // Update contacts table with stage/tags/confidence
      await tx
        .update(contacts)
        .set({
          lifecycleStage: aiInsights.lifecycleStage,
          tags: JSON.stringify(aiInsights.tags),
          confidenceScore: aiInsights.confidenceScore.toString(),
          updatedAt: new Date(),
        })
        .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, contactEmail)));

      // Create note if noteContent exists
      if (aiInsights.noteContent) {
        const contact = await tx
          .select({ id: contacts.id })
          .from(contacts)
          .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, contactEmail)))
          .limit(1);
        if (contact.length > 0 && contact[0]) {
          await tx.insert(notes).values({
            userId,
            contactId: contact[0]?.id,
            content: aiInsights.noteContent,
            createdAt: new Date(),
          });
        }
      }
    });

    return aiInsights;
  } catch (_error) {
    logger
      .error("Insights generation failed", {
        operation: "insights_error",
        additionalData: { userId, contactEmail },
      })
      .catch(() => {}); // Fire-and-forget logging
    return fallback();
  }
}
