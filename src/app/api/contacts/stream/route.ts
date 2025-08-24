/**
 * Server-Sent Events (SSE) endpoint for real-time contact updates
 * GET /api/contacts/stream
 */

import { NextRequest } from "next/server";
import { getServerUserId } from "@/server/auth/user";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Authenticate user
    const userId = await getServerUserId();

    // Create SSE response
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const encoder = new TextEncoder();
        const initialMessage = {
          type: "connection",
          timestamp: new Date().toISOString(),
          message: "Connected to contact stream",
          userId,
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`));

        // Keep connection alive with heartbeat
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = {
              type: "heartbeat",
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));
          } catch (error) {
            console.error("Heartbeat error:", error);
            clearInterval(heartbeatInterval);
          }
        }, 30000); // Send heartbeat every 30 seconds

        // Store cleanup function
        const cleanup = (): void => {
          clearInterval(heartbeatInterval);
        };

        // Handle client disconnect
        request.signal?.addEventListener("abort", cleanup);

        // Handle controller close
        const originalClose = controller.close.bind(controller);
        controller.close = () => {
          cleanup();
          originalClose();
        };
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    console.error("SSE stream error:", error);

    // Type guard for error with status property
    const hasStatus = (err: unknown): err is { status: number } => {
      return (
        typeof err === "object" &&
        err !== null &&
        "status" in err &&
        typeof (err as { status: unknown }).status === "number"
      );
    };

    const status = hasStatus(error) ? error.status : 500;
    const message = error instanceof Error ? error.message : "Stream initialization failed";

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Handle OPTIONS preflight for CORS
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
