import { createRouteHandler } from "@/server/api/handler";
import { CalendarEmbeddingService } from "@/server/services/calendar-embedding.service";
import { ApiResponseBuilder } from "@/server/api/response";
import { logger } from "@/lib/observability";
import { z } from "zod";

type Provider = "calendar" | "gmail" | "both";

const searchBodySchema = z.object({
  provider: z.enum(["calendar", "gmail", "both"]).default("both"),
  query: z.string().min(1, "Query parameter is required and must be a non-empty string"),
  limit: z.number().int().positive().max(100).default(10),
});

interface SearchResultItem {
  type: string;
  event: unknown;
  similarity: number;
  preview: string;
  source: string;
}

interface ProviderResults {
  results: SearchResultItem[];
  count: number;
  error?: string;
  message?: string;
}

interface SearchResults {
  query: string;
  provider: Provider;
  total: number;
  results: SearchResultItem[];
  calendar?: ProviderResults;
  gmail?: ProviderResults;
}

// POST: Search Google data using vector similarity (calendar, gmail, or both)
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_search" },
  validation: {
    body: searchBodySchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("google.search", requestId);

  try {
    const { provider, query, limit } = validated.body;

    await logger.info("google_search_started", {
      operation: "google.search",
      additionalData: {
        userId,
        provider,
        query: query.substring(0, 100), // Log truncated query for privacy
        limit,
      },
    });

    const results: SearchResults = {
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
            event: result.event as unknown,
            similarity: Math.round(result.similarity * 100) / 100,
            preview: result.textContent.substring(0, 200) + "...",
            source: "calendar",
          })),
          count: calendarResults.length,
        };
        results.total += calendarResults.length;
        results.results.push(...results.calendar.results);
      } catch (error) {
        await logger.warn("calendar_search_failed", {
          operation: "google.search",
          additionalData: {
            userId,
            provider: "calendar",
            error: error instanceof Error ? error.message : String(error),
          },
        });
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
      await logger.info("gmail_search_not_implemented", {
        operation: "google.search",
        additionalData: { userId },
      });
      results.gmail = {
        error: "Gmail search not yet implemented",
        message: "Will be available once Gmail data is processed through the ingestion pipeline",
        results: [],
        count: 0,
      };
    }

    // Sort all results by similarity (descending) and limit
    results.results = results.results
      .sort((a: SearchResultItem, b: SearchResultItem) => b.similarity - a.similarity)
      .slice(0, limit);

    results.total = results.results.length;

    await logger.info("google_search_completed", {
      operation: "google.search",
      additionalData: {
        userId,
        provider,
        totalResults: results.total,
        calendarResults: results.calendar?.count ?? 0,
        gmailResults: results.gmail?.count ?? 0,
      },
    });

    return api.success(results);
  } catch (error: unknown) {
    await logger.error(
      "google_search_failed",
      {
        operation: "google.search",
        additionalData: {
          userId,
        },
      },
      error instanceof Error ? error : new Error("Unknown error"),
    );

    return api.error(
      "Search failed",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});
