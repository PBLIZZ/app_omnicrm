/**
 * Server-Sent Events (SSE) utilities for real-time contact creation updates
 * Provides live streaming of contact creation progress to the frontend
 */

import { logger } from "@/lib/observability";
import { redisGet, redisSet, redisDel } from "./redis-client";

export interface ContactCreationEvent {
  type: string;
  data?: unknown;
  timestamp?: number;
}

// Global map to track active SSE connections per user (in-memory only for stream controllers)
const activeStreams = new Map<string, Set<ReadableStreamDefaultController>>();

// Cleanup interval to prevent memory leaks
const CLEANUP_INTERVAL = 60000; // 1 minute
const MAX_CONNECTION_AGE = 300000; // 5 minutes
const MAX_TOTAL_CONNECTIONS = 1000; // Prevent unbounded growth

// Track connection creation times for cleanup
const connectionTimes = new Map<ReadableStreamDefaultController, number>();

// Store cleanup interval ID for proper teardown
let cleanupIntervalId: NodeJS.Timeout | null = null;

// Start cleanup interval
cleanupIntervalId = setInterval(() => {
  const now = Date.now();
  const controllersToRemove: ReadableStreamDefaultController[] = [];

  // Find old connections
  for (const [controller, createdAt] of connectionTimes.entries()) {
    if (now - createdAt > MAX_CONNECTION_AGE) {
      controllersToRemove.push(controller);
    }
  }

  // Remove old connections
  for (const controller of controllersToRemove) {
    try {
      controller.close();
    } catch {
      // Already closed
    }
    connectionTimes.delete(controller);
  }

  // If we have too many total connections, remove oldest ones
  if (connectionTimes.size > MAX_TOTAL_CONNECTIONS) {
    const sortedConnections = Array.from(connectionTimes.entries()).sort((a, b) => a[1] - b[1]);

    const toRemove = sortedConnections.slice(0, connectionTimes.size - MAX_TOTAL_CONNECTIONS);
    for (const [controller] of toRemove) {
      try {
        controller.close();
      } catch {
        // Already closed
      }
      connectionTimes.delete(controller);
    }
  }

  // Clean up empty user sets
  for (const [userId, streams] of activeStreams.entries()) {
    if (streams.size === 0) {
      activeStreams.delete(userId);
    }
  }
}, CLEANUP_INTERVAL);

