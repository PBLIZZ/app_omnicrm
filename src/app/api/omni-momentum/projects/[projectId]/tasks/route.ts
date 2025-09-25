import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { momentumRepository } from "@repo";

/**
 * Project Tasks API Route
 *
 * GET /api/omni-momentum/projects/[projectId]/tasks
 * Returns all tasks (momentums) within a specific project
 */

interface RouteParams {
  params: {
    projectId: string;
  };
}

/**
 * GET /api/omni-momentum/projects/[projectId]/tasks - Get tasks within project
 */
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { projectId } = params;

    // Ensure project exists and belongs to user
    const project = await momentumRepository.getProject(projectId, userId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get tasks for this project - use getTasksWithProject method
    const tasks = await momentumRepository.getTasksWithProject(userId, projectId);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to get project tasks:", error);
    return NextResponse.json({ error: "Failed to retrieve project tasks" }, { status: 500 });
  }
}
