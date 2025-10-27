/**
 * Task & Productivity Tools
 *
 * AI-callable tools for task management, projects, and productivity workflows.
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { createProductivityRepository } from "@/packages/repo/src/productivity.repo";
import { AppError } from "@/lib/errors";

// ============================================================================
// TOOL: get_today_tasks
// ============================================================================

const GetTodayTasksParamsSchema = z.object({
  include_completed: z.boolean().default(false),
});

type GetTodayTasksParams = z.infer<typeof GetTodayTasksParamsSchema>;

export const getTodayTasksDefinition: ToolDefinition = {
  name: "get_today_tasks",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve all tasks due today or overdue. Optionally include completed tasks. Returns tasks ordered by priority (urgent → high → medium → low).",
  useCases: [
    "When user asks 'what\\'s on my plate today?'",
    "When user wants to 'show me my tasks for today'",
    "When preparing daily planning or standup",
    "When checking progress on today\\'s priorities",
  ],
  exampleCalls: [
    'get_today_tasks({"include_completed": false})',
    'get_today_tasks({"include_completed": true})',
  ],
  parameters: {
    type: "object",
    properties: {
      include_completed: {
        type: "boolean",
        description: "Whether to include completed tasks (default false)",
      },
    },
    required: [],
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60, // 1 minute cache for active task list
  tags: ["tasks", "productivity", "read", "daily-planning"],
};

export const getTodayTasksHandler: ToolHandler<GetTodayTasksParams> = async (
  params,
  context,
) => {
  const validated = GetTodayTasksParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = await repo.listTasks(context.userId, {
    dueDateBefore: today,
    includeCompleted: validated.include_completed,
    sortBy: "priority",
  });

  return {
    tasks,
    count: tasks.length,
    date: today.toISOString().split("T")[0],
  };
};

// ============================================================================
// TOOL: create_task
// ============================================================================

const CreateTaskParamsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  due_date: z.coerce.date().optional(),
  project_id: z.string().uuid().optional(),
  zone_uuid: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

type CreateTaskParams = z.infer<typeof CreateTaskParamsSchema>;

export const createTaskDefinition: ToolDefinition = {
  name: "create_task",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Create a new task with optional project assignment, zone categorization, and contact linking. Returns the newly created task.",
  useCases: [
    "When user says 'add task to call Sarah tomorrow'",
    "When user wants to 'create high priority task for client follow-up'",
    "When capturing action items from a meeting",
    "When user dictates 'remind me to review proposal by Friday'",
  ],
  exampleCalls: [
    'create_task({"title": "Call Sarah about wellness consultation", "priority": "high", "due_date": "2025-01-15"})',
    'create_task({"title": "Review new client intake form", "description": "Check health history section"})',
    'create_task({"title": "Prepare session notes", "contact_id": "123...", "priority": "urgent"})',
  ],
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Short, actionable task name (required)",
      },
      description: {
        type: "string",
        description: "Detailed task description or notes",
      },
      priority: {
        type: "string",
        description: "Task priority level (default: medium)",
        enum: ["low", "medium", "high", "urgent"],
      },
      due_date: {
        type: "string",
        description: "Due date in ISO format (YYYY-MM-DD)",
      },
      project_id: {
        type: "string",
        description: "UUID of project this task belongs to",
      },
      zone_uuid: {
        type: "string",
        description: "UUID of wellness zone (Life, Business, etc.)",
      },
      contact_id: {
        type: "string",
        description: "UUID of related contact/client",
      },
      tags: {
        type: "array",
        description: "Array of tag names for categorization",
        items: { type: "string" },
      },
    },
    required: ["title"],
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: false,
  rateLimit: {
    maxCalls: 100,
    windowMs: 60000, // 100 tasks per minute
  },
  tags: ["tasks", "productivity", "create", "write"],
};

export const createTaskHandler: ToolHandler<CreateTaskParams> = async (params, context) => {
  const validated = CreateTaskParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  const task = await repo.createTask(context.userId, {
    name: validated.title,
    details: validated.description ? { description: validated.description } : {},
    priority: validated.priority,
    dueDate: validated.due_date ?? null,
    projectId: validated.project_id ?? null,
    zoneUuid: validated.zone_uuid ?? null,
    status: "todo",
  });

  // If tags provided, add them (would need tag service integration)
  // Future enhancement: await tagService.addTaskTags(task.id, validated.tags)

  return task;
};

// ============================================================================
// TOOL: complete_task
// ============================================================================

const CompleteTaskParamsSchema = z.object({
  task_id: z.string().uuid(),
  completion_notes: z.string().optional(),
});

type CompleteTaskParams = z.infer<typeof CompleteTaskParamsSchema>;

export const completeTaskDefinition: ToolDefinition = {
  name: "complete_task",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Mark a task as completed with optional completion notes. Records completion timestamp and updates task status to 'done'.",
  useCases: [
    "When user says 'mark task as done'",
    "When user reports 'I finished calling Sarah'",
    "When checking off items from daily task list",
    "When confirming action item completion",
  ],
  exampleCalls: [
    'complete_task({"task_id": "123..."})',
    'complete_task({"task_id": "123...", "completion_notes": "Successfully scheduled for next week"})',
  ],
  parameters: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "UUID of task to complete",
      },
      completion_notes: {
        type: "string",
        description: "Optional notes about task completion",
      },
    },
    required: ["task_id"],
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  tags: ["tasks", "productivity", "update", "write"],
};

export const completeTaskHandler: ToolHandler<CompleteTaskParams> = async (params, context) => {
  const validated = CompleteTaskParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  const task = await repo.updateTask(context.userId, validated.task_id, {
    status: "done",
    completedAt: new Date(),
    details: validated.completion_notes
      ? { completionNotes: validated.completion_notes }
      : undefined,
  });

  if (!task) {
    throw new AppError(
      `Task with ID ${validated.task_id} not found`,
      "TASK_NOT_FOUND",
      "not_found",
      true,
      404,
    );
  }

  return task;
};

// ============================================================================
// TOOL: search_tasks
// ============================================================================

const SearchTasksParamsSchema = z.object({
  query: z.string().min(1),
  status: z.enum(["todo", "in_progress", "done", "canceled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  contact_id: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).default(20),
});

type SearchTasksParams = z.infer<typeof SearchTasksParamsSchema>;

export const searchTasksDefinition: ToolDefinition = {
  name: "search_tasks",
  category: "data_access",
  version: "1.0.0",
  description:
    "Search tasks by text query with optional filters for status, priority, and contact. Searches task titles and descriptions.",
  useCases: [
    "When user asks 'find all tasks related to Sarah'",
    "When user wants to 'show me high priority tasks'",
    "When looking for specific task by keyword",
    "When filtering tasks by completion status",
  ],
  exampleCalls: [
    'search_tasks({"query": "client intake", "status": "todo"})',
    'search_tasks({"query": "Sarah", "priority": "high"})',
    'search_tasks({"query": "follow-up", "contact_id": "123..."})',
  ],
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search text (task name or description)",
      },
      status: {
        type: "string",
        description: "Filter by task status",
        enum: ["todo", "in_progress", "done", "canceled"],
      },
      priority: {
        type: "string",
        description: "Filter by priority level",
        enum: ["low", "medium", "high", "urgent"],
      },
      contact_id: {
        type: "string",
        description: "Filter by related contact UUID",
      },
      limit: {
        type: "number",
        description: "Maximum results (default 20, max 100)",
      },
    },
    required: ["query"],
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 30,
  tags: ["tasks", "productivity", "search", "read"],
};

export const searchTasksHandler: ToolHandler<SearchTasksParams> = async (params, context) => {
  const validated = SearchTasksParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  const tasks = await repo.searchTasks(context.userId, {
    query: validated.query,
    status: validated.status,
    priority: validated.priority,
    contactId: validated.contact_id,
    limit: validated.limit,
  });

  return {
    tasks,
    count: tasks.length,
    query: validated.query,
  };
};

// ============================================================================
// TOOL: get_overdue_tasks
// ============================================================================

const GetOverdueTasksParamsSchema = z.object({
  limit: z.number().int().positive().max(100).default(50),
});

type GetOverdueTasksParams = z.infer<typeof GetOverdueTasksParamsSchema>;

export const getOverdueTasksDefinition: ToolDefinition = {
  name: "get_overdue_tasks",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve all tasks that are past their due date and not yet completed. Returns tasks ordered by how overdue they are (oldest first).",
  useCases: [
    "When user asks 'what tasks am I behind on?'",
    "When user wants to 'show me overdue items'",
    "When prioritizing catch-up work",
    "When reviewing missed deadlines",
  ],
  exampleCalls: ['get_overdue_tasks({"limit": 20})', "get_overdue_tasks({})"],
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of overdue tasks to return (max 100)",
      },
    },
    required: [],
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60,
  tags: ["tasks", "productivity", "read", "overdue"],
};

export const getOverdueTasksHandler: ToolHandler<GetOverdueTasksParams> = async (
  params,
  context,
) => {
  const validated = GetOverdueTasksParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = await repo.listTasks(context.userId, {
    dueDateBefore: today,
    status: "todo", // Only incomplete tasks
    limit: validated.limit,
    sortBy: "dueDate",
    sortOrder: "asc", // Oldest overdue first
  });

  return {
    tasks,
    count: tasks.length,
    asOfDate: today.toISOString().split("T")[0],
  };
};
