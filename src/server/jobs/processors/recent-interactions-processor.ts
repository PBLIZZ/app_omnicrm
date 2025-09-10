import { getDb } from "@/server/db/client";
import { contactTimeline } from "@/server/db/schema";
import { InsightWriter } from "./insight";
import { InteractionsRepository } from "../../repositories/interactions.repo";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/observability";

// Database row types for query results with index signatures
interface UserIdRow extends Record<string, unknown> {
  user_id: string;
}

interface ContactIdRow extends Record<string, unknown> {
  contact_id: string;
}

interface CountRow extends Record<string, unknown> {
  count: string;
}

interface ErrorStatsRow extends Record<string, unknown> {
  failed: string;
  total: string;
}

// Interface for interaction data from repository
interface InteractionRow {
  id: string;
  user_id: string;
  contact_id: string | null;
  type: string;
  subject: string | null;
  body_text: string | null;
  occurred_at: Date | string;
  source: string | null;
  source_id: string | null;
  source_meta: unknown;
}

// Type guards for database query results
function isUserIdRow(row: Record<string, unknown>): row is UserIdRow {
  return typeof row["user_id"] === "string";
}

function isContactIdRow(row: Record<string, unknown>): row is ContactIdRow {
  return typeof row["contact_id"] === "string";
}

function isCountRow(row: Record<string, unknown>): row is CountRow {
  return typeof row["count"] === "string";
}

function isErrorStatsRow(row: Record<string, unknown>): row is ErrorStatsRow {
  return typeof row["failed"] === "string" && typeof row["total"] === "string";
}

export class RecentInteractionsProcessor {
  private insightWriter: InsightWriter;
  private interactionsRepo: InteractionsRepository;

  constructor() {
    this.insightWriter = new InsightWriter();
    this.interactionsRepo = new InteractionsRepository();
  }

  /**
   * Process recent interactions for timeline and insights
   * Designed to run every 15-30 minutes
   */
  async processRecentInteractions(): Promise<{
    processed: number;
    timelineEvents: number;
    insights: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;
    let timelineEvents = 0;
    let insights = 0;

    try {
      // Get all users with recent activity
      const activeUsers = await this.getActiveUsers();

      for (const userId of activeUsers) {
        try {
          const result = await this.processUserRecentInteractions(userId);
          processed += result.processed;
          timelineEvents += result.timelineEvents;
          insights += result.insights;
          errors.push(...result.errors);
        } catch (error) {
          const errorMsg = `Failed to process user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`;
          errors.push(errorMsg);
          await logger.error(
            "Failed to process user interactions",
            {
              operation: "jobs.recent_interactions.process_user",
              additionalData: { userId: userId.slice(0, 8) + "..." },
            },
            error instanceof Error ? error : undefined,
          );
        }
      }

      return {
        processed,
        timelineEvents,
        insights,
        errors,
      };
    } catch (error) {
      const errorMsg = `Failed to process recent interactions: ${error instanceof Error ? error.message : "Unknown error"}`;
      errors.push(errorMsg);
      return {
        processed: 0,
        timelineEvents: 0,
        insights: 0,
        errors,
      };
    }
  }

  /**
   * Process recent interactions for a specific user
   */
  async processUserRecentInteractions(userId: string): Promise<{
    processed: number;
    timelineEvents: number;
    insights: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;
    let timelineEvents = 0;
    let insights = 0;

    // Get recent interactions (last 2 hours)
    const recentInteractions = await this.interactionsRepo.getRecentForTimeline(userId, {
      limit: 100,
      hoursBack: 2,
      hasContact: true, // Only process linked interactions for timeline
    });

    // Process timeline events
    for (const interaction of recentInteractions) {
      try {
        await this.createTimelineFromInteraction(interaction);
        timelineEvents++;
        processed++;
      } catch (error) {
        const errorMsg = `Failed to create timeline for interaction ${interaction.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMsg);
      }
    }

    // Generate insights for contacts with recent activity
    const activeContacts = await this.getActiveContactsForUser(userId);

    for (const contactId of activeContacts) {
      try {
        // Generate thread summary if contact has multiple recent interactions
        const contactInteractions = recentInteractions.filter((i) => i.contact_id === contactId);

        if (contactInteractions.length >= 2) {
          const insightId = await this.insightWriter.generateThreadSummary(
            userId,
            contactId,
            contactInteractions.map((i) => i.id),
          );

          if (insightId) {
            insights++;
          }
        }

        // Generate next best action for high-activity contacts
        if (contactInteractions.length >= 3) {
          const nbaId = await this.insightWriter.generateNextBestAction(userId, contactId, {
            recentInteractionCount: contactInteractions.length,
            lastInteraction: contactInteractions[0]?.occurred_at,
          });

          if (nbaId) {
            insights++;
          }
        }
      } catch (error) {
        const errorMsg = `Failed to generate insights for contact ${contactId}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMsg);
      }
    }

