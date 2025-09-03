import { NextRequest } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { CalendarEmbeddingService } from "@/server/services/calendar-embedding.service";
import { err, ok } from "@/lib/api/http";
import { log } from "@/lib/log";

type Provider = "calendar" | "gmail" | "both";

interface SearchOptions {
  provider?: Provider;
  query: string;
  limit?: number;
}

// POST: Search Google data using vector similarity (calendar, gmail, or both)
export async function POST(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    return err(401, "Unauthorized");
  }

  try {
    const body = await req.json();
    const { provider = "both", query, limit = 10 }: SearchOptions = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return err(400, "Query parameter is required and must be a non-empty string");
    }

    log.info(
      {
        op: "google.search",
        userId,
        provider,
        query: query.substring(0, 100), // Log truncated query for privacy
        limit,
      },
      "google_search_started",
    );

    const results: any = {
      query,
      provider,
      total: 0,
      results: [],
    };

    // Search calendar events
    if (provider === "calendar" || provider === "both") {
      try {
        const calendarResults = await CalendarEmbeddingService.searchSimilarEvents(
          userId,
          query,
          limit,
        );
        results.calendar = {
          results: calendarResults.map((result) => ({
            type: "calendar_event",
            event: result.event,
            similarity: Math.round(result.similarity * 100) / 100,
            preview: result.textContent.substring(0, 200) + "...",
            source: "calendar",
          })),
          count: calendarResults.length,
        };
        results.total += calendarResults.length;
        results.results.push(...results.calendar.results);
      } catch (error) {
        log.warn(
          {
            op: "google.search",
            userId,
            provider: "calendar",
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "calendar_search_failed",
        );
        results.calendar = {
          error: "Calendar search failed",
          results: [],
          count: 0,
        };
      }
    }

    // Search Gmail emails (placeholder - remove mock data)
    if (provider === "gmail" || provider === "both") {
      // TODO: Implement real Gmail search through interactions table
      log.info({ op: "google.search", userId }, "gmail_search_not_implemented");
      results.gmail = {
        error: "Gmail search not yet implemented",
        message: "Will be available once Gmail data is processed through the ingestion pipeline",
        results: [],
        count: 0,
      };
    }

    // Sort all results by similarity (descending) and limit
    results.results = results.results
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit);

    results.total = results.results.length;

    log.info(
      {
        op: "google.search",
        userId,
        provider,
        totalResults: results.total,
        calendarResults: results.calendar?.count || 0,
        gmailResults: results.gmail?.count || 0,
      },
      "google_search_completed",
    );

    return ok(results);
  } catch (error: unknown) {
    log.error(
      {
        op: "google.search",
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "google_search_failed",
    );

    return err(500, "Search failed");
  }
}
