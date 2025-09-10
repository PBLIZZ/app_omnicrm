import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { tasksStorage } from "@/server/storage/momentum.storage";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { z } from "zod";

const ApproveTaskSchema = z.object({
  notes: z.string().optional(),
});

const ParamsSchema = z.object({
  taskId: z.string(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "tasks_approve" },
  validation: {
    body: ApproveTaskSchema,
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const apiResponse = new ApiResponseBuilder("tasks.approve", requestId);

  const { taskId } = validated.params;

  try {
    await tasksStorage.approveTask(taskId, userId, validated.body.notes);
    const task = await tasksStorage.getTask(taskId, userId);
    return apiResponse.success({ task, message: "Task approved successfully" });
  } catch (error) {
    await logger.error(
      "Task approval failed",
      {
        operation: "api.tasks.approve",
        additionalData: {
          taskId: taskId.slice(0, 8) + "...",
          userId: userId.slice(0, 8) + "...",
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      ensureError(error),
    );
    return apiResponse.error("internal_server_error", "INTERNAL_ERROR");
  }
});
