import { handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { TaskSchema } from "@/server/db/business-schemas";
import { productivityService } from "@/server/services/productivity.service";
import { z } from "zod";

const TaskRejectionInputSchema = z.object({
  deleteTask: z.boolean().optional().default(false),
  reason: z.string().optional(),
});

const TaskRejectionResponseSchema = z.union([
  TaskSchema,
  z.object({
    success: z.boolean(),
    deleted: z.boolean(),
  }),
]);

const TaskIdParamsSchema = z.object({
  taskId: z.string().uuid(),
});

interface RouteParams {
  params: { taskId: string };
}

export async function POST(request: Request, context: RouteParams): Promise<Response> {
  const handler = handleAuth(
    TaskRejectionInputSchema,
    TaskRejectionResponseSchema,
    async (data, userId) => {
      const { taskId } = TaskIdParamsSchema.parse(context.params);

      const existingTask = await productivityService.getTask(taskId, userId);
      if (!existingTask.success) {
        throw ApiError.internalServerError(
          existingTask.error.message,
          existingTask.error.details,
        );
      }

      if (!existingTask.data) {
        throw ApiError.notFound("Task not found");
      }

      if (data.deleteTask) {
        const deleteResult = await productivityService.deleteTask(taskId, userId);
        if (!deleteResult.success) {
          throw ApiError.internalServerError(
            deleteResult.error.message,
            deleteResult.error.details,
          );
        }

        return { success: true, deleted: true } as const;
      }

      const baseDetails =
        existingTask.data.details && typeof existingTask.data.details === "object"
          ? existingTask.data.details
          : {};

      const updatedDetails =
        data.reason && data.reason.length > 0
          ? {
              ...baseDetails,
              rejectionReason: data.reason,
              rejectedAt: new Date().toISOString(),
            }
          : baseDetails;

      const updateResult = await productivityService.updateTask(taskId, userId, {
        status: "canceled",
        details: updatedDetails,
      });

      if (!updateResult.success) {
        throw ApiError.internalServerError(
          updateResult.error.message,
          updateResult.error.details,
        );
      }

      if (!updateResult.data) {
        throw ApiError.notFound("Failed to reject task");
      }

      return updateResult.data;
    },
  );

  return handler(request);
}
