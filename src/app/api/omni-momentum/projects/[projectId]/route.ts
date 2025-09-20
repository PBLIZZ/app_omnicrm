import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";
import {
  UpdateMomentumProjectDTOSchema,
  type MomentumProjectDTO
} from "@omnicrm/contracts";

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
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { projectId } = params;

    const project = await MomentumRepository.getProjectById(userId, projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to get project:", error);
    return NextResponse.json(
      { error: "Failed to retrieve project" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/omni-momentum/projects/[projectId] - Update project
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { projectId } = params;
    const body = await request.json();

    // ✅ Runtime validation with Zod schema
    const validatedData = UpdateMomentumProjectDTOSchema.parse(body);

    const project = await MomentumRepository.updateProject(userId, projectId, validatedData);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to update project:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid project data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/omni-momentum/projects/[projectId] - Delete project
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { projectId } = params;

    const deleted = await MomentumRepository.deleteProject(userId, projectId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}