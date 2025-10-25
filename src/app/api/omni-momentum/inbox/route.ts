import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  getInboxStatsService,
  listInboxItemsService,
  quickCaptureService,
} from "@/server/services/inbox.service";
import { intelligentQuickCaptureService } from "@/server/services/enhanced-inbox.service";
import { InboxStatsResponseSchema } from "@/server/db/business-schemas/productivity";
import { z } from "zod";

// Schema for query parameters
const InboxQuerySchema = z.object({
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val): string[] | undefined => {
      if (!val) return undefined;
      if (typeof val === "string") return [val];
      return val;
    }),
  stats: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((val): string | undefined => {
      if (val === "true" || val === true) return "true";
      if (val === "false" || val === false) return "false";
      return undefined;
    }),
});

// Response schemas
const InboxListResponseSchema = z.object({
  items: z.array(z.any()),
  total: z.number(),
});

// Schema for creating inbox items
const CreateInboxItemSchema = z.object({
  content: z.string().min(1, "Content is required"),
  source: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
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
  async (query, userId): Promise<unknown> => {
    if (query.stats === "true") {
      // Return inbox statistics wrapped in stats property per schema
      const stats = await getInboxStatsService(userId);
      return { stats };
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
  async (data, userId): Promise<unknown> => {
    if (data.enableIntelligentProcessing) {
      // Use intelligent processing queue
      const result = await intelligentQuickCaptureService(userId, {
        rawText: data.content,
        enableIntelligentProcessing: true,
        source: data.source || "manual",
        priority: "medium",
      });

      return {
        item: result.inboxItem as unknown,
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
