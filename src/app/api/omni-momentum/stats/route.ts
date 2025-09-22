import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { momentumService } from "@/server/services/momentum.service";

/**
 * Momentum Statistics API Route
 *
 * GET /api/omni-momentum/stats
 * Returns statistical overview of momentum tasks and projects
 */

/**
 * GET /api/omni-momentum/stats - Get momentum statistics
 */
export async function GET(_: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    const stats = await momentumService.getStats(userId);

    // Format for frontend consumption
    const formattedStats = {
      total: stats.tasks.total,
      todo: stats.tasks.todo,
      inProgress: stats.tasks.inProgress,
      completed: stats.tasks.completed,
      pendingApproval: 0, // TODO: Add pending approval logic
      projects: stats.projects,
    };

    return NextResponse.json(formattedStats);
  } catch (error) {
    console.error("Failed to get momentum stats:", error);
    return NextResponse.json({ error: "Failed to retrieve momentum statistics" }, { status: 500 });
  }
}
