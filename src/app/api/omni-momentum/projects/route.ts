import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";
import {
  CreateMomentumProjectDTOSchema,
  type MomentumProjectDTO
} from "@omnicrm/contracts";

/**
 * API Routes for Momentum Projects (Pathways)
 *
 * Following Technical Debt Elimination guidelines:
 * ✅ NextResponse pattern (Phase 17 - no ApiResponse helper)
 * ✅ Repository pattern with proper error handling
 * ✅ DTO validation with Zod schemas
 * ✅ Explicit return types for TypeScript compliance
 */

/**
 * GET /api/omni-momentum/projects - List projects for user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;

    const projects = await MomentumRepository.listProjects(userId, workspaceId);

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json(
      { error: "Failed to retrieve projects" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/omni-momentum/projects - Create new project
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body = await request.json();

    // ✅ Runtime validation with Zod schema
    const validatedData = CreateMomentumProjectDTOSchema.parse(body);

    const project = await MomentumRepository.createProject(userId, validatedData);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid project data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}