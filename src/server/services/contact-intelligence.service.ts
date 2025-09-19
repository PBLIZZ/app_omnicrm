import { getDb } from "@/server/db/client";
import { interactions, notes, contacts } from "@/server/db/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { isObject, getString } from "@/lib/utils/type-guards";
import { OpenAI } from "openai";
// import { calendarStorage } from "@/server/storage/calendar.storage";
import { getUserContext } from "@/server/repositories/auth-user.repo";

// import type { CalendarEventData } from "@/server/storage/calendar.storage";
interface CalendarEventData {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

// Interface for Gmail interaction data
interface GmailInteractionData {
  id: string;
  subject: string;
  bodyText: string;
  occurredAt: Date;
  sourceId: string;
  isOutbound: boolean;
  threadId: string | null;
  labels: string[];
}

// Interface for Gmail pattern analysis
interface GmailPatterns {
  totalEmails: number;
  recentEmails: number;
  outboundEmails: number;
  inboundEmails: number;
  uniqueThreads: number;
  communicationDays: number;
  firstEmailDate: Date | null;
  lastEmailDate: Date | null;
  averageEmailsPerMonth: number;
  responseRate: number;
  commonLabels: string[];
  contentInsights: EmailContentInsights;
}

// Interface for email content analysis
interface EmailContentInsights {
  sentimentTrend: "positive" | "neutral" | "negative" | "mixed";
  primaryIntents: EmailIntent[];
  businessContext: BusinessContext[];
  urgencyLevel: "low" | "medium" | "high";
  relationshipStage: "initial" | "developing" | "established" | "strained";
  keyTopics: string[];
  recentContentSummary: string;
}

interface EmailIntent {
  type:
    | "complaint"
    | "inquiry"
    | "recommendation"
    | "thank_you"
    | "follow_up"
    | "meeting_request"
    | "proposal"
    | "support_request";
  confidence: number;
  examples: string[];
}

interface BusinessContext {
  category:
    | "sales"
    | "support"
    | "partnership"
    | "feedback"
    | "networking"
    | "project_collaboration";
  indicators: string[];
  value: "high" | "medium" | "low";
}

// EventDetail interface removed - was unused

// Interface for event patterns analysis
interface EventPatterns {
  totalEvents: number;
  recentEvents: number;
  eventTypes: string[];
  businessCategories: string[];
  relationshipDays: number;
  firstEventDate: Date | null;
  lastEventDate: Date | null;
  averageEventsPerMonth: number;
}

// Note: OpenAI integration moved to other service modules

export interface ContactInsights {
  stage: ClientStage;
  tags: WellnessTag[];
  confidenceScore: number;
}

export interface ContactInsightsWithNote extends ContactInsights {
  noteContent: string;
}

// Interface for the contact intelligence JSON response from OpenAI
interface AIContactIntelligenceResponse {
  notes?: string;
  stage?: string;
  tags?: string[];
  confidenceScore?: number;
}

export type ClientStage =
  | "Prospect"
  | "New Client"
  | "Core Client"
  | "Referring Client"
  | "VIP Client"
  | "Lost Client"
  | "At Risk Client";

export type WellnessTag =
  // Service Types
  | "Yoga"
  | "Massage"
  | "Meditation"
  | "Pilates"
  | "Reiki"
  | "Acupuncture"
  | "Personal Training"
  | "Nutrition Coaching"
  | "Life Coaching"
  | "Therapy"
  | "Workshops"
  | "Retreats"
  | "Group Classes"
  | "Private Sessions"

  // Demographics
  | "Senior"
  | "Young Adult"
  | "Professional"
  | "Parent"
  | "Student"
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "VIP"
  | "Local"
  | "Traveler"

  // Goals & Interests
  | "Stress Relief"
  | "Weight Loss"
  | "Flexibility"
  | "Strength Building"
  | "Pain Management"
  | "Mental Health"
  | "Spiritual Growth"
  | "Mindfulness"
  | "Athletic Performance"
  | "Injury Recovery"
  | "Prenatal"
  | "Postnatal"

  // Engagement Patterns
  | "Regular Attendee"
  | "Weekend Warrior"
  | "Early Bird"
  | "Evening Preferred"
  | "Seasonal Client"
  | "Frequent Visitor"
  | "Occasional Visitor"
  | "High Spender"
  | "Referral Source"
  | "Social Media Active";

export class ContactIntelligenceService {
  /**
   * Generate AI insights for a contact based on calendar events and Gmail interactions
   * Includes incremental processing to avoid redundant LLM calls
   */
  static async generateContactInsights(
    userId: string,
    contactEmail: string,
    forceRefresh: boolean = false,
  ): Promise<ContactInsightsWithNote> {
    try {
      await logger.info("contact_intelligence_generating_insights", {
        operation: "generate_contact_insights",
        additionalData: {
          contactEmail: contactEmail.slice(0, 20) + "...",
          userId: userId.slice(0, 8) + "...",
          forceRefresh,
        },
      });

      // Get user context to avoid analyzing the user themselves
      const userContext = await this.getUserContext(userId);
      if (userContext && contactEmail.toLowerCase() === userContext.email.toLowerCase()) {
        await logger.info("contact_intelligence_skipping_own_email", {
          operation: "generate_contact_insights",
        });
        return this.generateFallbackInsights(contactEmail);
      }

      // Check for recent enrichment unless forced refresh
      if (!forceRefresh) {
        const recentEnrichment = await this.getRecentEnrichment(userId, contactEmail);
        if (recentEnrichment) {
          await logger.info("contact_intelligence_using_cached_insights", {
            operation: "generate_contact_insights",
            additionalData: {
              contactEmail: contactEmail.slice(0, 3) + "***",
              lastEnriched: recentEnrichment.lastEnriched,
            },
          });
          return recentEnrichment;
        }
      }

      // Fetch both calendar events and Gmail interactions
      const [events, gmailInteractions] = await Promise.all([
        this.getContactEvents(),
        this.getContactGmailInteractions(userId, contactEmail),
      ]);

      if (events.length === 0 && gmailInteractions.length === 0) {
        return this.generateFallbackInsights(contactEmail);
      }

      // Check if we need to process new data since last enrichment
      const hasNewData = await this.hasNewDataSinceLastEnrichment(
        userId,
        contactEmail,
        events,
        gmailInteractions,
      );

      if (!hasNewData && !forceRefresh) {
        // Return existing insights if no new data
        const existingInsights = await this.getExistingInsights(userId, contactEmail);
        if (existingInsights) {
          return existingInsights;
        }
      }

      // Analyze patterns from both data sources
      const eventAnalysis = await this.analyzeEventPatterns(events);
      const gmailAnalysis = await this.analyzeGmailPatterns(gmailInteractions);

      // Generate AI insights combining both data sources
      const aiInsights = await this.generateEnhancedAIAnalysis(
        contactEmail,
        events,
        gmailInteractions,
        eventAnalysis,
        gmailAnalysis,
      );

      // Cache the enrichment results
      await this.cacheEnrichmentResults(contactEmail, aiInsights, events, gmailInteractions);

      return aiInsights;
    } catch (error) {
      await logger.error(
        "contact_intelligence_generation_failed",
        {
          operation: "generate_contact_insights",
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            contactEmail: contactEmail.slice(0, 3) + "***",
          },
        },
        error instanceof Error ? error : undefined,
      );

      return this.generateFallbackInsights(contactEmail);
    }
  }

