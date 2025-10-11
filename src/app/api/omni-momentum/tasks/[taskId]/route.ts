import { NextRequest } from "next/server";
import { handleAuth } from "@/lib/api";
import { productivityService } from "@/server/services/productivity.service";
import { UpdateTaskSchema, TaskSchema } from "@/server/db/business-schemas";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isErr } from "@/lib/utils/result";

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
    const result = await productivityService.getTask(params.taskId, userId);

    if (isErr(result)) {
      throw new Error(result.error.message);
    }

    if (!result.data) {
      notFound();
    }

    return result.data;
  });

  return handler(request);
}

/**
 * PUT /api/omni-momentum/tasks/[taskId] - Update task
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const handler = handleAuth(UpdateTaskSchema, TaskSchema, async (data, userId) => {
    const result = await productivityService.updateTask(params.taskId, userId, data);

    if (isErr(result)) {
      throw new Error(result.error.message);
    }

    if (!result.data) {
      notFound();
    }

    return result.data;
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
      const result = await productivityService.deleteTask(params.taskId, userId);

      if (isErr(result)) {
        throw new Error(result.error.message);
      }

      return { success: true };
    },
  );

  return handler(request);
}
