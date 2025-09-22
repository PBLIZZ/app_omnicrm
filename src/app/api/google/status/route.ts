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
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleIntegrationService } from "@/server/services/google-integration.service";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const status = await GoogleIntegrationService.getGoogleStatus(userId);
    return NextResponse.json(status);
  } catch (error: unknown) {
    console.error("GET /api/google/status error:", error);
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

    return NextResponse.json({
      error: "Failed to get Google status",
      code: errorCode,
      timestamp: new Date().toISOString(),
      operation: "google_status_check",
      recoverable: errorCode !== "DATABASE_ERROR",
      retryable: ["NETWORK_ERROR", "QUOTA_ERROR"].includes(errorCode),
    }, { status: 500 });
  }
}