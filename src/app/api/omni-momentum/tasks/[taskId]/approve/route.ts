import { handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { TaskSchema } from "@/server/db/business-schemas";
import { approveTaskService } from "@/server/services/productivity.service";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleAuth(
    z.void(),
    TaskSchema,
    async (_, userId): Promise<z.infer<typeof TaskSchema>> => {
      try {
        const approvedTask = await approveTaskService(userId, params.taskId);

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
  )(request);
}
