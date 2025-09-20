import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/get-server-user-id";
import { MomentumRepository } from "@omnicrm/repo";
import {
  UpdateMomentumDTOSchema,
  type MomentumDTO
} from "@omnicrm/contracts";

/**
 * Individual Task Management API Routes
 *
 * Handles GET/PUT/DELETE operations for specific tasks (momentums)
 * Following established patterns from omni-clients API
 */

interface RouteParams {
  params: {
    taskId: string;
  };
}

/**
 * GET /api/omni-momentum/tasks/[taskId] - Get task by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;

    const task = await MomentumRepository.getMomentumById(userId, taskId);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Failed to get task:", error);
    return NextResponse.json(
      { error: "Failed to retrieve task" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/omni-momentum/tasks/[taskId] - Update task
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;
    const body = await request.json();

    // ✅ Runtime validation with Zod schema
    const validatedData = UpdateMomentumDTOSchema.parse(body);

    const task = await MomentumRepository.updateMomentum(userId, taskId, validatedData);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Failed to update task:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid task data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/omni-momentum/tasks/[taskId] - Delete task
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;

    const deleted = await MomentumRepository.deleteMomentum(userId, taskId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}