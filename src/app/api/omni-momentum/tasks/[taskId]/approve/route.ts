import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";

/**
 * Task Approval API Route
 *
 * POST /api/omni-momentum/tasks/[taskId]/approve
 * Approves an AI-generated task, changing its status from pending_approval to approved
 * This is part of the AI workflow where users review and approve suggested tasks
 */

interface RouteParams {
  params: {
    taskId: string;
  };
}

/**
 * POST /api/omni-momentum/tasks/[taskId]/approve - Approve an AI-generated task
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;

    // Get the task to ensure it exists and belongs to the user
    const task = await MomentumRepository.getMomentumById(userId, taskId);
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Check if task is in pending approval state
    if (task.approvalStatus !== "pending_approval") {
      return NextResponse.json(
        { error: "Task is not pending approval" },
        { status: 400 }
      );
    }

    // Update task to approved status
    const updatedTask = await MomentumRepository.updateMomentum(userId, taskId, {
      approvalStatus: "approved",
      status: "todo", // Move to active todo status
    });

    if (!updatedTask) {
      return NextResponse.json(
        { error: "Failed to approve task" },
        { status: 500 }
      );
    }

    // Create momentum action to track the approval
    await MomentumRepository.createMomentumAction(userId, {
      momentumId: taskId,
      action: "approved",
      previousData: { approvalStatus: "pending_approval" },
      newData: { approvalStatus: "approved", status: "todo" },
      notes: "Task approved by user",
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Failed to approve task:", error);
    return NextResponse.json(
      { error: "Failed to approve task" },
      { status: 500 }
    );
  }
}