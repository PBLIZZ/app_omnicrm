import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { momentumService } from "@/server/services/momentum.service";
import { UpdateProjectDTOSchema } from "@omnicrm/contracts";

/**
 * Individual Project Management API Routes
 *
 * Handles GET/PUT/DELETE operations for specific projects
 * Following established patterns from omni-clients API
 */

interface RouteParams {
  params: {
    projectId: string;
  };
}

/**
 * GET /api/omni-momentum/projects/[projectId] - Get project by ID
 */
export async function GET(_: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { projectId } = params;

    const project = await momentumService.getProject(projectId, userId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to get project:", error);
    return NextResponse.json({ error: "Failed to retrieve project" }, { status: 500 });
  }
}

/**
 * PUT /api/omni-momentum/projects/[projectId] - Update project
 */
export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { projectId } = params;
    const body: unknown = await request.json();

    // ✅ Runtime validation with Zod schema
    const validatedData = UpdateProjectDTOSchema.parse(body);

    const project = await momentumService.updateProject(projectId, userId, validatedData);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to update project:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid project data", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

/**
 * DELETE /api/omni-momentum/projects/[projectId] - Delete project
 */
export async function DELETE(_: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { projectId } = params;

    await momentumService.deleteProject(projectId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
