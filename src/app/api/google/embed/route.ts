import { createRouteHandler } from "@/server/api/handler";
import { CalendarEmbeddingService } from "@/server/services/calendar-embedding.service";
import { ApiResponseBuilder } from "@/server/api/response";
import { logger } from "@/lib/observability";
import { z } from "zod";

const embedOptionsSchema = z.object({
  provider: z.enum(["calendar", "gmail", "both"]).optional().default("both"),
  regenerate: z.boolean().optional().default(false),
  limit: z.number().min(1).max(1000).optional().default(100),
});

// POST: Generate embeddings for Google data (calendar, gmail, or both)
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_embed" },
  validation: { body: embedOptionsSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("google.embed", requestId);

  try {
    const { provider, regenerate, limit } = validated.body;

    await logger.info("google_embedding_started", {
      operation: "google.embed",
      additionalData: {
        userId,
        provider,
        regenerate,
        limit,
      },
    });

    let totalProcessedEvents = 0;
    const errors: string[] = [];

    // Process calendar embeddings
    if (provider === "calendar" || provider === "both") {
      try {
        const calendarResult = await CalendarEmbeddingService.embedAllEvents(userId);
        if (calendarResult.success) {
          totalProcessedEvents += calendarResult.processedEvents ?? 0;
        } else {
          errors.push(`Calendar embedding failed: ${calendarResult.error}`);
        }
      } catch (error) {
        errors.push(
          `Calendar embedding error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Process gmail embeddings (placeholder for future implementation)
    if (provider === "gmail" || provider === "both") {
      // TODO: Implement Gmail embedding service
      await logger.info("gmail_embedding_not_implemented", {
        operation: "google.embed",
        additionalData: { userId },
      });
      errors.push("Gmail embedding not yet implemented");
    }

    const hasErrors = errors.length > 0;
    const status =
      hasErrors && totalProcessedEvents === 0 ? "failed" : hasErrors ? "partial" : "completed";

    await logger.info("google_embedding_completed", {
      operation: "google.embed",
      additionalData: {
        userId,
        provider,
        totalProcessedEvents,
        status,
        errorCount: errors.length,
      },
    });

    if (status === "failed") {
      return api.error(`Embedding failed: ${errors.join(", ")}`, "INTERNAL_ERROR");
    }

    return api.success({
      success: true,
      provider,
      processedEvents: totalProcessedEvents,
      status,
      errors: hasErrors ? errors : undefined,
      message: `Successfully processed ${totalProcessedEvents} events for embeddings`,
      nextSteps: [
        "Embeddings are now available for semantic search",
        "AI insights will be updated with new data",
        "Contact information has been enhanced",
      ],
    });
  } catch (error: unknown) {
    await logger.error(
      "google_embedding_failed",
      {
        operation: "google.embed",
        additionalData: {
          userId,
        },
      },
      error instanceof Error ? error : new Error("Unknown error"),
    );

    return api.error(
      "Failed to generate embeddings",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});
