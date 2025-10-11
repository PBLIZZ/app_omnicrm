/**
 * POST /api/errors/retry — Intelligent error retry mechanism
 *
 * Provides smart retry functionality for different types of errors:
 * - Individual error retry with classification-based strategies
 * - Batch retry operations with filtering
 * - Automatic retry for retryable errors
 * - Recovery tracking and success/failure logging
 */

import { handleAuth } from "@/lib/api";
import { ErrorRetryService } from "@/server/services/error-retry.service";
import {
  ErrorRetryRequestSchema,
  ErrorRetryResponseSchema,
  type ErrorRetryResponse
} from "@/server/db/business-schemas";

export const POST = handleAuth(
  ErrorRetryRequestSchema,
  ErrorRetryResponseSchema,
  async (data, userId): Promise<ErrorRetryResponse> => {
    const result = await ErrorRetryService.retryErrors(userId, data);
    return result;
  }
);

