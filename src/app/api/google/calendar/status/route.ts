/**
 * GET /api/google/calendar/status — DEPRECATED Calendar connection status
 *
 * ⚠️ DEPRECATED: This endpoint is deprecated. Use /api/google/status instead.
 *
 * This endpoint will be removed in a future version. The unified endpoint
 * provides the same functionality with improved performance and consistency.
 *
 * Migration guide:
 * - Replace calls to /api/google/calendar/status with /api/google/status
 * - Access Calendar data via response.services.calendar instead of root level
 */
import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const status = await GoogleCalendarService.getCalendarStatus(userId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/google/calendar/status error:", error);
    console.error("Failed to check calendar status:", error);
    return NextResponse.json({ error: "Failed to check calendar status" }, { status: 500 });
  }
}
