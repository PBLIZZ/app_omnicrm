import { handleGetWithQueryAuth } from "@/lib/api";
import { selectTop3PriorityTasks } from "@/server/ai/momentum/select-priority-tasks";
import { createProductivityRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { TaskSchema } from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * GET /api/omni-momentum/tasks/top3
 *
 * Returns the top 3 priority tasks selected by AI based on value to user's life/business
 */

// Response schema
const Top3TasksResponseSchema = z.object({
  tasks: z.array(TaskSchema),
  summary: z.string(),
});

// Empty query schema (no query params needed)
const EmptyQuerySchema = z.object({});

export const GET = handleGetWithQueryAuth(
  EmptyQuerySchema,
  Top3TasksResponseSchema,
  async (_query, userId) => {
    // Get all tasks
    const db = await getDb();
    const repo = createProductivityRepository(db);
    const tasks = await repo.getTasks(userId);

    // Filter to active tasks only
    const activeTasks = tasks.filter(
      (task) => task.status !== "done" && task.status !== "canceled",
    );

    // If no active tasks, return empty array
    if (activeTasks.length === 0) {
      return {
        tasks: [],
        summary: "No active tasks to focus on",
      };
    }

    // Use AI to select top 3 priority tasks
    const result = await selectTop3PriorityTasks(userId, activeTasks);

    // Map task IDs to full task objects
    const top3Tasks = result.top3Tasks
      .map((selection) => {
        const task = activeTasks.find((t) => t.id === selection.taskId);
        return task;
      })
      .filter((task): task is NonNullable<typeof task> => task !== undefined);

    return {
      tasks: top3Tasks,
      summary: result.summary,
    };
  },
);
