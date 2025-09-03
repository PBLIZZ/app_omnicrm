import { TimelineWriter } from "./timeline-writer";
import { InsightWriter } from "./insight";
import { InteractionsRepository } from "../../repositories/interactions.repo";
import { getDb } from "../../db/client";
import { sql } from "drizzle-orm";

export class RecentInteractionsProcessor {
  private timelineWriter: TimelineWriter;
  private insightWriter: InsightWriter;
  private interactionsRepo: InteractionsRepository;

  constructor() {
    this.timelineWriter = new TimelineWriter();
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
          console.error(errorMsg);
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
        await this.timelineWriter.createFromInteraction(interaction);
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

    return result.map((row) => (row as any).user_id);
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

    return result.map((row) => (row as any).contact_id);
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

      metrics["recentJobs"] = parseInt((recentJobs[0] as any)?.count || "0", 10);
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

      const errorStats = errorRate[0] as any;
      const failedJobs = parseInt(errorStats?.failed || "0", 10);
      const totalJobs = parseInt(errorStats?.total || "0", 10);

      metrics["errorRate"] = totalJobs > 0 ? failedJobs / totalJobs : 0;
      checks["lowErrorRate"] = metrics["errorRate"] < 0.1; // Less than 10% error rate

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
      console.error("Health check failed:", error);
      return {
        status: "unhealthy",
        checks: { database: false },
        metrics: {},
      };
    }
  }
}
