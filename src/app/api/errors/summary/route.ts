/**
 * GET /api/errors/summary — Comprehensive error summary with recovery suggestions
 *
 * Provides detailed error analysis for sync operations including:
 * - Error counts by category and severity
 * - Recent errors with classifications
 * - Recovery action recommendations
 * - Error patterns and trends
 * - Critical issues requiring immediate attention
 */

import { handleGetWithQueryAuth } from "@/lib/api";
import { ErrorSummaryService } from "@/server/services/error-summary.service";
import {
  ErrorSummaryQuerySchema,
  ErrorSummaryResponseSchema,
  type ErrorSummaryResponse
} from "@/server/db/business-schemas";

export const GET = handleGetWithQueryAuth(
  ErrorSummaryQuerySchema,
  ErrorSummaryResponseSchema,
  async (query, userId): Promise<ErrorSummaryResponse> => {
    const errorSummary = await ErrorSummaryService.getErrorSummary(userId, query);
    return errorSummary;
  }
);
