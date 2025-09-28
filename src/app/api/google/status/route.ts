/**
 * GET /api/google/status — Unified Google provider status
 *
 * This endpoint consolidates all Google service status checking into a single route.
 * Replaces /api/settings/sync/status and /api/google/{gmail,calendar}/status endpoints.
 *
 * Features:
 * - Google OAuth connection status
 * - Gmail & Calendar service status with auto-refresh
 * - Accurate last sync timestamps (job completion, not raw event creation)
 * - Job processing metrics
 * - Server-side caching to prevent UI flickering
 */
import { handleGetWithQueryAuth } from "@/lib/api";
import { GoogleStatusQuerySchema, GoogleStatusResponseSchema } from "@/server/db/business-schemas/google-prefs";
import { GoogleIntegrationService } from "@/server/services/google-integration.service";

export const GET = handleGetWithQueryAuth(GoogleStatusQuerySchema, GoogleStatusResponseSchema, async (query, userId) => {
  const result = await GoogleIntegrationService.getGoogleStatus(userId);

  if (result.success) {
    return result.data;
  }

  // Service already classified and logged the error, just propagate it with proper context
  const { code, message, retryable, userActionRequired } = result.error;
  throw new Error(`Google status error [${code}]: ${message}${retryable ? ' (retryable)' : ''}${userActionRequired ? ' (user action required)' : ''}`);
});