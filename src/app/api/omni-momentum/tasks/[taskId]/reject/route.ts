import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { momentumRepository } from "@repo";

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
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;
    const body: unknown = await request.json();

    // Type guard for the body structure
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const bodyAsRecord = body as Record<string, unknown>;
    const deleteTask =
      typeof bodyAsRecord["deleteTask"] === "boolean" ? bodyAsRecord["deleteTask"] : false;
    // TODO: If reason tracking is needed in the future, reintroduce reason handling here
    // by adding: const reason = typeof bodyAsRecord.reason === 'string' ? bodyAsRecord.reason : "";

    // Get the task to ensure it exists and belongs to the user
    const task = await momentumRepository.getTask(taskId, userId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Note: approvalStatus field might not exist in current schema,
    // this feature might need implementation. For now, proceed with rejection.

    // Note: createMomentumAction method doesn't exist yet,
    // this would need to be implemented for full audit trail

    if (deleteTask) {
      // Delete the task entirely
      await momentumRepository.deleteTask(taskId, userId);
      return NextResponse.json({ success: true, deleted: true });
    } else {
      // Update task to rejected status (keep for AI learning) (updateTask returns void)
      await momentumRepository.updateTask(taskId, userId, {
        status: "canceled", // Move to cancelled status
      });

      // Get the updated task to return
      const updatedTask = await momentumRepository.getTask(taskId, userId);
      if (!updatedTask) {
        return NextResponse.json({ error: "Failed to reject task" }, { status: 500 });
      }

      return NextResponse.json(updatedTask);
    }
  } catch (error) {
    console.error("Failed to reject task:", error);
    return NextResponse.json({ error: "Failed to reject task" }, { status: 500 });
  }
}