// Cleanup function to clear interval
function clearCleanupInterval(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

// Export cleanup function for application shutdown
export function stopSSECleanup(): void {
  clearCleanupInterval();
}

// Register cleanup on process signals
if (typeof process !== "undefined") {
  process.on("SIGINT", () => {
    clearCleanupInterval();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    clearCleanupInterval();
    process.exit(0);
  });
  process.on("exit", clearCleanupInterval);
}

// Redis keys for SSE connection tracking across instances
const getConnectionCountKey = (userId: string): string => `sse:connections:${userId}`;
const getLastEventKey = (userId: string): string => `sse:last_event:${userId}`;

/**
 * Create an SSE response for a user
 */
export function createEventStreamResponse(userId: string): Response {
  let streamController: ReadableStreamDefaultController;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;

      // Register this controller for the user
      if (!activeStreams.has(userId)) {
        activeStreams.set(userId, new Set());
      }
      const userStreams = activeStreams.get(userId);
      if (!userStreams) {
        throw new Error(`Failed to create or retrieve stream set for user: ${userId}`);
      }
      userStreams.add(controller);

      // Track connection creation time for cleanup
      connectionTimes.set(controller, Date.now());

      // Update Redis connection count with error handling
      redisSet(getConnectionCountKey(userId), userStreams.size, 3600).catch((error) => {
        console.error("Failed to update Redis connection count:", error);
      });

      // Send initial connection event
      const connectEvent = {
        type: "connection",
        message: "Connected to contact creation stream",
        timestamp: new Date().toISOString(),
      };

      const data = `data: ${JSON.stringify(connectEvent)}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Log connection (fire-and-forget async)
      void logger
        .info(`SSE connection opened for user ${userId}`, {
          operation: "sse.connection_opened",
          additionalData: { userId, streamCount: activeStreams.size },
        })
        .catch(() => {
          // Failed to log SSE connection - ignore to avoid cascading errors
        });
    },
    cancel() {
      // Clean up on connection close
      const userStreams = activeStreams.get(userId);
      if (userStreams) {
        userStreams.delete(streamController);

        // Remove from connection times tracking
        connectionTimes.delete(streamController);

        if (userStreams.size === 0) {
          activeStreams.delete(userId);
          redisDel(getConnectionCountKey(userId)).catch((error) => {
            console.error("Failed to delete Redis connection count:", error);
          });
        } else {
          redisSet(getConnectionCountKey(userId), userStreams.size, 3600).catch((error) => {
            console.error("Failed to update Redis connection count:", error);
          });
        }
      }

      // Log connection close (fire-and-forget async)
      void logger
        .info("SSE connection closed", {
          operation: "sse.connection_closed",
          additionalData: { userId, activeConnections: activeStreams.get(userId)?.size ?? 0 },
        })
        .catch(() => {
          // Failed to log SSE connection close - ignore to avoid cascading errors
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin":
        process.env.NODE_ENV === "production"
          ? process.env["ALLOWED_ORIGINS"] ?? "https://yourdomain.com"
          : "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

/**
 * Broadcast a contact creation event to all active streams for a user
 */
export function broadcastContactEvent(userId: string, event: ContactCreationEvent): void {
  // Store last event in Redis for new connections with error handling
  redisSet(getLastEventKey(userId), event, 300).catch((error) => {
    console.error("Failed to store last event in Redis:", error);
  });

  const userStreams = activeStreams.get(userId);
  if (!userStreams || userStreams.size === 0) {
    return; // No active connections for this user on this instance
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
      void logger
        .debug("Dead SSE stream detected", {
          operation: "sse.dead_stream_detected",
          additionalData: { userId, error: error instanceof Error ? error.message : String(error) },
        })
        .catch(() => {
          // Failed to log dead stream detection - ignore to avoid cascading errors
        });
    }
  }

  // Clean up dead streams
  for (const deadStream of deadStreams) {
    userStreams.delete(deadStream);
  }

  if (userStreams.size === 0) {
    activeStreams.delete(userId);
    redisDel(getConnectionCountKey(userId)).catch((error) => {
      console.error("Failed to delete Redis connection count:", error);
    });
  } else {
    redisSet(getConnectionCountKey(userId), userStreams.size, 3600).catch((error) => {
      console.error("Failed to update Redis connection count:", error);
    });
  }

  void logger
    .debug("Contact event broadcast to SSE streams", {
      operation: "sse.event_broadcast",
      additionalData: { userId, eventType: event.type, activeConnections: userStreams.size },
    })
    .catch(() => {
      // Failed to log event broadcast - ignore to avoid cascading errors
    });
}

/**
 * Get the number of active SSE connections for a user (checks Redis for cluster-wide count)
 */
export async function getActiveConnections(userId: string): Promise<number> {
  const redisCount = await redisGet<number>(getConnectionCountKey(userId));
  if (redisCount !== null) {
    return redisCount;
  }
  // Fallback to local count
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

  // Clean up Redis connection tracking with error handling
  redisDel(getConnectionCountKey(userId)).catch((error) => {
    console.error("Failed to delete Redis connection count:", error);
  });
  redisDel(getLastEventKey(userId)).catch((error) => {
    console.error("Failed to delete Redis last event:", error);
  });

  void logger
    .info("All SSE streams closed for user", {
      operation: "sse.user_streams_closed",
      additionalData: { userId },
    })
    .catch(() => {
      // Failed to log stream closure - ignore to avoid cascading errors
    });
}
