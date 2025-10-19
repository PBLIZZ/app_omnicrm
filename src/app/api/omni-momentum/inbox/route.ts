import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  getInboxStatsService,
  listInboxItemsService,
  quickCaptureService,
} from "@/server/services/inbox.service";
import { intelligentQuickCaptureService } from "@/server/services/enhanced-inbox.service";
import { z } from "zod";

// Schema for query parameters
const InboxQuerySchema = z.object({
  status: z.array(z.string()).optional(),
  stats: z.string().optional(),
});

// Response schemas
const InboxListResponseSchema = z.object({
  items: z.array(z.any()),
  total: z.number(),
});

const InboxStatsResponseSchema = z.object({
  total: z.number(),
  unprocessed: z.number(),
  processed: z.number(),
  archived: z.number(),
  recentActivity: z.number(),
});

// Schema for creating inbox items
const CreateInboxItemSchema = z.object({
  content: z.string().min(1, "Content is required"),
  source: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  tags: z.array(z.string()).optional().default([]),
  enableIntelligentProcessing: z.boolean().optional().default(false),
});

// Schema for single inbox item response
const InboxItemResponseSchema = z.object({
  item: z.any(),
});

/**
 * GET /api/omni-momentum/inbox - Get inbox items with optional filtering
 */
export const GET = handleGetWithQueryAuth(
  InboxQuerySchema,
  z.union([InboxListResponseSchema, InboxStatsResponseSchema]),
  async (query, userId) => {
    if (query.stats === "true") {
      // Return inbox statistics
      return await getInboxStatsService(userId);
    }

    // Get inbox items with filters
    const filters: { status?: ("unprocessed" | "processed" | "archived")[] } = {};
    if (query.status && query.status.length > 0) {
      const isValidStatus = (s: string): s is "unprocessed" | "processed" | "archived" =>
        ["unprocessed", "processed", "archived"].includes(s);

      const validStatuses = query.status.filter(isValidStatus);
      if (validStatuses.length > 0) {
        filters.status = validStatuses;
      }
    }

    return await listInboxItemsService(userId, filters);
  },
);

/**
 * POST /api/omni-momentum/inbox - Create new inbox item
 */
export const POST = handleAuth(
  CreateInboxItemSchema,
  InboxItemResponseSchema,
  async (data, userId) => {
    if (data.enableIntelligentProcessing) {
      // Use intelligent processing queue
      const result = await intelligentQuickCaptureService(userId, {
        rawText: data.content,
        enableIntelligentProcessing: true,
        source: data.source || "manual",
        priority: "medium",
      });

      return {
        item: result.inboxItem,
        queued: result.queued,
        message: result.message,
        queueStats: result.queueStats,
      };
    } else {
      // Use standard processing
      const item = await quickCaptureService(userId, {
        rawText: data.content,
      });

      return { item };
    }
  },
);
