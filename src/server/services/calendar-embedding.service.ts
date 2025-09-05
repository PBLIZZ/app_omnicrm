import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import OpenAI from "openai";

// Type definitions for calendar event data
interface CalendarEventData {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime?: Date | string;
  endTime?: Date | string;
  eventType?: string | null;
  businessCategory?: string | null;
  attendees?: unknown[];
  keywords?: string[];
}

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
}

interface AttendeeData {
  displayName?: string;
  email?: string;
}

interface SearchResultRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  event_type: string | null;
  business_category: string | null;
  attendees: unknown;
  keywords: unknown;
  meta: { textContent?: string };
  distance: number;
}

interface AnalyticsEventRow {
  event_type: string | null;
  start_time: string;
  attendees: unknown;
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

export class CalendarEmbeddingService {
  /**
   * Generate embeddings for all calendar events that don't have them yet
   */
  static async embedAllEvents(userId: string): Promise<{
    success: boolean;
    processedEvents: number;
    error?: string;
  }> {
    try {
      // console.log("🔄 Starting calendar event embedding process...");

      const db = await getDb();

      // Get calendar events that don't have embeddings yet using raw SQL
      const eventsToEmbed = await db.execute(sql`
        SELECT ce.id, ce.title, ce.description, ce.location
        FROM calendar_events ce
        LEFT JOIN embeddings e ON (
          e.owner_type = 'calendar_event' 
          AND e.owner_id = ce.id
        )
        WHERE ce.user_id = ${userId}
        AND e.id IS NULL
      `);

      // Type-safe access to database results
      const eventRows = eventsToEmbed as EventRow[];
      // console.log(`📊 Found ${eventRows.length} events to embed`);

      let processedCount = 0;

      for (const eventRow of eventRows) {
        // Since we're using raw SQL, eventRow contains the columns directly
        const event = {
          id: eventRow.id as string,
          title: eventRow.title as string,
          description: eventRow.description as string | null,
          location: eventRow.location as string | null,
        };

        try {
          await this.embedSingleEvent(event, userId);
          processedCount++;

          if (processedCount % 10 === 0) {
            // console.log(`🔄 Processed ${processedCount}/${eventsToEmbed.rows.length} events`);
          }
        } catch (error) {
          console.error(`❌ Error embedding event ${event.id}:`, error);
          // Continue with other events
        }
      }

      // console.log(`✅ Completed embedding ${processedCount} calendar events`);

      return {
        success: true,
        processedEvents: processedCount,
      };
    } catch (error) {
      console.error("❌ Calendar embedding error:", error);
      return {
        success: false,
        processedEvents: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate embedding for a single calendar event
   */
  private static async embedSingleEvent(event: CalendarEventData, userId?: string): Promise<void> {
    // Extract meaningful text from the event
    const textContent = this.extractEventText(event);

    if (!textContent.trim()) {
      // console.log(`⚠️ Skipping event ${event.id} - no meaningful text content`);
      return;
    }

    // Generate embedding using OpenAI
    const embedding = await this.generateEmbedding(textContent);

    // Store embedding in database using raw SQL
    const db = await getDb();
    await db.execute(sql`
      INSERT INTO embeddings (user_id, owner_type, owner_id, embedding, meta, created_at)
      VALUES (
        ${userId}, 
        'calendar_event', 
        ${event.id}, 
        ${embedding}, 
        ${JSON.stringify({
          textContent,
          eventTitle: event.title,
          hasDescription: !!event.description,
          hasLocation: !!event.location,
        })},
        ${new Date()}
      )
    `);

    // console.log(`✅ Generated embedding for event: "${event.title.substring(0, 50)}..."`);
  }

  /**
   * Extract searchable text content from a calendar event
   */
  private static extractEventText(event: CalendarEventData): string {
    const parts = [];

    // Event title (most important)
    if (event.title) {
      parts.push(`Title: ${event.title}`);
    }

    // Event description
    if (event.description) {
      parts.push(`Description: ${event.description}`);
    }

    // Location information
    if (event.location) {
      parts.push(`Location: ${event.location}`);
    }

    // Business context
    if (event.eventType) {
      parts.push(`Type: ${event.eventType}`);
    }

    if (event.businessCategory) {
      parts.push(`Category: ${event.businessCategory}`);
    }

    // Attendee information (names only for privacy)
    if (event.attendees && Array.isArray(event.attendees) && event.attendees.length > 0) {
      const attendeeNames = event.attendees
        .map((a: unknown) => {
          const attendee = a as AttendeeData;
          return attendee.displayName ?? attendee.email?.split("@")[0];
        })
        .filter(Boolean)
        .join(", ");

      if (attendeeNames) {
        parts.push(`Attendees: ${attendeeNames}`);
      }
    }

    // Keywords (if available)
    if (event.keywords && Array.isArray(event.keywords) && event.keywords.length > 0) {
      parts.push(`Keywords: ${event.keywords.join(", ")}`);
    }

    // Time context
    if (event.startTime) {
      const date = new Date(event.startTime);
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
      const timeOfDay = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      parts.push(`Time: ${dayOfWeek} at ${timeOfDay}`);
    }

    return parts.join("\n");
  }

  /**
   * Generate embedding using OpenAI
   */
  private static async generateEmbedding(text: string): Promise<string> {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    // Ensure we get a proper number array and convert to pgvector format
    const embeddingArray = response.data?.[0]?.embedding;
    if (!embeddingArray) {
      throw new Error("Failed to generate embedding - no data returned");
    }

    // Convert to pgvector format: [1.0, 2.0, 3.0]
    const vectorString = JSON.stringify(embeddingArray);

    // Generated embedding array successfully

    return vectorString;
  }

  /**
   * Search for similar calendar events using vector similarity
   */
  static async searchSimilarEvents(
    userId: string,
    query: string,
    limit: number = 10,
  ): Promise<
    Array<{
      event: CalendarEventData;
      similarity: number;
      textContent: string;
    }>
  > {
    try {
      // Generate embedding for the search query
      const queryVector = await this.generateEmbedding(query);

      // Search for similar events using vector similarity
      const db = await getDb();
      const results = await db.execute(sql`
        SELECT
          ce.*,
          e.meta,
          (e.embedding <=> ${queryVector}::vector) as distance
        FROM calendar_events ce
        JOIN embeddings e ON e.owner_id = ce.id AND e.owner_type = 'calendar_event'
        WHERE ce.user_id = ${userId}
        ORDER BY e.embedding <=> ${queryVector}::vector
        LIMIT ${limit}
      `);

      // Type-safe access to database results
      const resultRows = results as SearchResultRow[];
      return resultRows.map((row: SearchResultRow) => ({
        event: {
          id: row.id,
          title: row.title,
          description: row.description,
          location: row.location,
          startTime: row.start_time,
          endTime: row.end_time,
          eventType: row.event_type,
          businessCategory: row.business_category,
          attendees: row.attendees,
          keywords: row.keywords,
        },
        similarity: 1 - row.distance, // Convert distance to similarity
        textContent: row.meta?.textContent ?? "",
      }));
    } catch (error) {
      console.error("❌ Vector search error:", error);
      return [];
    }
  }

  /**
   * Get calendar insights using AI analysis of embedded events
   */
  static async getCalendarInsights(
    userId: string,
    timeframe: "week" | "month" | "quarter" = "month",
  ): Promise<{
    patterns: string[];
    busyTimes: string[];
    recommendations: string[];
    clientEngagement: string[];
  }> {
    try {
      // Get recent events with embeddings for pattern analysis
      const cutoffDate = new Date();
      cutoffDate.setDate(
        cutoffDate.getDate() - (timeframe === "week" ? 7 : timeframe === "month" ? 30 : 90),
      );

      const db = await getDb();
      const eventsWithEmbeddings = await db.execute(sql`
        SELECT ce.*, e.meta
        FROM calendar_events ce
        JOIN embeddings e ON e.owner_id = ce.id AND e.owner_type = 'calendar_event'
        WHERE ce.user_id = ${userId}
          AND ce.start_time >= ${cutoffDate.toISOString()}
        ORDER BY ce.start_time DESC
        LIMIT 100
      `);

      // Type-safe access to database results
      const eventRows = eventsWithEmbeddings as AnalyticsEventRow[];
      // Analyze patterns using event data
      const insights = this.analyzeEventPatterns(eventRows);

      return insights;
    } catch (error) {
      console.error("❌ Calendar insights error:", error);
      return {
        patterns: ["Unable to analyze patterns at this time"],
        busyTimes: [],
        recommendations: [],
        clientEngagement: [],
      };
    }
  }

  /**
   * Analyze patterns in calendar events
   */
  private static analyzeEventPatterns(events: AnalyticsEventRow[]): {
    patterns: string[];
    busyTimes: string[];
    recommendations: string[];
    clientEngagement: string[];
  } {
    const patterns = [];
    const busyTimes = [];
    const recommendations = [];
    const clientEngagement = [];

    // Analyze event types
    const eventTypeCounts: Record<string, number> = {};
    const dayOfWeekCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};

    events.forEach((event) => {
      // Count event types
      if (event.event_type) {
        eventTypeCounts[event.event_type] = (eventTypeCounts[event.event_type] ?? 0) + 1;
      }

      // Count days of week
      if (event.start_time) {
        const date = new Date(event.start_time);
        const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
        dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] ?? 0) + 1;

        // Count hours
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
      }
    });

    // Generate insights
    const topEventType = Object.entries(eventTypeCounts).sort(([, a], [, b]) => b - a)[0];

    if (topEventType) {
      patterns.push(`Most common activity: ${topEventType[0]} (${topEventType[1]} events)`);
    }

    const topDay = Object.entries(dayOfWeekCounts).sort(([, a], [, b]) => b - a)[0];

    if (topDay) {
      busyTimes.push(`Busiest day: ${topDay[0]} (${topDay[1]} events)`);
    }

    const topHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];

    if (topHour) {
      const hour = parseInt(topHour[0]);
      const timeLabel =
        hour < 12 ? `${hour === 0 ? 12 : hour}AM` : `${hour === 12 ? 12 : hour - 12}PM`;
      busyTimes.push(`Peak hour: ${timeLabel} (${topHour[1]} events)`);
    }

    // Generate recommendations
    if (Object.keys(eventTypeCounts).length > 1) {
      recommendations.push("Consider blocking similar time slots to create routine patterns");
    }

    if (events.some((e) => e.attendees && e.attendees.length > 0)) {
      clientEngagement.push("Regular client interactions detected - good engagement patterns");
    }

    return { patterns, busyTimes, recommendations, clientEngagement };
  }
}
