import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { momentumService } from "@/server/services/momentum.service";
import { CreateTaskDTOSchema, TaskFiltersSchema } from "@omnicrm/contracts";

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
    const filters = {
      search: searchParams.get("search") || undefined,
      status: searchParams.getAll("status").filter(Boolean),
      priority: searchParams.getAll("priority").filter(Boolean),
      projectId: searchParams.get("projectId") || undefined,
      parentTaskId:
        searchParams.get("parentTaskId") === "null"
          ? null
          : searchParams.get("parentTaskId") || undefined,
      taggedContactId: searchParams.get("taggedContactId") || undefined,
      dueAfter: searchParams.get("dueAfter") ? new Date(searchParams.get("dueAfter") || "") : undefined,
      dueBefore: searchParams.get("dueBefore")
        ? new Date(searchParams.get("dueBefore") || "")
        : undefined,
      hasSubtasks: searchParams.get("hasSubtasks")
        ? searchParams.get("hasSubtasks") === "true"
        : undefined,
    };

    // Validate filters
    const validatedFilters = TaskFiltersSchema.parse(filters);

    const tasks = await momentumService.getTasks(userId, validatedFilters);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to list tasks:", error);
    return NextResponse.json({ error: "Failed to retrieve tasks" }, { status: 500 });
  }
}

/**
 * POST /api/omni-momentum/tasks - Create new task
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body: unknown = await request.json();

    // ✅ Runtime validation with Zod schema
    const validatedData = CreateTaskDTOSchema.parse(body);

    const task = await momentumService.createTask(userId, validatedData);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid task data", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
