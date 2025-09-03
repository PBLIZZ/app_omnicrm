/**
 * Server-Sent Events (SSE) utilities for real-time contact creation updates
 * Provides live streaming of contact creation progress to the frontend
 */

import { log } from "@/lib/log";

export interface ContactCreationEvent {
  type: "contact_created" | "contact_updated" | "sync_progress" | "sync_complete";
  contactId?: string;
  contact?: {
    id: string;
    displayName: string;
    primaryEmail?: string;
    source: string;
  };
  progress?: {
    current: number;
    total: number;
    message: string;
  };
  batchId?: string;
  timestamp: string;
}

// Global map to track active SSE connections per user
const activeStreams = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Create an SSE response for a user
 */
export function createEventStreamResponse(userId: string): Response {
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      // Register this controller for the user
      if (!activeStreams.has(userId)) {
        activeStreams.set(userId, new Set());
      }
      activeStreams.get(userId)!.add(controller);

      // Send initial connection event
      const connectEvent = {
        type: "connection",
        message: "Connected to contact creation stream",
        timestamp: new Date().toISOString(),
      };

      const data = `data: ${JSON.stringify(connectEvent)}\n\n`;
      controller.enqueue(encoder.encode(data));

      log.info(
        {
          op: "sse.connection_opened",
          userId,
          activeConnections: activeStreams.get(userId)?.size ?? 0,
        },
        "SSE connection opened",
      );
    },

    cancel() {
      // Clean up on connection close
      const userStreams = activeStreams.get(userId);
      if (userStreams) {
        userStreams.delete(streamController);
        if (userStreams.size === 0) {
          activeStreams.delete(userId);
        }
      }

      log.info(
        {
          op: "sse.connection_closed",
          userId,
          activeConnections: activeStreams.get(userId)?.size ?? 0,
        },
        "SSE connection closed",
      );
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

/**
 * Broadcast a contact creation event to all active streams for a user
 */
export function broadcastContactEvent(userId: string, event: ContactCreationEvent): void {
  const userStreams = activeStreams.get(userId);
  if (!userStreams || userStreams.size === 0) {
    return; // No active connections for this user
  }

  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify(event)}\n\n`;

  // Send to all active streams for this user
  const deadStreams = new Set<ReadableStreamDefaultController>();

  for (const controller of userStreams) {
    try {
      controller.enqueue(encoder.encode(data));
    } catch (error) {
      // Connection is closed, mark for removal
      deadStreams.add(controller);
      log.debug(
        {
          op: "sse.dead_stream_detected",
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Dead SSE stream detected",
      );
    }
  }

  // Clean up dead streams
  for (const deadStream of deadStreams) {
    userStreams.delete(deadStream);
  }

  if (userStreams.size === 0) {
    activeStreams.delete(userId);
  }

  log.debug(
    {
      op: "sse.event_broadcast",
      userId,
      eventType: event.type,
      activeConnections: userStreams.size,
    },
    "Contact event broadcast to SSE streams",
  );
}

/**
 * Get the number of active SSE connections for a user
 */
export function getActiveConnections(userId: string): number {
  return activeStreams.get(userId)?.size ?? 0;
}

/**
 * Close all SSE connections for a user (useful for cleanup)
 */
export function closeUserStreams(userId: string): void {
  const userStreams = activeStreams.get(userId);
  if (!userStreams) return;

  for (const controller of userStreams) {
    try {
      controller.close();
    } catch {
      // Stream might already be closed
    }
  }

  activeStreams.delete(userId);

  log.info(
    {
      op: "sse.user_streams_closed",
      userId,
    },
    "All SSE streams closed for user",
  );
}
