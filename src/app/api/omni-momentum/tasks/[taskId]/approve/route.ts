import { momentumService } from "@/server/services/momentum.service";
import { TaskSchema } from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * Task Approval API Route
 *
 * POST /api/omni-momentum/tasks/[taskId]/approve
 * Approves an AI-generated task, changing its status from pending_approval to approved
 * This is part of the AI workflow where users review and approve suggested tasks
 */

export const POST = async (req: Request, { params }: { params: { taskId: string } }) => {
  try {
    // Lazy import to avoid circular dependencies
    const { getServerUserId } = await import("@/server/auth/user");

    const userId = await getServerUserId();

    // Validate taskId from URL params
    const taskId = z.string().uuid().parse(params.taskId);

    // Approve task using service
    const approvedTask = await momentumService.approveTask(taskId, userId);

    if (!approvedTask) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        headers: { "content-type": "application/json" },
        status: 404,
      });
    }

    // Validate response
    const validated = TaskSchema.parse(approvedTask);

    return new Response(JSON.stringify(validated), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: error.issues,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 400,
        },
      );
    }

    // Handle auth errors
    if (error instanceof Error && "status" in error && error.status === 401) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      });
    }

    // Re-throw unexpected errors to be handled by global error boundary
    throw error;
  }
};
