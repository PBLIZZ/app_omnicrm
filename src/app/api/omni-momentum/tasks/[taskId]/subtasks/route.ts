import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { MomentumRepository } from "@repo";
import { CreateMomentumDTOSchema } from "@omnicrm/contracts";

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
export async function GET(_: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;

    // Ensure parent task exists and belongs to user
    const parentTask = await MomentumRepository.getTask(taskId, userId);
    if (!parentTask) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }

    // Get subtasks for this parent task
    const subtasks = await MomentumRepository.getSubtasks(taskId, userId);

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error("Failed to get subtasks:", error);
    return NextResponse.json({ error: "Failed to retrieve subtasks" }, { status: 500 });
  }
}

/**
 * POST /api/omni-momentum/tasks/[taskId]/subtasks - Create new subtask
 */
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;
    const body: unknown = await request.json();

    // Ensure parent task exists and belongs to user
    const parentTask = await MomentumRepository.getTask(taskId, userId);
    if (!parentTask) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }

    // Validate the body is an object before spreading
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const bodyAsRecord = body as Record<string, unknown>;

    // ✅ Runtime validation with Zod schema
    const validatedData = CreateMomentumDTOSchema.parse({
      ...bodyAsRecord,
      parentTaskId: taskId, // Ensure subtask is linked to parent
      // Inherit project from parent if not specified
      projectId: bodyAsRecord.projectId ?? parentTask.projectId,
    });

    const subtask = await MomentumRepository.createTask(userId, validatedData);

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error("Failed to create subtask:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid subtask data", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to create subtask" }, { status: 500 });
  }
}
