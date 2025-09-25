import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { momentumRepository } from "@repo";
import { CreateTaskDTOSchema } from "@omnicrm/contracts";
import { z } from "zod";

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
    const parentTask = await momentumRepository.getTask(taskId, userId);
    if (!parentTask) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }

    // Get subtasks for this parent task
    const subtasks = await momentumRepository.getSubtasks(taskId, userId);

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error("Failed to get subtasks:", error);
    return NextResponse.json({ error: "Failed to retrieve subtasks" }, { status: 500 });
  }
}

/**
 * POST /api/omni-momentum/tasks/[taskId]/subtasks - Create new subtask
 */
// Define subtask request schema
const SubtaskRequestSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate: z.string().datetime().optional(),
    projectId: z.string().optional(),
  })
  .passthrough(); // Allow additional fields

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { taskId } = params;
    const body: unknown = await request.json();

    // Ensure parent task exists and belongs to user
    const parentTask = await momentumRepository.getTask(taskId, userId);
    if (!parentTask) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }

    // Validate request body with Zod
    const parseResult = SubtaskRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    // Build validated data with parent task context
    const validatedData = CreateTaskDTOSchema.parse({
      ...parseResult.data,
      parentTaskId: taskId, // Ensure subtask is linked to parent
      // Inherit project from parent if not specified
      projectId: parseResult.data.projectId ?? parentTask.projectId,
    });

    const subtask = await momentumRepository.createTask(userId, validatedData);

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
