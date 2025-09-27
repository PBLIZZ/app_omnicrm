import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { momentumService } from "@/server/services/momentum.service";
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
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const handler = handleGetWithQueryAuth(
    TaskFiltersSchema,
    z.array(TaskSchema),
    async (filters, userId) => {
      const { subtasks, parentTask } = await momentumService.getSubtasksWithValidation(params.taskId, userId);

      if (!parentTask) {
        throw new Error("Parent task not found");
      }

      return subtasks;
    }
  );

  return handler(request);
}

/**
 * POST /api/omni-momentum/tasks/[taskId]/subtasks - Create new subtask
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const handler = handleAuth(
    CreateTaskSchema,
    TaskSchema,
    async (data, userId) => {
      const { subtask, parentTask } = await momentumService.createSubtaskWithValidation(params.taskId, userId, data);

      if (!parentTask) {
        throw new Error("Parent task not found");
      }

      if (!subtask) {
        throw new Error("Failed to create subtask");
      }

      return subtask;
    }
  );

  return handler(request);
}
