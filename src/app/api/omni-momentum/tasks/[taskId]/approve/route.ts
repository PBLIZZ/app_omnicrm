import { handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { TaskSchema } from "@/server/db/business-schemas";
import { productivityService } from "@/server/services/productivity.service";
import { z } from "zod";

const TaskIdParamsSchema = z.object({
  taskId: z.string().uuid(),
});

interface RouteParams {
  params: { taskId: string };
}

export async function POST(request: Request, context: RouteParams): Promise<Response> {
  const handler = handleAuth(
    z.void(),
    TaskSchema,
    async (_: void, userId) => {
      const { taskId } = TaskIdParamsSchema.parse(context.params);

      try {
        const approvedTask = await productivityService.approveTask(taskId, userId);

        if (!approvedTask) {
          throw ApiError.notFound("Task not found");
        }

        return approvedTask;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        throw ApiError.internalServerError("Failed to approve task", error);
      }
    },
  );

  return handler(request);
}
