/**
 * AI Service to Select Top 3 Priority Tasks
 *
 * Uses LLM to analyze all tasks and select the top 3 based on:
 * - Value to user's life/business
 * - Urgency and importance
 * - Context-aware priority assessment
 */

import { generateText } from "@/server/ai/core/llm.service";
import { logger } from "@/lib/observability";
import { z } from "zod";
import type { Task } from "@/server/db/schema";

// Schema for the LLM response - now ranks ALL tasks
const PriorityTasksResponseSchema = z.object({
  rankedTasks: z.array(
    z.object({
      taskId: z.string().uuid(),
      ranking: z.number().int(),
      reasoning: z.string(),
      aiScore: z.number(),
    }),
  ),
  summary: z.string(),
  confidenceLevel: z.enum(["high", "medium", "low"]),
});

type PriorityTasksResponse = z.infer<typeof PriorityTasksResponseSchema>;

/**
 * Build prompt for selecting top 3 priority tasks
 */
function buildPrioritySelectionPrompt(
  tasks: Task[],
): Array<{ role: "system" | "user"; content: string }> {
  const tasksList = tasks
    .map((task) => {
      const details =
        typeof task.details === "object" && task.details !== null
          ? (task.details as Record<string, unknown>)
          : {};
      const notes = typeof details.notes === "string" ? details.notes : "";

      return `- ID: ${task.id}
  Name: ${task.name}
  Priority: ${task.priority}
  Status: ${task.status}
  Due Date: ${task.dueDate || "None"}
  Notes: ${notes || "None"}
  Project: ${task.projectId || "Standalone"}
  Zone: ${task.zoneId || "None"}`;
    })
    .join("\n\n");

  return [
    {
      role: "system" as const,
      content: `You are an AI productivity coach for wellness practitioners. Your job is to analyze all available tasks and select the top 3 that will provide the most value to the user's life and business.

**CRITERIA FOR SELECTION:**
1. **Business Impact**: Will completing this task directly help the user run their business better?
2. **Client Impact**: Will this task improve client care or experience?
3. **Time Sensitivity**: Does this task have a deadline or is it time-sensitive?
4. **Energy Impact**: Can this task be completed efficiently with the user's current energy level?
5. **Outcome Value**: What value does the desired outcome add to the user's life or business?

**IMPORTANT RULES:**
- Select exactly 3 tasks
- Base your selection on ACTUAL VALUE, not just urgency
- Consider ALL tasks regardless of project or zone
- Use the task ID to reference each selected task
- Provide clear reasoning for each selection

**OUTPUT FORMAT:**
Return a JSON object with this exact structure:
{
  "top3Tasks": [
    {
      "taskId": "uuid-of-task",
      "reasoning": "Why this task is a top priority",
      "priority": "low|medium|high|urgent"
    }
  ],
  "summary": "Brief summary of why these 3 tasks were selected"
}`,
    },
    {
      role: "user" as const,
      content: `Please analyze these tasks and select the top 3 priorities that will add the most value to my business and life:

${tasksList}

Remember: Focus on VALUE and OUTCOMES, not just urgency. Help me make the biggest impact with my time.`,
    },
  ];
}

/**
 * Select top 3 priority tasks using LLM
 */
export async function selectTop3PriorityTasks(
  userId: string,
  tasks: Task[],
): Promise<PriorityTasksResponse> {
  // If there are 3 or fewer tasks, return them all
  if (tasks.length <= 3) {
    return {
      top3Tasks: tasks.map((task) => ({
        taskId: task.id,
        reasoning: "One of your few tasks - important to complete",
        priority: task.priority,
      })),
      summary: `You have ${tasks.length} task${tasks.length === 1 ? "" : "s"} to focus on.`,
    };
  }

  // Build prompt
  const messages = buildPrioritySelectionPrompt(tasks);

  await logger.info("Selecting top 3 priority tasks", {
    operation: "select_priority_tasks",
    additionalData: {
      userId,
      totalTasks: tasks.length,
    },
  });

  try {
    // Use a cheap model for this task
    const response = await generateText<PriorityTasksResponse>(userId, {
      model: "gpt-4o-mini", // Cheap model
      messages,
      temperature: 0.3, // Lower temperature for more consistent results
      maxTokens: 500,
    });

    // Validate the response
    const validatedResult = PriorityTasksResponseSchema.parse(response.data);

    await logger.info("Top 3 priority tasks selected", {
      operation: "select_priority_tasks",
      additionalData: {
        userId,
        selectedTasks: validatedResult.top3Tasks.length,
      },
    });

    return validatedResult;
  } catch (error) {
    await logger.error("Failed to select priority tasks", {
      operation: "select_priority_tasks",
      additionalData: {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Fallback: return first 3 tasks by priority
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return {
      top3Tasks: sortedTasks.slice(0, 3).map((task) => ({
        taskId: task.id,
        reasoning: "Selected by priority fallback",
        priority: task.priority,
      })),
      summary: "Selected based on priority levels",
    };
  }
}
