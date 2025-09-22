/**
 * POST /api/errors/retry — Intelligent error retry mechanism
 *
 * Provides smart retry functionality for different types of errors:
 * - Individual error retry with classification-based strategies
 * - Batch retry operations with filtering
 * - Automatic retry for retryable errors
 * - Recovery tracking and success/failure logging
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { ErrorRetryService } from "@/server/services/error-retry.service";
import { z } from "zod";

const retryRequestSchema = z.object({
  // Retry targets
  errorIds: z.array(z.string()).default([]), // Specific error IDs to retry
  retryAll: z.boolean().default(false), // Retry all retryable errors

  // Filters for batch retry
  provider: z.enum(["gmail", "calendar", "drive"]).optional().or(z.undefined()),
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
    .optional()
    .or(z.undefined()),
  maxRetries: z.number().int().min(1).max(10).default(3), // Max retry attempts

  // Retry strategy options
  retryStrategy: z.enum(["immediate", "delayed", "smart"]).default("smart"),
  delayMinutes: z.number().int().min(0).max(60).default(5), // For delayed retry

  // Recovery options
  includeAuthRefresh: z.boolean().default(true), // Attempt token refresh for auth errors
  skipFailedJobs: z.boolean().default(false), // Skip errors from failed jobs
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const validation = retryRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: validation.error.issues
      }, { status: 400 });
    }

    const requestId = request.headers.get('x-request-id') || undefined;
    const result = await ErrorRetryService.retryErrors(userId, validation.data, requestId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/errors/retry error:", error);
    return NextResponse.json({
      error: "Failed to retry errors"
    }, { status: 500 });
  }
}

