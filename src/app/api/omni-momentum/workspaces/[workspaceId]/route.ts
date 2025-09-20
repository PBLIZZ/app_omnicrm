import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";
import {
  UpdateMomentumWorkspaceDTOSchema,
  type MomentumWorkspaceDTO
} from "@omnicrm/contracts";

/**
 * Individual Workspace Management API Routes
 *
 * Handles GET/PUT/DELETE operations for specific workspaces
 * Following established patterns from omni-clients API
 */

interface RouteParams {
  params: {
    workspaceId: string;
  };
}

/**
 * GET /api/omni-momentum/workspaces/[workspaceId] - Get workspace by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { workspaceId } = params;

    const workspace = await MomentumRepository.getWorkspaceById(userId, workspaceId);

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Failed to get workspace:", error);
    return NextResponse.json(
      { error: "Failed to retrieve workspace" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/omni-momentum/workspaces/[workspaceId] - Update workspace
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { workspaceId } = params;
    const body = await request.json();

    // ✅ Runtime validation with Zod schema
    const validatedData = UpdateMomentumWorkspaceDTOSchema.parse(body);

    const workspace = await MomentumRepository.updateWorkspace(userId, workspaceId, validatedData);

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Failed to update workspace:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid workspace data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update workspace" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/omni-momentum/workspaces/[workspaceId] - Delete workspace
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { workspaceId } = params;

    const deleted = await MomentumRepository.deleteWorkspace(userId, workspaceId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workspace:", error);
    return NextResponse.json(
      { error: "Failed to delete workspace" },
      { status: 500 }
    );
  }
}