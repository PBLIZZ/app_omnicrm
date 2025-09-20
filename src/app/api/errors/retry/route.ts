/**
 * POST /api/errors/retry — Intelligent error retry mechanism
 *
 * Provides smart retry functionality for different types of errors:
 * - Individual error retry with classification-based strategies
 * - Batch retry operations with filtering
 * - Automatic retry for retryable errors
 * - Recovery tracking and success/failure logging
 */

import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { ErrorRetryService } from "@/server/services/error-retry.service";
import { z } from "zod";

const retryRequestSchema = z.object({
  // Retry targets
  errorIds: z.array(z.string()).optional(), // Specific error IDs to retry
  retryAll: z.boolean().optional().default(false), // Retry all retryable errors

  // Filters for batch retry
  provider: z.enum(["gmail", "calendar", "drive"]).optional(),
  category: z
    .enum([
      "authentication",
      "network",
      "quota",
      "data_format",
      "processing",
      "permission",
      "configuration",
    ])
    .optional(),
  maxRetries: z.number().int().min(1).max(10).optional().default(3), // Max retry attempts

  // Retry strategy options
  retryStrategy: z.enum(["immediate", "delayed", "smart"]).optional().default("smart"),
  delayMinutes: z.number().int().min(0).max(60).optional().default(5), // For delayed retry

  // Recovery options
  includeAuthRefresh: z.boolean().optional().default(true), // Attempt token refresh for auth errors
  skipFailedJobs: z.boolean().optional().default(false), // Skip errors from failed jobs
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "error_retry" },
  validation: { body: retryRequestSchema },
})(async ({ userId, validated, requestId }) => {
  try {
    const result = await ErrorRetryService.retryErrors(userId, validated.body, requestId);
    return NextResponse.json(result);
  } catch (error:) {
    return NextResponse.json({
      error: "Failed to retry errors"
    }, { status: 500 });
  }
});

