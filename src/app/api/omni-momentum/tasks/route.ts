import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";
import {
  CreateMomentumDTOSchema,
  type MomentumDTO
} from "@omnicrm/contracts";

/**
 * API Routes for Momentum Tasks (Hierarchical Task Management)
 *
 * Following Technical Debt Elimination guidelines:
 * ✅ NextResponse pattern (Phase 17 - no ApiResponse helper)
 * ✅ Repository pattern with proper error handling
 * ✅ DTO validation with Zod schemas
 * ✅ Explicit return types for TypeScript compliance
 */

/**
 * GET /api/omni-momentum/tasks - List tasks for user with filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { searchParams } = new URL(request.url);

    // Parse query parameters for filtering
    const filters: {
      workspaceId?: string;
      projectId?: string;
      status?: string;
      parentMomentumId?: string | null;
    } = {};

    const workspaceId = searchParams.get("workspaceId");
    if (workspaceId) filters.workspaceId = workspaceId;

    const projectId = searchParams.get("projectId");
    if (projectId) filters.projectId = projectId;

    const status = searchParams.get("status");
    if (status) filters.status = status;

    const parentTaskId = searchParams.get("parentTaskId");
    if (parentTaskId === "null") {
      filters.parentMomentumId = null; // Top-level tasks only
    } else if (parentTaskId) {
      filters.parentMomentumId = parentTaskId; // Subtasks of specific parent
    }

    const tasks = await MomentumRepository.listMomentums(userId, filters);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to list tasks:", error);
    return NextResponse.json(
      { error: "Failed to retrieve tasks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/omni-momentum/tasks - Create new task
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body = await request.json();

    // ✅ Runtime validation with Zod schema
    const validatedData = CreateMomentumDTOSchema.parse(body);

    const task = await MomentumRepository.createMomentum(userId, validatedData);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid task data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}