import { handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { TaskSchema } from "@/server/db/business-schemas";
import {
  getTaskService,
  deleteTaskService,
  updateTaskService,
} from "@/server/services/productivity.service";
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
    async (data, userId): Promise<z.infer<typeof TaskRejectionResponseSchema>> => {
      const { taskId } = TaskIdParamsSchema.parse(context.params);

      const existingTask = await getTaskService(userId, taskId);
      if (!existingTask) {
        throw ApiError.notFound("Task not found");
      }

      if (data.deleteTask) {
        await deleteTaskService(userId, taskId);
        return { success: true, deleted: true } as const;
      }

      const baseDetails =
        existingTask.details && typeof existingTask.details === "object"
          ? existingTask.details
          : {};

      const updatedDetails =
        data.reason && data.reason.length > 0
          ? {
              ...baseDetails,
              rejectionReason: data.reason,
              rejectedAt: new Date().toISOString(),
            }
          : baseDetails;

      const updatedTask = await updateTaskService(userId, taskId, {
        status: "canceled",
        details: updatedDetails,
      });

      if (!updatedTask) {
        throw ApiError.notFound("Failed to reject task");
      }

      return updatedTask;
    },
  );

  return handler(request);
}
