/**
 * GET /api/omni-connect/dashboard — unified dashboard endpoint (auth required)
 *
 * Consolidates data from:
 * - /api/google/gmail/status (CONSOLIDATED)
 * - /api/google/calendar/status (CONSOLIDATED)
 * - /api/jobs/status
 */
import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { OmniConnectDashboardService } from "@/server/services/omni-connect-dashboard.service";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const dashboardState = await OmniConnectDashboardService.getDashboardState(userId);
    return NextResponse.json(dashboardState);
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