  /**
   * Bulk generate insights for multiple contacts
   */
  static async bulkGenerateInsights(
    userId: string,
    contactEmails: string[],
  ): Promise<Map<string, ContactInsightsWithNote>> {
    const insights = new Map<string, ContactInsightsWithNote>();

    await logger.info("contact_intelligence_bulk_generating", {
      operation: "bulk_generate_insights",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        contactCount: contactEmails.length,
      },
    });

    for (const email of contactEmails) {
      const contactInsights = await this.generateContactInsights(userId, email);
      insights.set(email, contactInsights);

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return insights;
  }

  /**
   * Get user context to identify the user's own email
   */
  private static async getUserContext(userId: string): Promise<{ email: string } | null> {
    return await getUserContext(userId);
  }

  /**
   * Check for recent enrichment to avoid redundant processing
   */
  private static async getRecentEnrichment(
    userId: string,
    contactEmail: string,
  ): Promise<(ContactInsightsWithNote & { lastEnriched: Date }) | null> {
    const db = await getDb();

    // Check if contact was enriched recently (within last 24 hours)
    const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const contact = await db
        .select({
          stage: contacts.stage,
          tags: contacts.tags,
          confidenceScore: contacts.confidenceScore,
          updatedAt: contacts.updatedAt,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, userId),
            eq(contacts.primaryEmail, contactEmail),
            sql`${contacts.updatedAt} > ${recentThreshold}`,
          ),
        )
        .limit(1);

      if (contact.length === 0) return null;

      const contactData = contact[0];
      if (!contactData?.stage || !contactData.updatedAt) return null;

      // Parse tags safely with type validation
      let parsedTags: WellnessTag[] = [];
      if (contactData.tags) {
        try {
          const tagsData: unknown = JSON.parse(contactData.tags as string);
          if (Array.isArray(tagsData) && tagsData.every((tag) => typeof tag === "string")) {
            parsedTags = this.validateTags(tagsData);
          }
        } catch {
          // Invalid JSON, keep empty array
        }
      }

