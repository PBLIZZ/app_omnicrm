/**
 * Error Handling Schemas
 *
 * Domain schemas for error retry and summary operations
 */

import { z } from "zod";

// =============================================================================
// Error Retry Schemas
// =============================================================================

export const ErrorRetryRequestSchema = z.object({
  // Retry targets
  errorIds: z.array(z.string()).default([]), // Specific error IDs to retry
  retryAll: z.boolean().default(false), // Retry all retryable errors

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
  maxRetries: z.number().int().min(1).max(10).default(3), // Max retry attempts

  // Retry strategy options
  retryStrategy: z.enum(["immediate", "delayed", "smart"]).default("smart"),
  delayMinutes: z.number().int().min(0).max(60).default(5), // For delayed retry

  // Recovery options
  includeAuthRefresh: z.boolean().default(true), // Attempt token refresh for auth errors
  skipFailedJobs: z.boolean().default(false), // Skip errors from failed jobs
});

export const ErrorRetryResponseSchema = z.object({
  success: z.boolean(),
  retriedCount: z.number(),
  successCount: z.number(),
  failedCount: z.number(),
  errors: z.array(z.string()).optional(),
});

// =============================================================================
// Error Summary Schemas
// =============================================================================

export const ErrorSummaryQuerySchema = z.object({
  timeRangeHours: z.coerce.number().int().min(1).max(168).optional().default(24),
  includeResolved: z.coerce.boolean().optional().default(false),
  provider: z.enum(["gmail", "calendar", "drive"]).optional(),
  stage: z.enum(["sync", "normalize", "process"]).optional(),
  severityFilter: z.enum(["low", "medium", "high", "critical"]).optional(),
  includeDetails: z.coerce.boolean().optional().default(true),
});

export const ErrorSummaryResponseSchema = z.object({
  summary: z.object({
    totalErrors: z.number(),
    criticalErrors: z.number(),
    recentErrors: z.number(),
    resolvedErrors: z.number(),
  }),
  categories: z.record(z.number()),
  recentErrors: z.array(z.object({
    id: z.string(),
    message: z.string(),
    category: z.string(),
    severity: z.string(),
    timestamp: z.string(),
  })),
  recommendations: z.array(z.string()),
});

// =============================================================================
// Type Exports
// =============================================================================

export type ErrorRetryRequest = z.infer<typeof ErrorRetryRequestSchema>;
export type ErrorRetryResponse = z.infer<typeof ErrorRetryResponseSchema>;
export type ErrorSummaryQuery = z.infer<typeof ErrorSummaryQuerySchema>;
export type ErrorSummaryResponse = z.infer<typeof ErrorSummaryResponseSchema>;