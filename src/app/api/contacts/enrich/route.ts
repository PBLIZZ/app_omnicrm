import { handleStream } from "@/lib/api-edge-cases";
import {
  enrichAllContacts,
  enrichAllContactsStreaming,
} from "@/server/services/contacts-ai.service";
import { z } from "zod";

/**
 * Contacts AI Enrichment API
 *
 * POST: Enrich all contacts with AI-generated insights, wellness stages, and tags
 * Supports both standard and streaming responses
 */

const EnrichmentQuerySchema = z.object({
  stream: z.coerce.boolean().optional().default(false),
});

export const POST = handleStream(
  EnrichmentQuerySchema,
  async (query, userId): Promise<ReadableStream | Response> => {
    if (query.stream) {
      // Return streaming response for real-time progress
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller): Promise<void> {
          let iterator: AsyncIterator<object> | null = null;
          try {
            iterator = enrichAllContactsStreaming(userId);
            for await (const progress of iterator) {
              const progressData = JSON.stringify(progress);
              controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
            }
            controller.close();
          } catch (error) {
            // Check if this is a cancellation/closed controller error
            const isCancellation =
              error instanceof TypeError &&
              (error.message.includes("already closed") || error.message.includes("controller"));
            const isAbortError =
              error instanceof Error &&
              (error.name === "AbortError" || error.message.includes("cancelled"));

            if (isCancellation || isAbortError) {
              // Contact disconnected or stream was cancelled, just return
              return;
            }

            // Only enqueue error if controller is still open
            try {
              const errorData = JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error occurred",
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              controller.close();
            } catch {
              // Controller already closed, ignore
            }
          } finally {
            // Clean up iterator to stop upstream
            if (iterator && typeof iterator.return === "function") {
              try {
                await iterator.return();
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Return standard response for non-streaming
      const result = await enrichAllContacts(userId);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }
  },
);
