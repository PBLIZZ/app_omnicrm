import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { getSubtasksService, createTaskService } from "@/server/services/productivity.service";
import { CreateTaskSchema, TaskSchema, TaskFiltersSchema } from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * Subtasks Management API Route
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET with query params
 * ✅ handleAuth for POST operations
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: Promise<{
    taskId: string;
  }>;
}

/**
 * GET /api/omni-momentum/tasks/[taskId]/subtasks - Get subtasks for a parent task
 */
export async function GET(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleGetWithQueryAuth(
    TaskFiltersSchema,
    z.array(TaskSchema),
    async (_, userId): Promise<z.infer<typeof TaskSchema>[]> => {
      const result = await getSubtasksService(userId, params.taskId);

      return result.subtasks;
    },
  )(request);
}

/**
 * POST /api/omni-momentum/tasks/[taskId]/subtasks - Create new subtask
 */
export async function POST(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleAuth(
    CreateTaskSchema,
    TaskSchema,
    async (data, userId): Promise<z.infer<typeof TaskSchema>> => {
      const subtask = await createTaskService(userId, {
        ...data,
        parentTaskId: params.taskId,
      });

      return subtask;
    },
  )(request);
}
