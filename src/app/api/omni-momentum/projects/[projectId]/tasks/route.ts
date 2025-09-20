import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";

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
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    // Optional filtering
    const status = searchParams.get("status") || undefined;
    const parentTaskId = searchParams.get("parentTaskId");

    // Ensure project exists and belongs to user
    const project = await MomentumRepository.getProjectById(userId, projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get tasks for this project
    const tasks = await MomentumRepository.listMomentums(userId, {
      projectId,
      status,
      parentMomentumId: parentTaskId === "null" ? null : parentTaskId || undefined,
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to get project tasks:", error);
    return NextResponse.json(
      { error: "Failed to retrieve project tasks" },
      { status: 500 }
    );
  }
}