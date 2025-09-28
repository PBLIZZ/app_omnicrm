import { handleStream } from "@/lib/api-edge-cases";
import { enrichAllClients, enrichAllClientsStreaming } from "@/server/services/contacts-ai.service";
import { z } from "zod";

/**
 * OmniClients AI Enrichment API
 *
 * POST: Enrich all clients with AI-generated insights, wellness stages, and tags
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
          try {
            for await (const progress of enrichAllClientsStreaming(userId)) {
              const progressData = JSON.stringify(progress);
              controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
            }
            controller.close();
          } catch (error) {
            // Send error and close stream
            const errorData = JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Unknown error occurred",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
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
      const result = await enrichAllClients(userId);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }
  },
);
