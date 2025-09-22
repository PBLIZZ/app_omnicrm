import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { ClientEnrichmentService } from "@/server/services/client-enrichment.service";

/**
 * OmniClients AI Enrichment API
 *
 * POST: Enrich all clients with AI-generated insights, wellness stages, and tags
 * Supports both standard and streaming responses
 */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const url = new URL(request.url);
    const isStreaming = url.searchParams.get("stream") === "true";

    if (isStreaming) {
      // Return streaming response for real-time progress
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const progress of ClientEnrichmentService.enrichAllClientsStreaming(
              userId,
            )) {
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
    console.error("POST /api/omni-clients/enrich error:", error);
    return NextResponse.json({ error: "Failed to enrich omni clients" }, { status: 500 });
  }
}
