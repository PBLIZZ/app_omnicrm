import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { momentumService } from "@/server/services/momentum.service";

/**
 * Task Approval API Route
 *
 * POST /api/omni-momentum/tasks/[taskId]/approve
 * Approves an AI-generated task, changing its status from pending_approval to approved
 * This is part of the AI workflow where users review and approve suggested tasks
 */

interface RouteParams {
  params: Promise<{
    taskId: string;
  }>;
}

/**
 * POST /api/omni-momentum/tasks/[taskId]/approve - Approve an AI-generated task
 */
export async function POST(_: NextRequest, context: RouteParams): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const params = await context.params;
    const { taskId } = params;

    // Approve task using service
    const approvedTask = await momentumService.approveTask(taskId, userId);

    if (!approvedTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(approvedTask);
  } catch (error) {
    console.error("Failed to approve task:", error);
    return NextResponse.json({ error: "Failed to approve task" }, { status: 500 });
  }
}
