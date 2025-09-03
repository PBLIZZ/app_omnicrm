import { NextRequest } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { CalendarEmbeddingService } from "@/server/services/calendar-embedding.service";
import { err, ok } from "@/lib/api/http";
import { log } from "@/lib/log";

interface EmbedOptions {
  provider?: "calendar" | "gmail" | "both";
  regenerate?: boolean;
  limit?: number;
}

// POST: Generate embeddings for Google data (calendar, gmail, or both)
export async function POST(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    return err(401, "Unauthorized");
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { provider = "both", regenerate = false, limit = 100 }: EmbedOptions = body;

    log.info(
      {
        op: "google.embed",
        userId,
        provider,
        regenerate,
        limit,
      },
      "google_embedding_started",
    );

    let totalProcessedEvents = 0;
    let errors: string[] = [];

    // Process calendar embeddings
    if (provider === "calendar" || provider === "both") {
      try {
        const calendarResult = await CalendarEmbeddingService.embedAllEvents(userId);
        if (calendarResult.success) {
          totalProcessedEvents += calendarResult.processedEvents || 0;
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
      log.info({ op: "google.embed", userId }, "gmail_embedding_not_implemented");
      errors.push("Gmail embedding not yet implemented");
    }

    const hasErrors = errors.length > 0;
    const status =
      hasErrors && totalProcessedEvents === 0 ? "failed" : hasErrors ? "partial" : "completed";

    log.info(
      {
        op: "google.embed",
        userId,
        provider,
        totalProcessedEvents,
        status,
        errorCount: errors.length,
      },
      "google_embedding_completed",
    );

    if (status === "failed") {
      return err(500, `Embedding failed: ${errors.join(", ")}`);
    }

    return ok({
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
    log.error(
      {
        op: "google.embed",
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "google_embedding_failed",
    );

    return err(500, "Failed to generate embeddings");
  }
}
