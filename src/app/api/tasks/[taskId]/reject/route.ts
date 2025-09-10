import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { MomentumStorage } from "@/server/storage/momentum.storage";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { z } from "zod";

const momentumStorage = new MomentumStorage();

const RejectTaskSchema = z.object({
  notes: z.string().optional(),
});

const ParamsSchema = z.object({
  taskId: z.string(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "tasks_reject" },
  validation: {
    body: RejectTaskSchema,
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const apiResponse = new ApiResponseBuilder("tasks.reject", requestId);

  const { taskId } = validated.params;

  try {
    await momentumStorage.rejectTask(taskId, userId, validated.body.notes);
    const task = await momentumStorage.getMomentum(taskId, userId);
    return apiResponse.success({ task, message: "Task rejected successfully" });
  } catch (error) {
    await logger.error(
      "Task rejection failed",
      {
        operation: "api.tasks.reject",
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
