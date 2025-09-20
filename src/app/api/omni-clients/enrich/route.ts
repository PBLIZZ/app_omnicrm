import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { ClientEnrichmentService } from "@/server/services/client-enrichment.service";

/**
 * OmniClients AI Enrichment API
 *
 * POST: Enrich all clients with AI-generated insights, wellness stages, and tags
 * Supports both standard and streaming responses
 */

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_enrich" },
})(async ({ userId, requestId }, request) => {
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const isStreaming = url.searchParams.get("stream") === "true";

    if (isStreaming) {
      // Return streaming response for real-time progress
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const progress of ClientEnrichmentService.enrichAllClientsStreaming(userId)) {
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

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Return standard response for non-streaming
      const result = await ClientEnrichmentService.enrichAllClients(userId);
      return NextResponse.json(result);
    }
  } catch (error) {
    return NextResponse.json({
      error: "Failed to enrich omni clients"
    }, { status: 500 });
  }
});
