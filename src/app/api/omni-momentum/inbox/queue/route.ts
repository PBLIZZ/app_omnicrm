/**
 * Inbox Queue API
 *
 * This endpoint handles the queue system for background intelligent processing.
 */

import { z } from "zod";
import { handleGetWithQueryAuth } from "@/lib/api";
import {
  getQueueStatsService,
  isIntelligentProcessingAvailable,
} from "@/server/services/enhanced-inbox.service";

// Query parameter schema
const QueueQuerySchema = z.object({
  action: z.enum(["stats", "status"]).optional().default("stats"),
});

// Response schemas
const StatusResponseSchema = z.object({
  isAvailable: z.boolean(),
  message: z.string(),
});

const StatsResponseSchema = z.object({
  totalQueued: z.number(),
  highPriority: z.number(),
  mediumPriority: z.number(),
  lowPriority: z.number(),
  oldestQueued: z.date().nullable(),
  isAvailable: z.boolean(),
});

const QueueResponseSchema = z.union([StatusResponseSchema, StatsResponseSchema]);

type QueueResponse = z.infer<typeof StatusResponseSchema> | z.infer<typeof StatsResponseSchema>;

/**
 * GET /api/omni-momentum/inbox/queue - Get queue statistics or status
 */
export const GET = handleGetWithQueryAuth(
  QueueQuerySchema,
  QueueResponseSchema,
  async (query, _userId): Promise<QueueResponse> => {
    if (query.action === "status") {
      const isAvailable = await isIntelligentProcessingAvailable();
      return {
        isAvailable,
        message: isAvailable
          ? "AI processing is available"
          : "AI processing is currently unavailable",
      };
    }

    const stats = await getQueueStatsService();
    return {
      ...stats,
      isAvailable: await isIntelligentProcessingAvailable(),
    };
  },
);
