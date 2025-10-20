/**
 * Intelligent Inbox Processing API
 *
 * This endpoint handles intelligent AI processing of inbox items with:
 * - Bulk task splitting
 * - Zone categorization
 * - Project assignment
 * - Hierarchy detection
 * - Background processing queue
 */

import { handleAuth } from "@/lib/api";
import {
  intelligentQuickCaptureService,
  IntelligentQuickCaptureSchema,
  type IntelligentProcessingResponse,
} from "@/server/services/enhanced-inbox.service";
import { z } from "zod";

// Define response schema
const IntelligentQuickCaptureResponseSchema = z.object({
  inboxItemId: z.string(),
  userId: z.string(),
  rawText: z.string(),
  queuedForProcessing: z.boolean(),
  priority: z.enum(["low", "medium", "high"]),
});

/**
 * POST /api/omni-momentum/inbox/intelligent - Queue for intelligent processing
 */
export const POST = handleAuth(
  IntelligentQuickCaptureSchema,
  IntelligentQuickCaptureResponseSchema,
  async (data, userId): Promise<IntelligentProcessingResponse> => {
    return await intelligentQuickCaptureService(userId, data);
  },
);
