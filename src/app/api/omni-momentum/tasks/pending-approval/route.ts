import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";

/**
 * Pending Approval Tasks API Route
 *
 * GET /api/omni-momentum/tasks/pending-approval
 * Returns tasks that are AI-generated and awaiting user approval
 * This supports the AI workflow where the system suggests tasks
 * but users must approve them before they become active
 */

/**
 * GET /api/omni-momentum/tasks/pending-approval - Get AI-generated tasks awaiting approval
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Get tasks with pending approval status
    const pendingTasks = await MomentumRepository.listMomentums(userId, {
      // Note: The repository currently doesn't have approval status filtering
      // This will need to be enhanced once the approval system is implemented
    });

    // Filter for pending approval tasks (temporary until repository supports this)
    const filteredTasks = pendingTasks.filter(task =>
      task.approvalStatus === "pending_approval"
    );

    return NextResponse.json(filteredTasks);
  } catch (error) {
    console.error("Failed to get pending approval tasks:", error);
    return NextResponse.json(
      { error: "Failed to retrieve pending approval tasks" },
      { status: 500 }
    );
  }
}