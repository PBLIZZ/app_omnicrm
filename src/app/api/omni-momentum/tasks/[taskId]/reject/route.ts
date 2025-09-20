import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";

/**
 * Task Rejection API Route
 *
 * POST /api/omni-momentum/tasks/[taskId]/reject
 * Rejects an AI-generated task, changing its status from pending_approval to rejected
 * Rejected tasks can be optionally deleted or kept for AI learning purposes
 */

interface RouteParams {
  params: {
    taskId: string;
  };
}

/**
 * POST /api/omni-momentum/tasks/[taskId]/reject - Reject an AI-generated task
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;
    const body = await request.json();
    const { deleteTask = false, reason = "" } = body;

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

    // Create momentum action to track the rejection
    await MomentumRepository.createMomentumAction(userId, {
      momentumId: taskId,
      action: "rejected",
      previousData: { approvalStatus: "pending_approval" },
      newData: { approvalStatus: "rejected" },
      notes: reason || "Task rejected by user",
    });

    if (deleteTask) {
      // Delete the task entirely
      const deleted = await MomentumRepository.deleteMomentum(userId, taskId);
      if (!deleted) {
        return NextResponse.json(
          { error: "Failed to delete rejected task" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, deleted: true });
    } else {
      // Update task to rejected status (keep for AI learning)
      const updatedTask = await MomentumRepository.updateMomentum(userId, taskId, {
        approvalStatus: "rejected",
        status: "cancelled", // Move to cancelled status
      });

      if (!updatedTask) {
        return NextResponse.json(
          { error: "Failed to reject task" },
          { status: 500 }
        );
      }

      return NextResponse.json(updatedTask);
    }
  } catch (error) {
    console.error("Failed to reject task:", error);
    return NextResponse.json(
      { error: "Failed to reject task" },
      { status: 500 }
    );
  }
}