      return {
        noteContent: `Recent enrichment from ${contactData.updatedAt.toISOString()}`,
        stage: contactData.stage as ClientStage,
        tags: parsedTags,
        confidenceScore: parseFloat(contactData.confidenceScore ?? "0"),
        lastEnriched: contactData.updatedAt,
      };
    } catch (error) {
      await logger.warn("Failed to check recent enrichment", {
        operation: "contact_intelligence.get_recent_enrichment",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return null;
    }
  }

  /**
   * Check if there's new data since last enrichment
   */
  private static async hasNewDataSinceLastEnrichment(
    userId: string,
    contactEmail: string,
    events: CalendarEventData[],
    gmailInteractions: GmailInteractionData[],
  ): Promise<boolean> {
    const db = await getDb();

    try {
      // Get last enrichment timestamp
      const contact = await db
        .select({ updatedAt: contacts.updatedAt })
        .from(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, contactEmail)))
        .limit(1);

      if (contact.length === 0) return true; // No previous enrichment

      const lastEnriched = contact[0]?.updatedAt;
      if (!lastEnriched) return true;

      // Check for new calendar events
      const newEvents = events.filter((event) => new Date(event.start_time) > lastEnriched);

      // Check for new Gmail interactions
      const newEmails = gmailInteractions.filter(
        (email) => new Date(email.occurredAt) > lastEnriched,
      );

      return newEvents.length > 0 || newEmails.length > 0;
    } catch (error) {
      await logger.warn("Failed to check for new data", {
        operation: "contact_intelligence.has_new_data",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return true; // Default to processing if check fails
    }
  }

  /**
   * Get existing insights from database
   */
  private static async getExistingInsights(
    userId: string,
    contactEmail: string,
  ): Promise<ContactInsightsWithNote | null> {
    const db = await getDb();

    try {
      const contact = await db
        .select({
          stage: contacts.stage,
          tags: contacts.tags,
          confidenceScore: contacts.confidenceScore,
        })
        .from(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, contactEmail)))
        .limit(1);

      if (contact.length === 0) return null;

      const contactData = contact[0];
      if (!contactData?.stage) return null;

      // Parse tags safely with type validation
      let parsedTags: WellnessTag[] = [];
      if (contactData.tags) {
        try {
          const tagsData: unknown = JSON.parse(contactData.tags as string);
          if (Array.isArray(tagsData) && tagsData.every((tag) => typeof tag === "string")) {
            parsedTags = this.validateTags(tagsData);
          }
        } catch {
          // Invalid JSON, keep empty array
        }
      }

      return {
        noteContent: "Existing enrichment data",
        stage: contactData.stage as ClientStage,
        tags: parsedTags,
        confidenceScore: parseFloat(contactData.confidenceScore ?? "0"),
      };
    } catch (error) {
      await logger.warn("Failed to get existing insights", {
        operation: "contact_intelligence.get_existing_insights",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return null;
    }
  }

  /**
   * Cache enrichment results for future use
   */
  private static async cacheEnrichmentResults(
    contactEmail: string,
    insights: ContactInsightsWithNote,
    events: CalendarEventData[],
    gmailInteractions: GmailInteractionData[],
  ): Promise<void> {
    await logger.info("contact_intelligence_caching_results", {
      operation: "cache_enrichment_results",
      additionalData: {
        contactEmail: contactEmail.slice(0, 3) + "***",
        stage: insights.stage,
        tagsCount: insights.tags.length,
        eventsCount: events.length,
        emailsCount: gmailInteractions.length,
      },
    });
    // Results are cached when the enrichment API updates the contacts table
    // This method serves as a logging point for cache operations
  }

  /**
   * Get calendar events for a specific contact
   */
  private static async getContactEvents(): Promise<CalendarEventData[]> {
    // return await calendarStorage.getContactEvents(userId, contactEmail);
    return []; // Temporary until calendar.storage is restored
  }

  /**
   * Get Gmail interactions for a specific contact
   */
  private static async getContactGmailInteractions(
    userId: string,
    contactEmail: string,
  ): Promise<GmailInteractionData[]> {
    const db = await getDb();

    // Query interactions table for Gmail emails involving this contact
    const gmailInteractions = await db
      .select({
        id: interactions.id,
        subject: interactions.subject,
        bodyText: interactions.bodyText,
        occurredAt: interactions.occurredAt,
        source: interactions.source,
        sourceId: interactions.sourceId,
        sourceMeta: interactions.sourceMeta,
      })
      .from(interactions)
      .where(
        and(
          eq(interactions.userId, userId),
          eq(interactions.source, "gmail"),
          or(
            sql`${interactions.sourceMeta}->>'fromEmail' = ${contactEmail}`,
            sql`${interactions.sourceMeta}->'extractedMetadata'->>'fromEmail' = ${contactEmail}`,
            sql`${contactEmail} = ANY(string_to_array(${interactions.sourceMeta}->>'toEmails', ','))`,
            sql`${contactEmail} = ANY(ARRAY(SELECT jsonb_array_elements_text(${interactions.sourceMeta}->'extractedMetadata'->'toEmails')))`,
          ),
        ),
      )
      .orderBy(desc(interactions.occurredAt))
      .limit(100); // Limit to recent interactions for performance

    return gmailInteractions.map((interaction) => ({
      id: interaction.id,
      subject: interaction.subject ?? "",
      bodyText: interaction.bodyText ?? "",
      occurredAt: interaction.occurredAt,
      sourceId: interaction.sourceId ?? "",
      isOutbound: this.isOutboundEmail(interaction.sourceMeta),
      threadId: this.extractThreadId(interaction.sourceMeta),
      labels: this.extractLabels(interaction.sourceMeta),
    }));
  }

  /**
   * Check if email is outbound based on source metadata
   */
  private static isOutboundEmail(sourceMeta: unknown): boolean {
    if (!isObject(sourceMeta)) return false;

    // Check extracted metadata first
    const extractedMeta = sourceMeta["extractedMetadata"];
    if (isObject(extractedMeta) && typeof extractedMeta["isOutbound"] === "boolean") {
      return extractedMeta["isOutbound"];
    }

    // Fallback: check labels for sent items
    const labels = sourceMeta["labelIds"];
    if (Array.isArray(labels)) {
      return labels.some((label) => typeof label === "string" && ["SENT", "DRAFT"].includes(label));
    }

    return false;
  }

  /**
   * Extract thread ID from source metadata
   */
  private static extractThreadId(sourceMeta: unknown): string | null {
    if (!isObject(sourceMeta)) return null;

    // Try direct threadId first
    const threadId = getString(sourceMeta, "threadId");
    if (threadId) return threadId;

    // Try extractedMetadata.threadId
    const extractedMeta = sourceMeta["extractedMetadata"];
    if (isObject(extractedMeta)) {
      const nestedThreadId = getString(extractedMeta, "threadId");
      if (nestedThreadId) return nestedThreadId;
    }

    return null;
  }

  /**
   * Extract labels from source metadata
   */
  private static extractLabels(sourceMeta: unknown): string[] {
    if (!isObject(sourceMeta)) return [];

    // Try direct labelIds first
    const labelIds = sourceMeta["labelIds"];
    if (Array.isArray(labelIds)) {
      return labelIds.filter((label): label is string => typeof label === "string");
    }

    // Try extractedMetadata.labels
    const extractedMeta = sourceMeta["extractedMetadata"];
    if (isObject(extractedMeta)) {
      const labels = extractedMeta["labels"];
      if (Array.isArray(labels)) {
        return labels.filter((label): label is string => typeof label === "string");
      }
    }

    return [];
  }

  /**
   * Analyze Gmail interaction patterns for insights
   */
  private static async analyzeGmailPatterns(
    gmailInteractions: GmailInteractionData[],
  ): Promise<GmailPatterns> {
    const totalEmails = gmailInteractions.length;
    const recentEmails = gmailInteractions.filter((email) => {
      const emailDate = new Date(email.occurredAt);
      const daysSince = (Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    }).length;

    const outboundEmails = gmailInteractions.filter((email) => email.isOutbound).length;
    const inboundEmails = totalEmails - outboundEmails;

    // Extract communication patterns
    const threadIds = [
      ...new Set(gmailInteractions.map((email) => email.threadId).filter(Boolean)),
    ];
    const uniqueThreads = threadIds.length;

    // Analyze email frequency
    const firstEmailDate =
      gmailInteractions.length > 0
        ? new Date(gmailInteractions[gmailInteractions.length - 1]?.occurredAt ?? new Date())
        : null;
    const lastEmailDate =
      gmailInteractions.length > 0
        ? new Date(gmailInteractions[0]?.occurredAt ?? new Date())
        : null;

    const communicationDays =
      firstEmailDate && lastEmailDate
        ? Math.floor((lastEmailDate.getTime() - firstEmailDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    // Extract common labels and categories
    const allLabels = gmailInteractions.flatMap((email) => email.labels);
    const labelCounts = allLabels.reduce(
      (acc, label) => {
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    await logger.debug("contact_intelligence_gmail_analysis", {
      operation: "analyze_gmail_patterns",
      additionalData: {
        totalEmails,
        recentEmails,
        outboundEmails,
        inboundEmails,
        uniqueThreads,
        communicationDays,
        topLabels: Object.entries(labelCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([label]) => label),
      },
    });

    return {
      totalEmails,
      recentEmails,
      outboundEmails,
      inboundEmails,
      uniqueThreads,
      communicationDays,
      firstEmailDate,
      lastEmailDate,
      averageEmailsPerMonth: communicationDays > 0 ? totalEmails / (communicationDays / 30) : 0,
      responseRate: inboundEmails > 0 ? outboundEmails / inboundEmails : 0,
      commonLabels: Object.entries(labelCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([label]) => label),
      contentInsights: this.analyzeEmailContent(gmailInteractions),
    };
  }

  /**
   * Analyze email content for semantic insights
   */
  private static analyzeEmailContent(
    gmailInteractions: GmailInteractionData[],
  ): EmailContentInsights {
    if (gmailInteractions.length === 0) {
      return {
        sentimentTrend: "neutral",
        primaryIntents: [],
        businessContext: [],
        urgencyLevel: "low",
        relationshipStage: "initial",
        keyTopics: [],
        recentContentSummary: "No email content available",
      };
    }

    // Analyze recent emails (last 30 days) for content insights
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEmails = gmailInteractions.filter(
      (email) => new Date(email.occurredAt) > thirtyDaysAgo,
    );

    // Extract content from emails
    const emailContents = recentEmails
      .map((email) => ({
        subject: email.subject || "",
        body: email.bodyText || "",
        isOutbound: email.isOutbound,
        date: new Date(email.occurredAt),
      }))
      .filter((email) => email.subject || email.body);

    // Analyze sentiment patterns
    const sentimentTrend = this.analyzeSentimentTrend(emailContents);

    // Detect primary intents
    const primaryIntents = this.detectEmailIntents(emailContents);

    // Identify business context
    const businessContext = this.identifyBusinessContext(emailContents);

    // Assess urgency level
    const urgencyLevel = this.assessUrgencyLevel(emailContents);

    // Determine relationship stage
    const relationshipStage = this.determineRelationshipStage(
      emailContents,
      gmailInteractions.length,
    );

    // Extract key topics
    const keyTopics = this.extractKeyTopics(emailContents);

    // Generate recent content summary
    const recentContentSummary = this.generateContentSummary(emailContents);

    return {
      sentimentTrend,
      primaryIntents,
      businessContext,
      urgencyLevel,
      relationshipStage,
      keyTopics,
      recentContentSummary,
    };
  }

  /**
   * Analyze sentiment trend from email content
   */
  private static analyzeSentimentTrend(
    emailContents: Array<{ subject: string; body: string; isOutbound: boolean }>,
  ): "positive" | "neutral" | "negative" | "mixed" {
    if (emailContents.length === 0) return "neutral";

    const positiveKeywords = [
      // General positive
      "thank",
      "great",
      "excellent",
      "pleased",
      "happy",
      "wonderful",
      "amazing",
      "perfect",
      "love",
      "appreciate",
      // Wellness-specific positive
      "joy",
      "peace",
      "peaceful",
      "calm",
      "relaxed",
      "centered",
      "balanced",
      "healing",
      "progress",
      "breakthrough",
      "transformation",
      "growth",
      "clarity",
      "mindful",
      "grateful",
      "blessed",
      "renewed",
      "energized",
      "vibrant",
      "harmony",
      "serenity",
      "enlightened",
      "empowered",
      "restored",
      "rejuvenated",
      "aligned",
      "grounded",
    ];
    const negativeKeywords = [
      // General negative
      "problem",
      "issue",
      "concern",
      "disappointed",
      "frustrated",
      "urgent",
      "complaint",
      "error",
      "wrong",
      "bad",
      // Wellness-specific negative
      "pain",
      "sore",
      "stiff",
      "ache",
      "hurt",
      "tension",
      "stress",
      "anxiety",
      "worried",
      "overwhelmed",
      "blocked",
      "stuck",
      "imbalanced",
      "exhausted",
      "drained",
      "struggling",
      "difficulty",
      "challenge",
      "setback",
      "regression",
      "uncomfortable",
      "restless",
      "agitated",
      "disconnected",
      "lost",
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    emailContents.forEach((email) => {
      const text = (email.subject + " " + email.body).toLowerCase();
      positiveCount += positiveKeywords.filter((keyword) => text.includes(keyword)).length;
      negativeCount += negativeKeywords.filter((keyword) => text.includes(keyword)).length;
    });

    if (positiveCount > negativeCount * 1.5) return "positive";
    if (negativeCount > positiveCount * 1.5) return "negative";
    if (positiveCount > 0 && negativeCount > 0) return "mixed";
    return "neutral";
  }

  /**
   * Detect email intents from content
   */
  private static detectEmailIntents(
    emailContents: Array<{ subject: string; body: string; isOutbound: boolean }>,
  ): EmailIntent[] {
    const intents: EmailIntent[] = [];

    const intentPatterns = {
      complaint: [
        // General complaints
        "complaint",
        "problem",
        "issue",
        "not working",
        "disappointed",
        "frustrated",
        "refund",
        // Wellness-specific complaints
        "not feeling better",
        "worse",
        "no improvement",
        "not helping",
        "uncomfortable with",
        "side effects",
      ],
      inquiry: [
        // General inquiries
        "question",
        "wondering",
        "could you",
        "would you",
        "how to",
        "information about",
        // Wellness-specific inquiries
        "what should i expect",
        "how long until",
        "is it normal",
        "can you explain",
        "what does this mean",
        "should i be concerned",
        "is this part of",
        "when will i see",
        "what can i do",
      ],
      recommendation: [
        // General recommendations
        "recommend",
        "suggest",
        "should try",
        "might want",
        "consider",
        "advice",
        // Wellness-specific recommendations
        "have you tried",
        "what about",
        "might help",
        "could benefit from",
        "would be good for",
      ],
      thank_you: [
        // General gratitude
        "thank you",
        "thanks",
        "grateful",
        "appreciate",
        "thankful",
        // Wellness-specific gratitude
        "feeling so much better",
        "life changing",
        "transformed my",
        "blessed to have found",
      ],
      follow_up: [
        // General follow-ups
        "follow up",
        "following up",
        "checking in",
        "any update",
        "status",
        // Wellness-specific follow-ups
        "how am i doing",
        "progress check",
        "next steps",
        "continue with",
        "still experiencing",
      ],
      meeting_request: [
        // General meeting requests
        "meeting",
        "call",
        "schedule",
        "available",
        "calendar",
        "appointment",
        // Wellness-specific appointments
        "session",
        "therapy",
        "treatment",
        "consultation",
        "class",
        "booking",
        "reschedule",
        "cancel appointment",
        "change time",
        "next session",
        "weekly session",
      ],
      proposal: [
        // General proposals
        "proposal",
        "offer",
        "quote",
        "pricing",
        "contract",
        "agreement",
        // Wellness-specific proposals
        "treatment plan",
        "program",
        "package",
        "course",
        "workshop",
        "retreat",
      ],
      support_request: [
        // General support
        "help",
        "support",
        "assistance",
        "trouble",
        "not sure how",
        // Wellness-specific support
        "guidance",
        "struggling with",
        "need help with",
        "having difficulty",
        "not sure what to do",
        "feeling lost",
        "need direction",
        "overwhelmed by",
        "confused about",
      ],
    };

    Object.entries(intentPatterns).forEach(([intentType, patterns]) => {
      const examples: string[] = [];
      let totalMatches = 0;

      emailContents.forEach((email) => {
        const text = (email.subject + " " + email.body).toLowerCase();
        const matches = patterns.filter((pattern) => text.includes(pattern));
        totalMatches += matches.length;

        if (matches.length > 0) {
          examples.push(email.subject || email.body.substring(0, 100));
        }
      });

      if (totalMatches > 0) {
        intents.push({
          type: intentType as EmailIntent["type"],
          confidence: Math.min(totalMatches / emailContents.length, 1),
          examples: examples.slice(0, 3),
        });
      }
    });

    return intents.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Identify business context from email patterns
   */
  private static identifyBusinessContext(
    emailContents: Array<{ subject: string; body: string; isOutbound: boolean }>,
  ): BusinessContext[] {
    const contexts: BusinessContext[] = [];

    const contextPatterns = {
      sales: [
        // General sales
        "purchase",
        "buy",
        "price",
        "cost",
        "quote",
        "proposal",
        "deal",
        "contract",
        // Wellness sales
        "package",
        "program",
        "course",
        "membership",
        "subscription",
        "payment plan",
        "investment",
      ],
      support: [
        // General support
        "help",
        "support",
        "issue",
        "problem",
        "bug",
        "error",
        "not working",
        // Wellness support
        "guidance",
        "struggling",
        "difficulty",
        "challenge",
        "setback",
        "regression",
        "plateau",
      ],
      partnership: [
        // General partnership
        "partner",
        "collaboration",
        "joint",
        "together",
        "alliance",
        // Wellness partnership
        "referral",
        "recommend you to",
        "work together",
        "holistic approach",
        "integrated care",
      ],
      feedback: [
        // General feedback
        "feedback",
        "review",
        "opinion",
        "thoughts",
        "suggestion",
        // Wellness feedback
        "progress",
        "improvement",
        "results",
        "outcome",
        "experience",
        "testimonial",
        "breakthrough",
      ],
      networking: [
        // General networking
        "connect",
        "network",
        "introduction",
        "referral",
        "contact",
        // Wellness networking
        "community",
        "group",
        "circle",
        "support network",
        "like-minded",
        "wellness community",
      ],
      project_collaboration: [
        // General collaboration
        "project",
        "deadline",
        "deliverable",
        "milestone",
        "timeline",
        // Wellness collaboration
        "treatment plan",
        "wellness journey",
        "healing process",
        "transformation",
        "goals",
        "objectives",
      ],
    };

    Object.entries(contextPatterns).forEach(([contextType, patterns]) => {
      const indicators: string[] = [];
      let matchCount = 0;

      emailContents.forEach((email) => {
        const text = (email.subject + " " + email.body).toLowerCase();
        const matches = patterns.filter((pattern) => text.includes(pattern));
        matchCount += matches.length;
        indicators.push(...matches);
      });

      if (matchCount > 0) {
        contexts.push({
          category: contextType as BusinessContext["category"],
          indicators: [...new Set(indicators)].slice(0, 5),
          value: matchCount > 3 ? "high" : matchCount > 1 ? "medium" : "low",
        });
      }
    });

    return contexts
      .sort((a, b) => {
        const valueOrder = { high: 3, medium: 2, low: 1 };
        return valueOrder[b.value] - valueOrder[a.value];
      })
      .slice(0, 3);
  }

  /**
   * Assess urgency level from email content
   */
  private static assessUrgencyLevel(
    emailContents: Array<{ subject: string; body: string; isOutbound: boolean }>,
  ): "low" | "medium" | "high" {
    const urgentKeywords = [
      "urgent",
      "asap",
      "immediately",
      "emergency",
      "critical",
      "deadline",
      "rush",
    ];
    const moderateKeywords = ["soon", "quickly", "priority", "important", "time-sensitive"];

    let urgentCount = 0;
    let moderateCount = 0;

    emailContents.forEach((email) => {
      const text = (email.subject + " " + email.body).toLowerCase();
      urgentCount += urgentKeywords.filter((keyword) => text.includes(keyword)).length;
      moderateCount += moderateKeywords.filter((keyword) => text.includes(keyword)).length;
    });

    if (urgentCount > 0) return "high";
    if (moderateCount > 0) return "medium";
    return "low";
  }

  /**
   * Determine relationship stage based on email patterns
   */
  private static determineRelationshipStage(
    emailContents: Array<{ subject: string; body: string; isOutbound: boolean }>,
    totalEmails: number,
  ): "initial" | "developing" | "established" | "strained" {
    if (totalEmails < 3) return "initial";

    const formalityIndicators = ["dear", "sincerely", "best regards", "thank you for your time"];
    const casualIndicators = ["hi", "hey", "thanks", "cheers", "talk soon"];
    const strainedIndicators = [
      "disappointed",
      "frustrated",
      "unacceptable",
      "complaint",
      "escalate",
    ];

    let formalCount = 0;
    let casualCount = 0;
    let strainedCount = 0;

    emailContents.forEach((email) => {
      const text = (email.subject + " " + email.body).toLowerCase();
      formalCount += formalityIndicators.filter((indicator) => text.includes(indicator)).length;
      casualCount += casualIndicators.filter((indicator) => text.includes(indicator)).length;
      strainedCount += strainedIndicators.filter((indicator) => text.includes(indicator)).length;
    });

    if (strainedCount > 0) return "strained";
    if (casualCount > formalCount && totalEmails > 10) return "established";
    if (totalEmails > 5) return "developing";
    return "initial";
  }

  /**
   * Extract key topics from email content
   */
  private static extractKeyTopics(
    emailContents: Array<{ subject: string; body: string; isOutbound: boolean }>,
  ): string[] {
    const topicKeywords = new Map<string, number>();

    // Wellness and therapy-focused topics
    const wellnessTerms = [
      // Treatment modalities
      "therapy",
      "session",
      "treatment",
      "healing",
      "meditation",
      "mindfulness",
      "contemplation",
      "massage",
      "acupuncture",
      "yoga",
      "pilates",
      "reiki",
      "counseling",
      "coaching",
      // Physical wellness
      "pain",
      "sore",
      "stiff",
      "tension",
      "stress",
      "anxiety",
      "depression",
      "fatigue",
      "energy",
      "sleep",
      "nutrition",
      "exercise",
      "movement",
      "breathing",
      "posture",
      // Emotional/spiritual wellness
      "peace",
      "joy",
      "calm",
      "balance",
      "harmony",
      "grounded",
      "centered",
      "aligned",
      "transformation",
      "growth",
      "breakthrough",
      "clarity",
      "awareness",
      "consciousness",
      // Holistic concepts
      "holistic",
      "integrative",
      "natural",
      "organic",
      "wellness",
      "wellbeing",
      "health",
      "mind-body",
      "spirit",
      "chakra",
      "energy",
      "vibration",
      "frequency",
      // Appointment/scheduling
      "appointment",
      "booking",
      "schedule",
      "class",
      "workshop",
      "retreat",
      "program",
    ];

    emailContents.forEach((email) => {
      const text = (email.subject + " " + email.body).toLowerCase();
      wellnessTerms.forEach((term) => {
        if (text.includes(term)) {
          topicKeywords.set(term, (topicKeywords.get(term) ?? 0) + 1);
        }
      });
    });

    return Array.from(topicKeywords.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  /**
   * Generate content summary from recent emails
   */
  private static generateContentSummary(
    emailContents: Array<{ subject: string; body: string; isOutbound: boolean }>,
  ): string {
    if (emailContents.length === 0) return "No recent email content available";

    const recentSubjects = emailContents
      .slice(0, 5)
      .map((email) => email.subject)
      .filter((subject) => subject && subject.length > 0);

    if (recentSubjects.length === 0) return "Recent emails without clear subjects";

    return `Recent communication topics: ${recentSubjects.join(", ")}`;
  }

  /**
   * Analyze event patterns for insights
   */
  private static async analyzeEventPatterns(events: CalendarEventData[]): Promise<EventPatterns> {
    const totalEvents = events.length;
    const recentEvents = events.filter((e) => {
      const eventDate = new Date(e.start_time);
      const daysSince = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    }).length;

    // Extract event types and business categories from titles and descriptions
    const eventTypes = events
      .map((e) => this.extractEventType(e.title, e.description))
      .filter(Boolean);
    const businessCategories = events
      .map((e) => this.extractBusinessCategory(e.title, e.description))
      .filter(Boolean);

    await logger.debug("contact_intelligence_event_analysis", {
      operation: "analyze_event_patterns",
      additionalData: {
        eventCount: eventTypes.length,
        eventTypes: [...new Set(eventTypes)],
        businessCategories: [...new Set(businessCategories)],
      },
    });

    const firstEventDate = ((): Date | null => {
      if (events.length === 0) return null;
      const lastEvent = events[events.length - 1];
      return lastEvent?.start_time ? new Date(lastEvent.start_time) : null;
    })();
    const lastEventDate =
      events.length > 0 ? (events[0]?.start_time ? new Date(events[0].start_time) : null) : null;

    const relationshipDays =
      firstEventDate && lastEventDate
        ? Math.floor((lastEventDate.getTime() - firstEventDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return {
      totalEvents,
      recentEvents,
      eventTypes: Array.from(new Set(eventTypes)),
      businessCategories: Array.from(new Set(businessCategories)),
      relationshipDays,
      firstEventDate,
      lastEventDate,
      averageEventsPerMonth: relationshipDays > 0 ? totalEvents / (relationshipDays / 30) : 0,
    };
  }

  /**
   * Generate basic insights without AI (REMOVED - unused method)
   */
  /* private static getBasicInsights(patterns: EventPatterns): ContactInsightsWithNote {
    let stage: ClientStage = "Prospect";
    let confidenceScore = 0.3;

    // Apply corrected wellness business logic
    if (patterns.totalEvents >= 10) {
      stage = "VIP Client";
      confidenceScore = 0.9; // High confidence for 10+ events
    } else if (patterns.totalEvents >= 6) {
      stage = "Core Client";
      confidenceScore = 0.85; // High confidence for 6+ events
    } else if (patterns.totalEvents >= 1) {
      // CRITICAL FIX: Anyone with 1+ events is a client, not prospect
      stage = "New Client";
      confidenceScore = 0.75; // Good confidence for event attendance
    } else if (patterns.recentEvents === 0 && patterns.totalEvents > 0) {
      stage = "Lost Client";
      confidenceScore = 0.7;
    }
    // Only contacts with 0 events remain as 'Prospect'

    const tags: WellnessTag[] = [];

    // Enhanced tag detection with better coverage
    if (patterns.totalEvents >= 3) tags.push("Regular Attendee");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("yoga")))
      tags.push("Yoga");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("massage")))
      tags.push("Massage");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("meditation")))
      tags.push("Meditation");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("pilates")))
      tags.push("Pilates");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("workshop")))
      tags.push("Workshops");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("private")))
      tags.push("Private Sessions");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("class")))
      tags.push("Group Classes");

    // Business category tags
    if (patterns.businessCategories.some((c: string) => c?.toLowerCase().includes("wellness")))
      tags.push("Stress Relief");
    if (patterns.businessCategories.some((c: string) => c?.toLowerCase().includes("fitness")))
      tags.push("Strength Building");

    // Engagement pattern tags
    if (patterns.averageEventsPerMonth >= 2) tags.push("Frequent Visitor");
    if (patterns.totalEvents >= 1 && patterns.totalEvents < 3) tags.push("Occasional Visitor");

    // Ensure we have meaningful tags based on actual data
    if (tags.length === 0 && patterns.totalEvents > 0) {
      // If we have events but no specific tags, add general wellness tags
      tags.push("Beginner", "Stress Relief");
    }

    return {
      noteContent: `Contact with ${patterns.totalEvents} wellness interactions over ${patterns.relationshipDays} days. ${patterns.recentEvents > 0 ? "Recently active." : "No recent activity."}`,
      stage,
      tags,
      confidenceScore,
    };
  } */

  /**
   * Generate fallback insights for contacts with no data
   */
  private static generateFallbackInsights(contactEmail: string): ContactInsightsWithNote {
    return {
      noteContent: `Contact ${contactEmail.slice(0, 20)}... found but no calendar events or Gmail interactions recorded. May be a secondary attendee or contact reference.`,
      stage: "Prospect", // Note: This should be manually verified - could be Non-Client or Lost Client
      tags: [],
      confidenceScore: 0.1, // Very low confidence for 0 events
    };
  }

  /**
   * Generate enhanced AI analysis combining calendar and Gmail data
   */
  private static async generateEnhancedAIAnalysis(
    contactEmail: string,
    events: CalendarEventData[],
    gmailInteractions: GmailInteractionData[],
    eventAnalysis: EventPatterns,
    gmailAnalysis: GmailPatterns,
  ): Promise<ContactInsightsWithNote> {
    const openai = new OpenAI({
      apiKey: process.env["OPENAI_API_KEY"],
    });

    // Create comprehensive prompt combining both data sources
    const eventDetails = events.slice(0, 10).map((event) => ({
      title: event.title,
      description: event.description ?? "",
      date: event.start_time,
      type: this.extractEventType(event.title, event.description),
      category: this.extractBusinessCategory(event.title, event.description),
      location: event.location ?? "",
    }));

    const emailDetails = gmailInteractions.slice(0, 10).map((email) => ({
      subject: email.subject,
      bodyPreview: email.bodyText.substring(0, 200) + "...",
      date: email.occurredAt,
      isOutbound: email.isOutbound,
      labels: email.labels.slice(0, 3), // Top 3 labels only
    }));

    const prompt = `
Analyze this contact's wellness journey using both calendar events and email communications:

CONTACT: ${contactEmail}

CALENDAR EVENTS (${eventAnalysis.totalEvents} total, ${eventAnalysis.recentEvents} recent):
${JSON.stringify(eventDetails, null, 2)}

EMAIL COMMUNICATIONS (${gmailAnalysis.totalEmails} total, ${gmailAnalysis.recentEmails} recent):
Outbound: ${gmailAnalysis.outboundEmails}, Inbound: ${gmailAnalysis.inboundEmails}
Response Rate: ${(gmailAnalysis.responseRate * 100).toFixed(1)}%
${JSON.stringify(emailDetails, null, 2)}

ANALYSIS PATTERNS:
Calendar: ${eventAnalysis.totalEvents} events over ${eventAnalysis.relationshipDays} days
Email: ${gmailAnalysis.totalEmails} emails over ${gmailAnalysis.communicationDays} days
Common Labels: ${gmailAnalysis.commonLabels.join(", ")}

Based on this comprehensive data, provide wellness insights as JSON:
{
  "stage": "Prospect|Active Client|Regular Client|VIP Client|At Risk|Lost Client|Non-Client",
  "tags": ["array of relevant wellness tags"],
  "confidenceScore": 0.0-1.0,
  "notes": "Personalized insights combining calendar and email patterns"
}

Consider:
- Email engagement patterns and response rates
- Calendar event frequency and types
- Communication style and preferences
- Overall relationship progression
- Wellness service preferences from both sources
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const messageContent = response.choices?.[0]?.message?.content;
      const result = messageContent
        ? (JSON.parse(messageContent) as AIContactIntelligenceResponse)
        : {};

      const noteContent =
        result.notes ??
        `Contact with ${eventAnalysis.totalEvents} calendar events and ${gmailAnalysis.totalEmails} email interactions`;
      const stage = this.validateStage(result.stage ?? "Prospect");
      const tags = this.validateTags(result.tags ?? []);
      const confidenceScore = Math.min(1.0, Math.max(0.0, result.confidenceScore ?? 0.5));

      return {
        noteContent,
        stage,
        tags,
        confidenceScore,
      };
    } catch (error) {
      await logger.error(
        "Enhanced AI analysis failed",
        {
          operation: "contact_intelligence.enhanced_ai_analysis",
          additionalData: {
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        error instanceof Error ? error : undefined,
      );

      // Fallback to combining basic insights from both sources
      return this.getCombinedBasicInsights(eventAnalysis, gmailAnalysis);
    }
  }

  /**
   * Generate combined basic insights from both calendar and Gmail data
   */
  private static getCombinedBasicInsights(
    eventAnalysis: EventPatterns,
    gmailAnalysis: GmailPatterns,
  ): ContactInsightsWithNote {
    let stage: ClientStage = "Prospect";
    let confidenceScore = 0.3;

    // Enhanced stage determination using both data sources
    const totalInteractions = eventAnalysis.totalEvents + gmailAnalysis.totalEmails;
    const recentInteractions = eventAnalysis.recentEvents + gmailAnalysis.recentEmails;

    if (totalInteractions >= 10 && recentInteractions >= 3) {
      stage = "VIP Client";
      confidenceScore = 0.9;
    } else if (totalInteractions >= 5 && recentInteractions >= 2) {
      stage = "VIP Client";
      confidenceScore = 0.8;
    } else if (totalInteractions >= 2 && recentInteractions >= 1) {
      stage = "Prospect";
      confidenceScore = 0.7;
    } else if (totalInteractions >= 1) {
      stage = "Prospect";
      confidenceScore = 0.5;
    }

    // Combine tags from both sources
    const tags: WellnessTag[] = [];

    // Calendar-based tags
    if (eventAnalysis.eventTypes.some((t: string) => t?.toLowerCase().includes("yoga")))
      tags.push("Yoga");
    if (eventAnalysis.eventTypes.some((t: string) => t?.toLowerCase().includes("massage")))
      tags.push("Massage");
    if (eventAnalysis.eventTypes.some((t: string) => t?.toLowerCase().includes("meditation")))
      tags.push("Meditation");

    // Email-based engagement tags (using existing wellness tags)
    if (gmailAnalysis.responseRate > 0.7) tags.push("Frequent Visitor");
    if (gmailAnalysis.outboundEmails > gmailAnalysis.inboundEmails) tags.push("Referral Source");
    if (gmailAnalysis.averageEmailsPerMonth >= 2) tags.push("Social Media Active");

    // Combined frequency tags
    if (eventAnalysis.averageEventsPerMonth >= 2 || gmailAnalysis.averageEmailsPerMonth >= 4) {
      tags.push("Frequent Visitor");
    }

    return {
      noteContent: `Contact with ${eventAnalysis.totalEvents} calendar events and ${gmailAnalysis.totalEmails} email interactions. ${recentInteractions > 0 ? "Recently active across both channels." : "No recent activity."}`,
      stage,
      tags,
      confidenceScore,
    };
  }

  /**
   * Validate and normalize stage value
   */
  private static validateStage(stage: string): ClientStage {
    const validStages: ClientStage[] = [
      "Prospect",
      "New Client",
      "Core Client",
      "Referring Client",
      "VIP Client",
      "Lost Client",
      "At Risk Client",
    ];

    return validStages.includes(stage as ClientStage) ? (stage as ClientStage) : "Prospect";
  }

  /**
   * Create AI-generated note for a contact
   */
  static async createAINote(contactId: string, userId: string, noteContent: string): Promise<void> {
    try {
      const db = await getDb();
      await db.insert(notes).values({
        contactId,
        userId,
        content: `[OmniBot] ${noteContent}`,
      });

      await logger.info("contact_intelligence_note_created", {
        operation: "create_ai_note",
        additionalData: {
          contactId: contactId.slice(0, 8) + "...",
          userId: userId.slice(0, 8) + "...",
        },
      });
    } catch (error) {
      await logger.error(
        "Failed to create AI note",
        {
          operation: "contact_intelligence.create_note",
          additionalData: {
            contactId: contactId.slice(0, 8) + "...",
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        error instanceof Error ? error : undefined,
      );
      throw error;
    }
  }

  /**
   * Analyze time patterns for enhanced insights (REMOVED - unused method)
   */
  /* private static analyzeTimePatterns(events: EventDetail[]): {
    preferredTimes: string[];
    consistency: string;
  } {
    const times = events.map((e) => e.date.getHours());

    // Categorize times
    const timeCategories: { [key: string]: number } = {};
    times.forEach((hour) => {
      if (hour < 10) timeCategories["Early Morning"] = (timeCategories["Early Morning"] ?? 0) + 1;
      else if (hour < 12)
        timeCategories["Late Morning"] = (timeCategories["Late Morning"] ?? 0) + 1;
      else if (hour < 17) timeCategories["Afternoon"] = (timeCategories["Afternoon"] ?? 0) + 1;
      else timeCategories["Evening"] = (timeCategories["Evening"] ?? 0) + 1;
    });

    // Get preferred times
    const preferredTimes = Object.entries(timeCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([time]) => time);

    // Analyze consistency
    const totalDays =
      events.length > 0
        ? Math.ceil(
            (new Date(Math.max(...events.map((e) => e.date.getTime()))).getTime() -
              new Date(Math.min(...events.map((e) => e.date.getTime()))).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

    let consistency = "Irregular";
    if (events.length >= 8 && totalDays > 0) {
      const frequency = events.length / (totalDays / 7); // events per week
      if (frequency >= 2) consistency = "Very Regular (2+ times/week)";
      else if (frequency >= 1) consistency = "Regular (weekly)";
      else if (frequency >= 0.5) consistency = "Semi-Regular (bi-weekly)";
      else consistency = "Occasional";
    }

    return { preferredTimes, consistency };
  } */

  /**
   * Analyze service preferences for enhanced insights (REMOVED - unused method)
   */
  /* private static analyzeServicePreferences(events: EventDetail[]): {
    primaryServices: string[];
    preferences: string[];
  } {
    const serviceCounts: { [key: string]: number } = {};
    const locationCounts: { [key: string]: number } = {};

    events.forEach((e) => {
      const category = e.category;
      serviceCounts[category] = (serviceCounts[category] ?? 0) + 1;

      if (e.location) {
        locationCounts[e.location] = (locationCounts[e.location] ?? 0) + 1;
      }
    });

    const primaryServices = Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([service]) => service);

    const preferences = [];
    if (events.some((e) => e.type === "private" || e.title.toLowerCase().includes("private"))) {
      preferences.push("Private Sessions");
    }
    if (events.some((e) => e.type === "workshop")) {
      preferences.push("Workshops");
    }

    return { primaryServices, preferences };
  } */

  /**
   * Extract event type from title and description
   */
  private static extractEventType(title: string, description?: string | null): string {
    const text = `${title} ${description ?? ""}`.toLowerCase();

    // Event type patterns
    if (/\b(class|lesson|session)\b/.test(text)) return "class";
    if (/\b(workshop|seminar|training)\b/.test(text)) return "workshop";
    if (/\b(appointment|consultation|private|1-on-1)\b/.test(text)) return "appointment";
    if (/\b(retreat|getaway|weekend)\b/.test(text)) return "retreat";
    if (/\b(meeting|discussion|planning)\b/.test(text)) return "meeting";

    return "event"; // default
  }

  /**
   * Extract business category from title and description
   */
  private static extractBusinessCategory(title: string, description?: string | null): string {
    const text = `${title} ${description ?? ""}`.toLowerCase();

    // Business category patterns
    if (/\b(yoga|asana|vinyasa|hatha|bikram|yin|power yoga)\b/.test(text)) return "yoga";
    if (/\b(massage|therapeutic|deep tissue|swedish|aromatherapy)\b/.test(text)) return "massage";
    if (/\b(meditation|mindfulness|zen|breathing)\b/.test(text)) return "meditation";
    if (/\b(pilates|reformer|mat pilates)\b/.test(text)) return "pilates";
    if (/\b(reiki|energy healing|chakra)\b/.test(text)) return "reiki";
    if (/\b(acupuncture|needle|tcm)\b/.test(text)) return "acupuncture";
    if (/\b(nutrition|diet|health coaching)\b/.test(text)) return "nutrition";
    if (/\b(therapy|counseling|mental health)\b/.test(text)) return "therapy";
    if (/\b(fitness|training|workout|gym)\b/.test(text)) return "fitness";

    return "wellness"; // default wellness category
  }

  /**
   * Validate and filter tags
   */
  private static validateTags(tags: string[]): WellnessTag[] {
    const validTags: WellnessTag[] = [
      // Services
      "Yoga",
      "Massage",
      "Meditation",
      "Pilates",
      "Reiki",
      "Acupuncture",
      "Personal Training",
      "Nutrition Coaching",
      "Life Coaching",
      "Therapy",
      "Workshops",
      "Retreats",
      "Group Classes",
      "Private Sessions",

      // Demographics
      "Senior",
      "Young Adult",
      "Professional",
      "Parent",
      "Student",
      "Beginner",
      "Intermediate",
      "Advanced",
      "VIP",
      "Local",
      "Traveler",

      // Goals
      "Stress Relief",
      "Weight Loss",
      "Flexibility",
      "Strength Building",
      "Pain Management",
      "Mental Health",
      "Spiritual Growth",
      "Mindfulness",
      "Athletic Performance",
      "Injury Recovery",
      "Prenatal",
      "Postnatal",

      // Patterns
      "Regular Attendee",
      "Weekend Warrior",
      "Early Bird",
      "Evening Preferred",
      "Seasonal Client",
      "Frequent Visitor",
      "Occasional Visitor",
      "High Spender",
      "Referral Source",
      "Social Media Active",
    ];

    return tags
      .filter((tag) => validTags.includes(tag as WellnessTag))
      .slice(0, 8) as WellnessTag[];
  }
}