    return {
      processed,
      timelineEvents,
      insights,
      errors,
    };
  }

  /**
   * Create timeline event from interaction using the new utility approach
   */
  private async createTimelineFromInteraction(interaction: InteractionRow): Promise<void> {
    if (!interaction.contact_id) {
      return;
    }

    const timelineEvent = this.mapInteractionToTimeline(interaction);
    if (timelineEvent) {
      await this.insertTimelineEvent(timelineEvent);
    }
  }

  /**
   * Map interaction to timeline event
   */
  private mapInteractionToTimeline(interaction: InteractionRow): {
    userId: string;
    contactId: string;
    eventType: string;
    title: string;
    description?: string | null;
    eventData?: Record<string, unknown> | null;
    occurredAt: string;
  } | null {
    const eventTypeMapping = this.getEventTypeMapping();
    const timelineEventType = eventTypeMapping[interaction.type];

    if (!timelineEventType) {
      return null;
    }

    if (!interaction.contact_id) {
      return null;
    }

    return {
      userId: interaction.user_id,
      contactId: interaction.contact_id,
      eventType: timelineEventType,
      title: this.generateTitle(interaction),
      description: this.generateDescription(interaction),
      eventData: this.extractEventData(interaction),
      occurredAt:
        interaction.occurred_at instanceof Date
          ? interaction.occurred_at.toISOString()
          : String(interaction.occurred_at),
    };
  }

  /**
   * Get event type mapping
   */
  private getEventTypeMapping(): Record<string, string> {
    return {
      email_received: "email_received",
      email_sent: "email_sent",
      sms_received: "sms_received",
      sms_sent: "sms_sent",
      dm_received: "dm_received",
      dm_sent: "dm_sent",
      meeting_created: "meeting_scheduled",
      meeting_attended: "meeting_attended",
      call_logged: "call_completed",
      note_added: "note_created",
      form_submission: "form_submitted",
      web_chat: "chat_message",
    };
  }

  /**
   * Generate title for timeline event
   */
  private generateTitle(interaction: InteractionRow): string {
    const titleMappings: Record<string, string> = {
      email_received: `Email received: ${interaction.subject ?? "No subject"}`,
      email_sent: `Email sent: ${interaction.subject ?? "No subject"}`,
      sms_received: "SMS message received",
      sms_sent: "SMS message sent",
      dm_received: "Direct message received",
      dm_sent: "Direct message sent",
      meeting_created: `Meeting scheduled: ${interaction.subject ?? "Untitled meeting"}`,
      meeting_attended: `Attended: ${interaction.subject ?? "Meeting"}`,
      call_logged: `Call: ${interaction.subject ?? "Phone call"}`,
      note_added: `Note: ${interaction.subject ?? "Added note"}`,
      form_submission: "Form submission received",
      web_chat: "Web chat conversation",
    };

    return titleMappings[interaction.type] ?? `Activity: ${interaction.type}`;
  }

  /**
   * Generate description for timeline event
   */
  private generateDescription(interaction: InteractionRow): string | null {
    const descriptions: Record<string, string> = {
      email_received: "Email received via Gmail sync",
      email_sent: "Email sent via Gmail sync",
      sms_received: "SMS message received via provider sync",
      sms_sent: "SMS message sent via provider sync",
      dm_received: "Direct message received from social platform",
      dm_sent: "Direct message sent via social platform",
      meeting_created: "Meeting scheduled via Google Calendar",
      meeting_attended: "Meeting attendance confirmed",
      call_logged: "Phone call logged manually",
      note_added: "Note added manually",
      form_submission: "Contact form submitted on website",
      web_chat: "Web chat conversation initiated",
    };

    return descriptions[interaction.type] ?? null;
  }

  /**
   * Extract event data from interaction
   */
  private extractEventData(interaction: InteractionRow): Record<string, unknown> {
    const baseEventData = {
      source: interaction.source,
      source_id: interaction.source_id,
      interaction_id: interaction.id,
    };

    // Safe property access helper
    const getMetaProperty = (key: string): unknown => {
      if (
        interaction.source_meta &&
        typeof interaction.source_meta === "object" &&
        interaction.source_meta !== null
      ) {
        return (interaction.source_meta as Record<string, unknown>)[key];
      }
      return undefined;
    };

    switch (interaction.type) {
      case "email_received":
      case "email_sent":
        return {
          ...baseEventData,
          subject: interaction.subject,
          thread_id: getMetaProperty("threadId"),
          message_id: getMetaProperty("messageId"),
          direction: interaction.type === "email_sent" ? "outbound" : "inbound",
          channel: "email",
        };

      case "meeting_created":
        return {
          ...baseEventData,
          title: interaction.subject,
          location: getMetaProperty("location"),
          start_time: getMetaProperty("startTime"),
          end_time: getMetaProperty("endTime"),
          duration_minutes: getMetaProperty("duration"),
          meet_url: getMetaProperty("meetUrl"),
          is_all_day: getMetaProperty("isAllDay"),
          channel: "calendar",
        };

      case "call_received":
      case "call_made":
        const from = getMetaProperty("from");
        const to = getMetaProperty("to");
        return {
          ...baseEventData,
          direction: interaction.type === "call_made" ? "outbound" : "inbound",
          participants: from && to ? [from, to] : [],
          channel: "phone",
          duration_minutes: getMetaProperty("durationMinutes"),
          phone_number: getMetaProperty("phoneNumber"),
          call_type: getMetaProperty("callType"),
        };

      default:
        return baseEventData;
    }
  }

  /**
   * Insert timeline event into database
   */
  private async insertTimelineEvent(event: {
    userId: string;
    contactId: string;
    eventType: string;
    title: string;
    description?: string | null;
    eventData?: Record<string, unknown> | null;
    occurredAt: string;
  }): Promise<void> {
    const db = await getDb();

    await db.insert(contactTimeline).values({
      userId: event.userId,
      contactId: event.contactId,
      eventType: event.eventType,
      title: event.title,
      description: event.description,
      eventData: event.eventData ?? {},
      occurredAt: new Date(event.occurredAt),
    });
  }

  /**
   * Get users who have had activity in the last 2 hours
   */
  private async getActiveUsers(): Promise<string[]> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT DISTINCT user_id
      FROM interactions
      WHERE created_at > now() - interval '2 hours'
      ORDER BY user_id
    `);

    return result.filter(isUserIdRow).map((row) => row.user_id);
  }

  /**
   * Get contacts with recent activity for a user
   */
  private async getActiveContactsForUser(userId: string): Promise<string[]> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT DISTINCT contact_id
      FROM interactions
      WHERE user_id = ${userId}
        AND contact_id IS NOT NULL
        AND created_at > now() - interval '24 hours'
      ORDER BY contact_id
    `);

    return result.filter(isContactIdRow).map((row) => row.contact_id);
  }

  /**
   * Run health check on the processor
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: Record<string, boolean>;
    metrics: Record<string, number>;
  }> {
    const checks: Record<string, boolean> = {};
    const metrics: Record<string, number> = {};

    try {
      // Check database connectivity
      const db = await getDb();
      await db.execute(sql`SELECT 1`);
      checks["database"] = true;

      // Check recent processing activity
      const recentJobs = await db.execute(sql`
        SELECT count(*) as count
        FROM jobs
        WHERE kind IN ('create_timeline', 'generate_insights')
          AND created_at > now() - interval '1 hour'
      `);

      const firstJob = recentJobs[0];
      metrics["recentJobs"] = parseInt(firstJob && isCountRow(firstJob) ? firstJob.count : "0", 10);
      checks["recentActivity"] = metrics["recentJobs"] > 0;

      // Check error rates
      const errorRate = await db.execute(sql`
        SELECT 
          count(*) FILTER (WHERE status = 'failed') as failed,
          count(*) as total
        FROM jobs
        WHERE kind IN ('create_timeline', 'generate_insights')
          AND created_at > now() - interval '24 hours'
      `);

      const firstErrorRow = errorRate[0];
      if (firstErrorRow && isErrorStatsRow(firstErrorRow)) {
        const failedJobs = parseInt(firstErrorRow.failed || "0", 10);
        const totalJobs = parseInt(firstErrorRow.total || "0", 10);

        metrics["errorRate"] = totalJobs > 0 ? failedJobs / totalJobs : 0;
        checks["lowErrorRate"] = metrics["errorRate"] < 0.1; // Less than 10% error rate
      } else {
        metrics["errorRate"] = 0;
        checks["lowErrorRate"] = true;
      }

      // Determine overall status
      const allChecks = Object.values(checks);
      const healthyChecks = allChecks.filter(Boolean).length;
      const totalChecks = allChecks.length;

      let status: "healthy" | "degraded" | "unhealthy";
      if (healthyChecks === totalChecks) {
        status = "healthy";
      } else if (healthyChecks >= totalChecks * 0.7) {
        status = "degraded";
      } else {
        status = "unhealthy";
      }

      return { status, checks, metrics };
    } catch (error) {
      await logger.error(
        "Health check failed",
        {
          operation: "jobs.recent_interactions.health_check",
          additionalData: {},
        },
        error instanceof Error ? error : undefined,
      );
      return {
        status: "unhealthy",
        checks: { database: false },
        metrics: {},
      };
    }
  }
}
