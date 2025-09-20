import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";
import {
  CreateMomentumWorkspaceDTOSchema,
  type MomentumWorkspaceDTO
} from "@omnicrm/contracts";

/**
 * API Routes for Momentum Workspaces
 *
 * Following Technical Debt Elimination guidelines:
 * ✅ NextResponse pattern (Phase 17 - no ApiResponse helper)
 * ✅ Repository pattern with proper error handling
 * ✅ DTO validation with Zod schemas
 * ✅ Explicit return types for TypeScript compliance
 */

/**
 * GET /api/omni-momentum/workspaces - List workspaces for user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    const workspaces = await MomentumRepository.listWorkspaces(userId);

    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Failed to list workspaces:", error);
    return NextResponse.json(
      { error: "Failed to retrieve workspaces" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/omni-momentum/workspaces - Create new workspace
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body = await request.json();

    // ✅ Runtime validation with Zod schema
    const validatedData = CreateMomentumWorkspaceDTOSchema.parse(body);

    const workspace = await MomentumRepository.createWorkspace(userId, validatedData);

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Failed to create workspace:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid workspace data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}