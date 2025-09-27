import { NextRequest } from "next/server";
import { handleAuth } from "@/lib/api";
import { momentumService } from "@/server/services/momentum.service";
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
  params: {
    taskId: string;
  };
}

/**
 * GET /api/omni-momentum/tasks/[taskId] - Get task by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(z.object({}), TaskSchema, async (_, userId) => {
    const task = await momentumService.getTask(params.taskId, userId);

    if (!task) {
      notFound();
    }

    return task;
  });

  return handler(request);
}

/**
 * PUT /api/omni-momentum/tasks/[taskId] - Update task
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(UpdateTaskSchema, TaskSchema, async (data, userId) => {
    const task = await momentumService.updateTask(params.taskId, userId, data);

    if (!task) {
      notFound();
    }

    return task;
  });

  return handler(request);
}

/**
 * DELETE /api/omni-momentum/tasks/[taskId] - Delete task
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(
    z.object({}),
    z.object({ success: z.boolean() }),
    async (_, userId) => {
      await momentumService.deleteTask(params.taskId, userId);
      return { success: true };
    },
  );

  return handler(request);
}
