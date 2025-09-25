import { NextRequest, NextResponse } from "next/server";

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
export async function GET(_: NextRequest): Promise<NextResponse> {
  try {
    // Remove unused userId since approval system is not implemented yet
    // const userId = await getServerUserId();

    // Get tasks with pending approval status
    // const pendingTasks = await momentumRepository.getTasks(userId, {
    // Note: The repository currently doesn't have approval status filtering
    // This will need to be enhanced once the approval system is implemented
    // });

    // Note: approvalStatus field doesn't exist in current schema
    // For now, return empty array until the approval system is implemented
    const filteredTasks: never[] = [];

    return NextResponse.json(filteredTasks);
  } catch (error) {
    console.error("Failed to get pending approval tasks:", error);
    return NextResponse.json(
      { error: "Failed to retrieve pending approval tasks" },
      { status: 500 },
    );
  }
}
