import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { getSubtasksService, updateTaskService } from "@/server/services/productivity.service";
import { TaskFiltersSchema } from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * Subtasks Management API Route
 *
 * NOTE: Subtasks are now stored in details.subtasks JSONB array.
 * They are lightweight objects (id, title, completed), not full Task records.
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET with query params
 * ✅ handleAuth for POST operations
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: Promise<{
    taskId: string;
  }>;
}

// Subtask schema for lightweight JSONB objects
const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  duration: z.string().optional(),
});

const CreateSubtaskSchema = z.object({
  title: z.string().min(1),
});

/**
 * GET /api/omni-momentum/tasks/[taskId]/subtasks - Get subtasks from parent task's details
 */
export async function GET(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleGetWithQueryAuth(
    TaskFiltersSchema,
    z.array(SubtaskSchema),
    async (_, userId) => {
      const result = await getSubtasksService(userId, params.taskId);
      return result.subtasks;
    },
  )(request);
}

/**
 * POST /api/omni-momentum/tasks/[taskId]/subtasks - Add subtask to parent's details.subtasks array
 */
export async function POST(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleAuth(
    CreateSubtaskSchema,
    SubtaskSchema,
    async (data, userId) => {
      // Get parent task first
      const result = await getSubtasksService(userId, params.taskId);
      const parentTask = result.parentTask;

      // Create new subtask object
      const newSubtask = {
        id: crypto.randomUUID(),
        title: data.title,
        completed: false,
      };

      // Get existing subtasks
      const existingSubtasks = result.subtasks;

      // Update parent task with new subtasks array
      await updateTaskService(userId, params.taskId, {
        details: {
          ...(typeof parentTask.details === "object" ? parentTask.details : {}),
          subtasks: [...existingSubtasks, newSubtask],
        },
      });

      return newSubtask;
    },
  )(request);
}
