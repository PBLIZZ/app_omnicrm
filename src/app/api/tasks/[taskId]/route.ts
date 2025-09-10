import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { tasksStorage } from "@/server/storage/momentum.storage";
import { logger } from "@/lib/observability";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "waiting", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignee: z.enum(["user", "ai"]).optional(),
  approvalStatus: z.enum(["pending_approval", "approved", "rejected"]).optional(),
  taggedContacts: z.array(z.string().uuid()).optional(),
  dueDate: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  actualMinutes: z.number().int().min(0).optional(),
});

const ParamsSchema = z.object({
  taskId: z.string(),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "tasks_get" },
  validation: {
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const apiResponse = new ApiResponseBuilder("tasks.get", requestId);
  const { taskId } = validated.params;

  try {
    const task = await tasksStorage.getTask(taskId, userId);
    if (!task) {
      return apiResponse.error("task_not_found", "NOT_FOUND");
    }

    // Get subtasks if any
    const subtasks = await tasksStorage.getSubtasks(taskId, userId);

    return apiResponse.success({ task, subtasks });
  } catch (error) {
    await logger.error(
      "Error fetching task",
      {
        operation: "tasks.get",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          taskId,
        },
      },
      ensureError(error),
    );
    return apiResponse.error("internal_server_error", "INTERNAL_ERROR");
  }
});

export const PUT = createRouteHandler({
  auth: true,
  rateLimit: { operation: "tasks_update" },
  validation: {
    body: UpdateTaskSchema,
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const apiResponse = new ApiResponseBuilder("tasks.update", requestId);
  const { taskId } = validated.params;

  try {
    // Get original task for tracking changes
    const originalTask = await tasksStorage.getTask(taskId, userId);
    if (!originalTask) {
      return apiResponse.error("task_not_found", "NOT_FOUND");
    }

    const updateData: Record<string, unknown> = { ...validated.body };
    if (validated.body.dueDate) {
      updateData["dueDate"] = new Date(validated.body.dueDate).toISOString();
    }
    if (validated.body.completedAt) {
      updateData["completedAt"] = new Date(validated.body.completedAt).toISOString();
    }

    await tasksStorage.updateTask(taskId, userId, updateData);

    // Record action for AI training if significant changes
    if (
      originalTask.approvalStatus === "pending_approval" &&
      validated.body.approvalStatus === "approved"
    ) {
      await tasksStorage.createTaskAction(userId, {
        momentumId: taskId,
        action: "edited",
        previousData: originalTask,
        newData: updateData,
      });
    }

    const task = await tasksStorage.getTask(taskId, userId);
    return apiResponse.success({ task });
  } catch (error) {
    await logger.error(
      "Error updating task",
      {
        operation: "tasks.update",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          taskId,
        },
      },
      ensureError(error),
    );
    return apiResponse.error("internal_server_error", "INTERNAL_ERROR");
  }
});

export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "tasks_delete" },
  validation: {
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const apiResponse = new ApiResponseBuilder("tasks.delete", requestId);
  const { taskId } = validated.params;

  try {
    const task = await tasksStorage.getTask(taskId, userId);
    if (!task) {
      return apiResponse.error("task_not_found", "NOT_FOUND");
    }

    // Record deletion action for AI training
    await tasksStorage.createTaskAction(userId, {
      momentumId: taskId,
      action: "deleted",
      previousData: task,
      newData: null,
    });

    await tasksStorage.deleteTask(taskId, userId);
    return apiResponse.success({ success: true });
  } catch (error) {
    await logger.error(
      "Error deleting task",
      {
        operation: "tasks.delete",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          taskId,
        },
      },
      ensureError(error),
    );
    return apiResponse.error("internal_server_error", "INTERNAL_ERROR");
  }
});
