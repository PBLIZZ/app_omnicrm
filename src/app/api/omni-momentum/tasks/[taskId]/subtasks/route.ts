import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";
import {
  CreateMomentumDTOSchema,
  type MomentumDTO
} from "@omnicrm/contracts";

/**
 * Subtasks Management API Route
 *
 * Handles hierarchical task structure by managing subtasks within parent tasks
 * Following the Project → Task → Subtask hierarchy
 */

interface RouteParams {
  params: {
    taskId: string;
  };
}

/**
 * GET /api/omni-momentum/tasks/[taskId]/subtasks - Get subtasks for a parent task
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;

    // Ensure parent task exists and belongs to user
    const parentTask = await MomentumRepository.getMomentumById(userId, taskId);
    if (!parentTask) {
      return NextResponse.json(
        { error: "Parent task not found" },
        { status: 404 }
      );
    }

    // Get subtasks for this parent task
    const subtasks = await MomentumRepository.listMomentums(userId, {
      parentMomentumId: taskId,
    });

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error("Failed to get subtasks:", error);
    return NextResponse.json(
      { error: "Failed to retrieve subtasks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/omni-momentum/tasks/[taskId]/subtasks - Create new subtask
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;
    const body = await request.json();

    // Ensure parent task exists and belongs to user
    const parentTask = await MomentumRepository.getMomentumById(userId, taskId);
    if (!parentTask) {
      return NextResponse.json(
        { error: "Parent task not found" },
        { status: 404 }
      );
    }

    // ✅ Runtime validation with Zod schema
    const validatedData = CreateMomentumDTOSchema.parse({
      ...body,
      parentMomentumId: taskId, // Ensure subtask is linked to parent
      // Inherit workspace and project from parent if not specified
      momentumWorkspaceId: body.momentumWorkspaceId ?? parentTask.momentumWorkspaceId,
      momentumProjectId: body.momentumProjectId ?? parentTask.momentumProjectId,
    });

    const subtask = await MomentumRepository.createMomentum(userId, validatedData);

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error("Failed to create subtask:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid subtask data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create subtask" },
      { status: 500 }
    );
  }
}