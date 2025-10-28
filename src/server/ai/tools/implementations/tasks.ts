/**
 * Task & Productivity Tools
 *
 * AI-callable tools for task management, projects, and productivity workflows.
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { createProductivityRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";

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
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60, // 1 minute cache for active task list
  deprecated: false,
  tags: ["tasks", "productivity", "read", "daily-planning"],
};

export const getTodayTasksHandler: ToolHandler<GetTodayTasksParams> = async (params, context) => {
  const validated = GetTodayTasksParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all incomplete tasks (or all tasks if include_completed is true)
  const statusFilter = validated.include_completed ? undefined : ["todo", "in_progress"];

  const tasks = await repo.getTasks(context.userId, {
    status: statusFilter,
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
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_date: z.string().optional(), // ISO date string (YYYY-MM-DD)
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
        enum: ["low", "medium", "high"],
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
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: false,
  cacheable: false,
  deprecated: false,
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
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  tags: ["tasks", "productivity", "update", "write"],
};

export const completeTaskHandler: ToolHandler<CompleteTaskParams> = async (params, context) => {
  const validated = CompleteTaskParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  // First get the task to verify it exists
  const task = await repo.getTask(validated.task_id, context.userId);

  if (!task) {
    throw new AppError(
      `Task with ID ${validated.task_id} not found`,
      "TASK_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Update the task
  await repo.updateTask(validated.task_id, context.userId, {
    status: "done",
    completedAt: new Date(),
    details: validated.completion_notes
      ? { completionNotes: validated.completion_notes }
      : task.details,
  });

  // Return the updated task
  return await repo.getTask(validated.task_id, context.userId);
};

// ============================================================================
// TOOL: search_tasks
// ============================================================================

const SearchTasksParamsSchema = z.object({
  query: z.string().min(1),
  status: z.enum(["todo", "in_progress", "done", "canceled"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
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
        enum: ["low", "medium", "high"],
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
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 30,
  deprecated: false,
  tags: ["tasks", "productivity", "search", "read"],
};

export const searchTasksHandler: ToolHandler<SearchTasksParams> = async (params, context) => {
  const validated = SearchTasksParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  // Get tasks with filters
  const statusFilter = validated.status ? [validated.status] : undefined;
  const priorityFilter = validated.priority ? [validated.priority] : undefined;

  const allTasks = await repo.getTasks(context.userId, {
    status: statusFilter,
    priority: priorityFilter,
  });

  // Filter by query text (search in name and details)
  const query = validated.query.toLowerCase();
  const filteredTasks = allTasks.filter(task => {
    const nameMatch = task.name.toLowerCase().includes(query);
    const detailsMatch = task.details && typeof task.details === 'object' &&
      'description' in task.details &&
      typeof task.details.description === 'string' &&
      task.details.description.toLowerCase().includes(query);
    return nameMatch || detailsMatch;
  });

  // Limit results
  const tasks = filteredTasks.slice(0, validated.limit);

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
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60,
  deprecated: false,
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
  const todayString = today.toISOString().split("T")[0];
  if (!todayString) {
    throw new AppError("Failed to format today's date", "DATE_ERROR", "system", false, 500);
  }

  // Get all incomplete tasks
  const allTasks = await repo.getTasks(context.userId, {
    status: ["todo", "in_progress"],
  });

  // Filter for overdue tasks (due date before today)
  const overdueTasks = allTasks
    .filter(task => task.dueDate !== null && task.dueDate < todayString)
    .sort((a, b) => {
      // Sort by due date ascending (oldest overdue first)
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, validated.limit);

  return {
    tasks: overdueTasks,
    count: overdueTasks.length,
    asOfDate: todayString,
  };
};

// ============================================================================
// TOOL: create_project
// ============================================================================

const CreateProjectParamsSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).default("active"),
  due_date: z.string().optional(), // ISO date string (YYYY-MM-DD)
  zone_uuid: z.string().uuid().optional(),
});

type CreateProjectParams = z.infer<typeof CreateProjectParamsSchema>;

export const createProjectDefinition: ToolDefinition = {
  name: "create_project",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Create a new project (pathway) to organize related tasks. Projects can be assigned to zones for categorization and have due dates for goal tracking.",
  useCases: [
    "When user says 'create project for new wellness program'",
    "When user wants to 'start tracking client retreat planning'",
    "When organizing multiple related tasks under one initiative",
    "When user needs 'new project for Q1 business goals'",
  ],
  exampleCalls: [
    'create_project({"name": "Q1 Wellness Program", "status": "active", "due_date": "2025-03-31"})',
    'create_project({"name": "Client Retreat Planning", "description": "Summer retreat for wellness clients"})',
    'create_project({"name": "Website Redesign", "zone_uuid": "123...", "status": "active"})',
  ],
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Project name (required)",
      },
      description: {
        type: "string",
        description: "Detailed project description",
      },
      status: {
        type: "string",
        description: "Project status (default: active)",
        enum: ["active", "on_hold", "completed", "archived"],
      },
      due_date: {
        type: "string",
        description: "Project due date in ISO format (YYYY-MM-DD)",
      },
      zone_uuid: {
        type: "string",
        description: "UUID of wellness zone for categorization",
      },
    },
    required: ["name"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: false,
  cacheable: false,
  deprecated: false,
  rateLimit: {
    maxCalls: 50,
    windowMs: 60000, // 50 projects per minute
  },
  tags: ["projects", "productivity", "create", "write"],
};

export const createProjectHandler: ToolHandler<CreateProjectParams> = async (params, context) => {
  const validated = CreateProjectParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  const project = await repo.createProject(context.userId, {
    name: validated.name,
    status: validated.status,
    dueDate: validated.due_date ?? null,
    zoneUuid: validated.zone_uuid ?? null,
    details: validated.description ? { description: validated.description } : {},
  });

  return project;
};

// ============================================================================
// TOOL: list_projects
// ============================================================================

const ListProjectsParamsSchema = z.object({
  status: z.array(z.enum(["active", "on_hold", "completed", "archived"])).optional(),
  zone_uuid: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).default(50),
});

type ListProjectsParams = z.infer<typeof ListProjectsParamsSchema>;

export const listProjectsDefinition: ToolDefinition = {
  name: "list_projects",
  category: "data_access",
  version: "1.0.0",
  description:
    "List all projects with optional filters for status and zone. Returns projects ordered by last updated date (newest first).",
  useCases: [
    "When user asks 'show me all my projects'",
    "When user wants to 'list active projects'",
    "When reviewing project portfolio",
    "When filtering projects by business vs life zones",
  ],
  exampleCalls: [
    'list_projects({"status": ["active", "on_hold"]})',
    'list_projects({"zone_uuid": "123...", "limit": 20})',
    "list_projects({})",
  ],
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "array",
        description: "Filter by project status (multiple allowed)",
        items: {
          type: "string",
          enum: ["active", "on_hold", "completed", "archived"],
        },
      },
      zone_uuid: {
        type: "string",
        description: "Filter by zone UUID",
      },
      limit: {
        type: "number",
        description: "Maximum results (default 50, max 100)",
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60,
  deprecated: false,
  tags: ["projects", "productivity", "read", "list"],
};

export const listProjectsHandler: ToolHandler<ListProjectsParams> = async (params, context) => {
  const validated = ListProjectsParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  const projects = await repo.getProjects(context.userId, {
    status: validated.status,
    zoneUuid: validated.zone_uuid,
  });

  // Apply limit
  const limitedProjects = projects.slice(0, validated.limit);

  return {
    projects: limitedProjects,
    count: limitedProjects.length,
    totalCount: projects.length,
  };
};

// ============================================================================
// TOOL: assign_task_to_project
// ============================================================================

const AssignTaskToProjectParamsSchema = z.object({
  task_id: z.string().uuid(),
  project_id: z.string().uuid(),
});

type AssignTaskToProjectParams = z.infer<typeof AssignTaskToProjectParamsSchema>;

export const assignTaskToProjectDefinition: ToolDefinition = {
  name: "assign_task_to_project",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Link a task to a project. This creates the relationship between a task and its parent project for better organization and tracking.",
  useCases: [
    "When user says 'add this task to the Q1 project'",
    "When user wants to 'move task to website redesign project'",
    "When organizing existing tasks under a project",
    "When user needs to 'link task to project'",
  ],
  exampleCalls: [
    'assign_task_to_project({"task_id": "123...", "project_id": "456..."})',
  ],
  parameters: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "UUID of task to assign",
      },
      project_id: {
        type: "string",
        description: "UUID of project to assign task to",
      },
    },
    required: ["task_id", "project_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  tags: ["tasks", "projects", "productivity", "update", "write"],
};

export const assignTaskToProjectHandler: ToolHandler<AssignTaskToProjectParams> = async (
  params,
  context,
) => {
  const validated = AssignTaskToProjectParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  // Verify task exists
  const task = await repo.getTask(validated.task_id, context.userId);
  if (!task) {
    throw new AppError(
      `Task with ID ${validated.task_id} not found`,
      "TASK_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Verify project exists
  const project = await repo.getProject(validated.project_id, context.userId);
  if (!project) {
    throw new AppError(
      `Project with ID ${validated.project_id} not found`,
      "PROJECT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Update task with project_id
  await repo.updateTask(validated.task_id, context.userId, {
    projectId: validated.project_id,
  });

  return {
    success: true,
    taskId: validated.task_id,
    projectId: validated.project_id,
    projectName: project.name,
  };
};

// ============================================================================
// TOOL: get_project_tasks
// ============================================================================

const GetProjectTasksParamsSchema = z.object({
  project_id: z.string().uuid(),
  include_completed: z.boolean().default(false),
});

type GetProjectTasksParams = z.infer<typeof GetProjectTasksParamsSchema>;

export const getProjectTasksDefinition: ToolDefinition = {
  name: "get_project_tasks",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve all tasks associated with a specific project. Optionally include completed tasks. Returns tasks ordered by priority.",
  useCases: [
    "When user asks 'what tasks are in the Q1 project?'",
    "When user wants to 'show me all website redesign tasks'",
    "When reviewing project progress and task breakdown",
    "When user needs 'list tasks for project'",
  ],
  exampleCalls: [
    'get_project_tasks({"project_id": "123...", "include_completed": false})',
    'get_project_tasks({"project_id": "456...", "include_completed": true})',
  ],
  parameters: {
    type: "object",
    properties: {
      project_id: {
        type: "string",
        description: "UUID of project to get tasks for",
      },
      include_completed: {
        type: "boolean",
        description: "Whether to include completed tasks (default false)",
      },
    },
    required: ["project_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60,
  deprecated: false,
  tags: ["tasks", "projects", "productivity", "read"],
};

export const getProjectTasksHandler: ToolHandler<GetProjectTasksParams> = async (
  params,
  context,
) => {
  const validated = GetProjectTasksParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  // Verify project exists
  const project = await repo.getProject(validated.project_id, context.userId);
  if (!project) {
    throw new AppError(
      `Project with ID ${validated.project_id} not found`,
      "PROJECT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Get tasks with optional completed filter
  const statusFilter = validated.include_completed ? undefined : ["todo", "in_progress"];

  const allTasks = await repo.getTasks(context.userId, {
    projectId: validated.project_id,
    status: statusFilter,
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
    },
    tasks: allTasks,
    count: allTasks.length,
  };
};

// ============================================================================
// TOOL: list_zones
// ============================================================================

const ListZonesParamsSchema = z.object({});

type ListZonesParams = z.infer<typeof ListZonesParamsSchema>;

export const listZonesDefinition: ToolDefinition = {
  name: "list_zones",
  category: "data_access",
  version: "1.0.0",
  description:
    "Get all available wellness zones for categorizing projects and tasks. Zones are system-defined categories like Life, Business, Health, etc.",
  useCases: [
    "When user asks 'what zones are available?'",
    "When user needs to know 'how can I categorize my projects?'",
    "When creating a new project and selecting a zone",
    "When understanding the zone system",
  ],
  exampleCalls: ["list_zones({})"],
  parameters: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 3600, // 1 hour cache for system zones
  deprecated: false,
  tags: ["zones", "productivity", "read", "system"],
};

export const listZonesHandler: ToolHandler<ListZonesParams> = async (params, _context) => {
  ListZonesParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  const zones = await repo.getZones();

  return {
    zones,
    count: zones.length,
  };
};

// ============================================================================
// TOOL: update_task
// ============================================================================

const UpdateTaskParamsSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  due_date: z.string().optional(), // ISO date string (YYYY-MM-DD)
  project_id: z.string().uuid().optional(),
  zone_uuid: z.string().uuid().optional(),
});

type UpdateTaskParams = z.infer<typeof UpdateTaskParamsSchema>;

export const updateTaskDefinition: ToolDefinition = {
  name: "update_task",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Update task fields including title, description, priority, due date, project assignment, and zone categorization. Only provided fields will be updated.",
  useCases: [
    "When user says 'change task priority to high'",
    "When user wants to 'update task due date'",
    "When rescheduling task deadlines",
    "When reassigning task to different project",
  ],
  exampleCalls: [
    'update_task({"task_id": "123...", "priority": "high"})',
    'update_task({"task_id": "123...", "title": "New task name", "due_date": "2025-02-01"})',
    'update_task({"task_id": "123...", "description": "Updated description"})',
  ],
  parameters: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "UUID of task to update",
      },
      title: {
        type: "string",
        description: "New task title",
      },
      description: {
        type: "string",
        description: "New task description",
      },
      priority: {
        type: "string",
        description: "New priority level",
        enum: ["low", "medium", "high"],
      },
      due_date: {
        type: "string",
        description: "New due date in ISO format (YYYY-MM-DD)",
      },
      project_id: {
        type: "string",
        description: "UUID of new project assignment",
      },
      zone_uuid: {
        type: "string",
        description: "UUID of new zone assignment",
      },
    },
    required: ["task_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  tags: ["tasks", "productivity", "update", "write"],
};

export const updateTaskHandler: ToolHandler<UpdateTaskParams> = async (params, context) => {
  const validated = UpdateTaskParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  // First verify task exists
  const task = await repo.getTask(validated.task_id, context.userId);
  if (!task) {
    throw new AppError(
      `Task with ID ${validated.task_id} not found`,
      "TASK_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Build update data
  const updateData: Partial<{
    name: string;
    details: unknown;
    priority: "low" | "medium" | "high";
    dueDate: string | null;
    projectId: string | null;
    zoneUuid: string | null;
  }> = {};

  if (validated.title) {
    updateData.name = validated.title;
  }

  if (validated.description !== undefined) {
    updateData.details = {
      ...(typeof task.details === "object" && task.details !== null ? task.details : {}),
      description: validated.description,
    };
  }

  if (validated.priority) {
    updateData.priority = validated.priority;
  }

  if (validated.due_date !== undefined) {
    updateData.dueDate = validated.due_date;
  }

  if (validated.project_id !== undefined) {
    updateData.projectId = validated.project_id;
  }

  if (validated.zone_uuid !== undefined) {
    updateData.zoneUuid = validated.zone_uuid;
  }

  // Update the task
  await repo.updateTask(validated.task_id, context.userId, updateData);

  // Return updated task
  return await repo.getTask(validated.task_id, context.userId);
};

// ============================================================================
// TOOL: assign_task_to_zone
// ============================================================================

const AssignTaskToZoneParamsSchema = z.object({
  task_id: z.string().uuid(),
  zone_uuid: z.string().uuid(),
});

type AssignTaskToZoneParams = z.infer<typeof AssignTaskToZoneParamsSchema>;

export const assignTaskToZoneDefinition: ToolDefinition = {
  name: "assign_task_to_zone",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Move a task to a different wellness zone (Life, Business, etc.). Updates the zone_uuid field of the task.",
  useCases: [
    "When user says 'move this task to Business zone'",
    "When reorganizing tasks by life area",
    "When user wants to 'categorize task under Life zone'",
    "When reassigning task priority zones",
  ],
  exampleCalls: [
    'assign_task_to_zone({"task_id": "123...", "zone_uuid": "456..."})',
    'assign_task_to_zone({"task_id": "task-id", "zone_uuid": "business-zone-uuid"})',
  ],
  parameters: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "UUID of task to reassign",
      },
      zone_uuid: {
        type: "string",
        description: "UUID of target wellness zone",
      },
    },
    required: ["task_id", "zone_uuid"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  tags: ["tasks", "productivity", "zone", "write"],
};

export const assignTaskToZoneHandler: ToolHandler<AssignTaskToZoneParams> = async (
  params,
  context,
) => {
  const validated = AssignTaskToZoneParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  // Verify task exists
  const task = await repo.getTask(validated.task_id, context.userId);
  if (!task) {
    throw new AppError(
      `Task with ID ${validated.task_id} not found`,
      "TASK_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Update zone assignment
  await repo.updateTask(validated.task_id, context.userId, {
    zoneUuid: validated.zone_uuid,
  });

  // Return updated task
  return await repo.getTask(validated.task_id, context.userId);
};

// ============================================================================
// TOOL: create_subtask
// ============================================================================

const CreateSubtaskParamsSchema = z.object({
  parent_task_id: z.string().uuid(),
  title: z.string().min(1),
  completed: z.boolean().default(false),
});

type CreateSubtaskParams = z.infer<typeof CreateSubtaskParamsSchema>;

export const createSubtaskDefinition: ToolDefinition = {
  name: "create_subtask",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Add a subtask under a parent task. Subtasks are stored in the task's details.subtasks array. Useful for breaking down complex tasks into smaller action items.",
  useCases: [
    "When user says 'add checklist item to this task'",
    "When breaking down complex tasks",
    "When user wants to 'add step to complete this task'",
    "When creating task breakdown structure",
  ],
  exampleCalls: [
    'create_subtask({"parent_task_id": "123...", "title": "Review documents"})',
    'create_subtask({"parent_task_id": "123...", "title": "Send follow-up email", "completed": false})',
  ],
  parameters: {
    type: "object",
    properties: {
      parent_task_id: {
        type: "string",
        description: "UUID of parent task",
      },
      title: {
        type: "string",
        description: "Subtask title/description",
      },
      completed: {
        type: "boolean",
        description: "Whether subtask is completed (default false)",
      },
    },
    required: ["parent_task_id", "title"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: false,
  cacheable: false,
  deprecated: false,
  tags: ["tasks", "productivity", "subtasks", "write"],
};

export const createSubtaskHandler: ToolHandler<CreateSubtaskParams> = async (params, context) => {
  const validated = CreateSubtaskParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  // Get parent task
  const task = await repo.getTask(validated.parent_task_id, context.userId);
  if (!task) {
    throw new AppError(
      `Task with ID ${validated.parent_task_id} not found`,
      "TASK_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Get existing subtasks or initialize empty array
  const existingDetails =
    typeof task.details === "object" && task.details !== null ? task.details : {};
  const existingSubtasks = Array.isArray(
    (existingDetails as { subtasks?: unknown }).subtasks,
  )
    ? ((existingDetails as { subtasks: unknown[] }).subtasks as Array<{
        id: string;
        title: string;
        completed: boolean;
      }>)
    : [];

  // Create new subtask
  const newSubtask = {
    id: crypto.randomUUID(),
    title: validated.title,
    completed: validated.completed,
  };

  // Update task with new subtask
  await repo.updateTask(validated.parent_task_id, context.userId, {
    details: {
      ...existingDetails,
      subtasks: [...existingSubtasks, newSubtask],
    },
  });

  return {
    success: true,
    parentTaskId: validated.parent_task_id,
    subtask: newSubtask,
    totalSubtasks: existingSubtasks.length + 1,
  };
};

// ============================================================================
// TOOL: update_task_status
// ============================================================================

const UpdateTaskStatusParamsSchema = z.object({
  task_id: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "done", "canceled"]),
  completion_notes: z.string().optional(),
});

type UpdateTaskStatusParams = z.infer<typeof UpdateTaskStatusParamsSchema>;

export const updateTaskStatusDefinition: ToolDefinition = {
  name: "update_task_status",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Update task status through workflow stages: todo → in_progress → done. Can also mark as canceled. When marking as done, automatically sets completion timestamp.",
  useCases: [
    "When user says 'start working on this task'",
    "When user reports 'I'm working on task X'",
    "When moving task to in-progress",
    "When canceling a task",
  ],
  exampleCalls: [
    'update_task_status({"task_id": "123...", "status": "in_progress"})',
    'update_task_status({"task_id": "123...", "status": "done", "completion_notes": "Finished successfully"})',
    'update_task_status({"task_id": "123...", "status": "canceled"})',
  ],
  parameters: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "UUID of task to update",
      },
      status: {
        type: "string",
        description: "New task status",
        enum: ["todo", "in_progress", "done", "canceled"],
      },
      completion_notes: {
        type: "string",
        description: "Optional notes when marking as done",
      },
    },
    required: ["task_id", "status"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  tags: ["tasks", "productivity", "status", "write"],
};

export const updateTaskStatusHandler: ToolHandler<UpdateTaskStatusParams> = async (
  params,
  context,
) => {
  const validated = UpdateTaskStatusParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  // Verify task exists
  const task = await repo.getTask(validated.task_id, context.userId);
  if (!task) {
    throw new AppError(
      `Task with ID ${validated.task_id} not found`,
      "TASK_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Build update data
  const updateData: {
    status: "todo" | "in_progress" | "done" | "canceled";
    completedAt?: Date | null;
    details?: unknown;
  } = {
    status: validated.status,
  };

  // Set completion timestamp when marking as done
  if (validated.status === "done") {
    updateData.completedAt = new Date();
    if (validated.completion_notes) {
      updateData.details = {
        ...(typeof task.details === "object" && task.details !== null ? task.details : {}),
        completionNotes: validated.completion_notes,
      };
    }
  } else if (validated.status === "todo" || validated.status === "in_progress") {
    // Clear completion timestamp if moving back to incomplete status
    updateData.completedAt = null;
  }

  // Update the task
  await repo.updateTask(validated.task_id, context.userId, updateData);

  // Return updated task
  return await repo.getTask(validated.task_id, context.userId);
};

// ============================================================================
// TOOL: get_project
// ============================================================================

const GetProjectParamsSchema = z.object({
  project_id: z.string().uuid(),
});

type GetProjectParams = z.infer<typeof GetProjectParamsSchema>;

export const getProjectDefinition: ToolDefinition = {
  name: "get_project",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve a specific project by ID with all project details including name, status, due date, zone assignment, and metadata.",
  useCases: [
    "When user asks 'show me project details'",
    "When user wants to 'get information about project X'",
    "When viewing project overview",
    "When checking project status and progress",
  ],
  exampleCalls: [
    'get_project({"project_id": "123..."})',
    'get_project({"project_id": "456e789a-12b3-45c6-d789-012345678901"})',
  ],
  parameters: {
    type: "object",
    properties: {
      project_id: {
        type: "string",
        description: "UUID of project to retrieve",
      },
    },
    required: ["project_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60,
  deprecated: false,
  tags: ["projects", "productivity", "read"],
};

export const getProjectHandler: ToolHandler<GetProjectParams> = async (params, context) => {
  const validated = GetProjectParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  const project = await repo.getProject(validated.project_id, context.userId);

  if (!project) {
    throw new AppError(
      `Project with ID ${validated.project_id} not found`,
      "PROJECT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  return project;
};
