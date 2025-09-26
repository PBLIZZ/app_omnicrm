import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { momentumService } from "@/server/services/momentum.service";
import { CreateTaskDTOSchema } from "@omnicrm/contracts";

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

    // Delegate to service layer with validation
    const { subtasks, parentTask } = await momentumService.getSubtasksWithValidation(taskId, userId);

    if (!parentTask) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }

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

    // Validate request body
    const validatedBody = CreateTaskDTOSchema.parse(body);

    // Delegate to service layer with validation and business logic
    const { subtask, parentTask } = await momentumService.createSubtaskWithValidation(taskId, userId, validatedBody);

    if (!parentTask) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }

    if (!subtask) {
      return NextResponse.json({ error: "Failed to create subtask" }, { status: 500 });
    }

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
