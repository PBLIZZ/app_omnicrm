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
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { GoogleIntegrationService } from "@/server/services/google-integration.service";
import { ensureError } from "@/lib/utils/error-handler";


export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_status" },
})(async ({ userId, requestId }) => {
  try {
    const status = await GoogleIntegrationService.getGoogleStatus(userId);
    return NextResponse.json(status);
  } catch (error) {
    const ensuredError = ensureError(error);

    // Classify error types for better user experience
    let errorCode: string;
    let errorMessage: string;

    if (ensuredError.message.includes("auth") || ensuredError.message.includes("token")) {
      errorCode = "AUTH_ERROR";
      errorMessage = "Authentication error occurred while checking Google status";
    } else if (ensuredError.message.includes("network") || ensuredError.message.includes("fetch")) {
      errorCode = "NETWORK_ERROR";
      errorMessage = "Network error occurred while checking Google status";
    } else if (ensuredError.message.includes("quota") || ensuredError.message.includes("rate limit")) {
      errorCode = "QUOTA_ERROR";
      errorMessage = "Rate limit exceeded while checking Google status";
    } else if (ensuredError.message.includes("database") || ensuredError.message.includes("db")) {
      errorCode = "DATABASE_ERROR";
      errorMessage = "Database error occurred while checking Google status";
    } else {
      errorCode = "UNKNOWN_ERROR";
      errorMessage = "Unknown error occurred while checking Google status";
    }

    console.error("Google status check failed:", {
      userId,
      error: ensuredError.message,
      stack: ensuredError.stack,
      code: errorCode,
    });

    return NextResponse.json({
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
      operation: "google_status_check",
      recoverable: errorCode !== "DATABASE_ERROR",
      retryable: ["NETWORK_ERROR", "QUOTA_ERROR"].includes(errorCode),
    }, { status: 500 });
  }
});