import { handleAuth } from "@/lib/api";
import { momentumRepository } from "@repo";
import { TaskSchema } from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * Task Rejection API Route
 *
 * POST /api/omni-momentum/tasks/[taskId]/reject
 * Rejects an AI-generated task, changing its status from pending_approval to rejected
 * Rejected tasks can be optionally deleted or kept for AI learning purposes
 */

const TaskRejectionInputSchema = z.object({
  taskId: z.string().uuid(),
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

export const POST = handleAuth(
  TaskRejectionInputSchema,
  TaskRejectionResponseSchema,
  async (data, userId): Promise<z.infer<typeof TaskRejectionResponseSchema>> => {
    // Get the task to ensure it exists and belongs to the user
    const task = await momentumRepository.getTask(data.taskId, userId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (data.deleteTask) {
      // Delete the task entirely
      await momentumRepository.deleteTask(data.taskId, userId);
      return { success: true, deleted: true };
    } else {
      // Update task to rejected status (keep for AI learning)
      await momentumRepository.updateTask(data.taskId, userId, {
        status: "canceled", // Move to cancelled status
      });

      // Get the updated task to return
      const updatedTask = await momentumRepository.getTask(data.taskId, userId);
      if (!updatedTask) {
        throw new Error("Failed to reject task");
      }

      return updatedTask;
    }
  }
);
