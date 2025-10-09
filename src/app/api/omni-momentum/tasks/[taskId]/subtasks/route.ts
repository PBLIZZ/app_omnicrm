import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { productivityService } from "@/server/services/productivity.service";
import { CreateTaskSchema, TaskSchema, TaskFiltersSchema } from "@/server/db/business-schemas";
import { z } from "zod";
import { NextRequest } from "next/server";

/**
 * Subtasks Management API Route
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET with query params
 * ✅ handleAuth for POST operations
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: {
    taskId: string;
  };
}

/**
 * GET /api/omni-momentum/tasks/[taskId]/subtasks - Get subtasks for a parent task
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const handler = handleGetWithQueryAuth(
    TaskFiltersSchema,
    z.array(TaskSchema),
    async (filters, userId): Promise<z.infer<typeof TaskSchema>[]> => {
      const result = await productivityService.getSubtasksWithValidation(params.taskId, userId);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      const { subtasks, parentTask } = result.data;

      if (!parentTask) {
        throw new Error("Parent task not found");
      }

      return subtasks;
    },
  );

  return handler(request);
}

/**
 * POST /api/omni-momentum/tasks/[taskId]/subtasks - Create new subtask
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(
    CreateTaskSchema,
    TaskSchema,
    async (data, userId): Promise<z.infer<typeof TaskSchema>> => {
      const result = await productivityService.createSubtaskWithValidation(
        params.taskId,
        userId,
        data,
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      const { subtask, parentTask } = result.data;

      if (!parentTask) {
        throw new Error("Parent task not found");
      }

      if (!subtask) {
        throw new Error("Failed to create subtask");
      }

      return subtask;
    },
  );

  return handler(request);
}
