import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";

/**
 * Momentum Statistics API Route
 *
 * GET /api/omni-momentum/stats
 * Returns statistical overview of momentum tasks and projects
 */

/**
 * GET /api/omni-momentum/stats - Get momentum statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // TODO: Implement actual stats calculation when MomentumRepository has the method
    const stats = {
      total: 0,
      todo: 0,
      inProgress: 0,
      completed: 0,
      pendingApproval: 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to get momentum stats:", error);
    return NextResponse.json(
      { error: "Failed to retrieve momentum statistics" },
      { status: 500 }
    );
  }
}