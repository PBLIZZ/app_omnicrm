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
import { GoogleStatusQuerySchema, GoogleStatusResponseSchema } from "@/server/db/business-schemas";
import { GoogleIntegrationService } from "@/server/services/google-integration.service";

export const GET = handleGetWithQueryAuth(GoogleStatusQuerySchema, GoogleStatusResponseSchema, async (query, userId) => {
  try {
    return await GoogleIntegrationService.getGoogleStatus(userId);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Classify error types for better user experience
    let errorCode: string;
    if (errorMessage.includes("auth") || errorMessage.includes("token")) {
      errorCode = "AUTH_ERROR";
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      errorCode = "NETWORK_ERROR";
    } else if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
      errorCode = "QUOTA_ERROR";
    } else if (errorMessage.includes("database") || errorMessage.includes("db")) {
      errorCode = "DATABASE_ERROR";
    } else {
      errorCode = "UNKNOWN_ERROR";
    }

    throw new Error(`Failed to get Google status: ${errorCode} - ${errorMessage}`);
  }
});