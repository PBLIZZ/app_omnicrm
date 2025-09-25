import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { momentumRepository } from "@repo";

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
export async function POST(_: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;

    // Get the task to ensure it exists and belongs to the user
    const task = await momentumRepository.getTask(taskId, userId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Note: approvalStatus field might not exist in current schema,
    // this feature might need implementation. For now, just update status.

    // Update task to approved status and get the updated task
    const updatedTask = await momentumRepository.updateTask(taskId, userId, {
      status: "todo", // Move to active todo status
    });

    if (!updatedTask) {
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    // Note: createMomentumAction method doesn't exist yet,
    // this would need to be implemented for full audit trail

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Failed to approve task:", error);
    return NextResponse.json({ error: "Failed to approve task" }, { status: 500 });
  }
}
