import { NextRequest } from "next/server";
import { handleAuth } from "@/lib/api";
import {
  getTaskService,
  updateTaskService,
  deleteTaskService,
} from "@/server/services/productivity.service";
import { UpdateTaskSchema, TaskSchema } from "@/server/db/business-schemas";
import { notFound } from "next/navigation";
import { z } from "zod";

/**
 * Individual Task Management API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleAuth for all operations
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: Promise<{
    taskId: string;
  }>;
}

/**
 * GET /api/omni-momentum/tasks/[taskId] - Get task by ID
 */
export async function GET(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(
    z.object({}),
    TaskSchema,
    async (_, userId): Promise<z.infer<typeof TaskSchema>> => {
      const params = await context.params;
      const task = await getTaskService(userId, params.taskId);

      if (!task) {
        notFound();
      }

      return task;
    },
  );

  return handler(request);
}

/**
 * PUT /api/omni-momentum/tasks/[taskId] - Update task
 */
export async function PUT(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(
    UpdateTaskSchema,
    TaskSchema,
    async (data, userId): Promise<z.infer<typeof TaskSchema>> => {
      const params = await context.params;
      return await updateTaskService(params.taskId, userId, data);
    },
  );

  return handler(request);
}

/**
 * DELETE /api/omni-momentum/tasks/[taskId] - Delete task
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(
    z.object({}),
    z.object({ success: z.boolean() }),
    async (_, userId) => {
      const params = await context.params;
      await deleteTaskService(userId, params.taskId);
      return { success: true };
    },
  );

  return handler(request);
}
