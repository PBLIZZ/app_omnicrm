/**
 * Tasks Service Layer
 *
 * Business logic and orchestration for task operations.
 * - Uses factory pattern for repository access
 * - Handles business logic and data transformation
 * - Throws AppError on failures
 */

import { createProductivityRepository } from "@repo";
import type { TaskListItem } from "@repo";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";
import { sanitizeJsonb } from "@/lib/validation/jsonb";

// Helper: Convert Date to string for date columns
function dateToString(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0] as string;
}

// ============================================================================
// TASK CRUD OPERATIONS
// ============================================================================

/**
 * Create a new task
 */
export async function createTaskService(
  userId: string,
  data: {
    name: string;
    projectId?: string | null | undefined;
    parentTaskId?: string | null | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    status?: "todo" | "in_progress" | "done" | "canceled" | undefined;
    dueDate?: Date | null | undefined;
    details?: unknown;
  },
): Promise<TaskListItem> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Business logic: normalize details
    const normalizedDetails = data.details && typeof data.details === "object" ? data.details : {};

    // Business logic: validate parent task exists if provided
    if (data.parentTaskId) {
      const parentTask = await repo.getTask(data.parentTaskId, userId);
      if (!parentTask) {
        throw new AppError("Parent task not found", "PARENT_TASK_NOT_FOUND", "validation", false);
      }
    }

    // Create task
    const task = await repo.createTask(userId, {
      name: data.name,
      projectId: data.projectId ?? null,
      parentTaskId: data.parentTaskId ?? null,
      priority: data.priority ?? "medium",
      status: data.status ?? "todo",
      dueDate: dateToString(data.dueDate),
      details: normalizedDetails,
      completedAt: null,
    });

    return task;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create task",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get a single task by ID
 */
export async function getTaskService(userId: string, taskId: string): Promise<TaskListItem | null> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    return await repo.getTask(taskId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get task",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * List tasks with optional filters
 */
export async function listTasksService(
  userId: string,
  filters?: {
    projectId?: string | undefined;
    parentTaskId?: string | null | undefined;
    status?: string[] | undefined;
    priority?: string[] | undefined;
  },
): Promise<TaskListItem[]> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    return await repo.getTasks(userId, filters);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list tasks",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Update an existing task
 */
export async function updateTaskService(
  userId: string,
  taskId: string,
  data: {
    name?: string | undefined;
    projectId?: string | null | undefined;
    parentTaskId?: string | null | undefined;
    priority?: string | undefined;
    status?: string | undefined;
    dueDate?: Date | null | undefined;
    details?: unknown;
    completedAt?: Date | null | undefined;
  },
): Promise<TaskListItem | null> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Business logic: Filter undefined values and normalize details
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    // Business logic: Sanitize details field if present
    if (cleanData["details"] !== undefined) {
      cleanData["details"] = sanitizeJsonb(cleanData["details"]);
    }

    await repo.updateTask(taskId, userId, cleanData);

    // Return updated task
    return await repo.getTask(taskId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update task",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Delete a task
 */
export async function deleteTaskService(userId: string, taskId: string): Promise<void> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    await repo.deleteTask(taskId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete task",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get task statistics
 */
export async function getTaskStatsService(userId: string): Promise<{ total: number }> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    return await repo.getTaskStats(userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get task stats",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// TASK APPROVAL WORKFLOW
// ============================================================================

/**
 * Get tasks pending approval
 */
export async function getPendingApprovalTasksService(
  userId: string,
): Promise<{ tasks: TaskListItem[]; total: number }> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Get tasks with status='pending_approval' or similar
    // Adjust the status filter based on your actual schema
    const tasks = await repo.getTasks(userId, {
      status: ["pending_approval"],
    });

    return {
      tasks,
      total: tasks.length,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get pending approval tasks",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Approve a task
 */
export async function approveTaskService(userId: string, taskId: string): Promise<TaskListItem | null> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Update task status to approved
    await repo.updateTask(taskId, userId, {
      status: "todo", // or whatever your approved status is
    });

    // Return updated task
    return await repo.getTask(taskId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to approve task",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Reject a task
 */
export async function rejectTaskService(userId: string, taskId: string): Promise<TaskListItem | null> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Update task status to rejected
    await repo.updateTask(taskId, userId, {
      status: "canceled", // or whatever your rejected status is
    });

    // Return updated task
    return await repo.getTask(taskId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to reject task",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// PROJECT TASKS
// ============================================================================

/**
 * Get tasks for a specific project
 */
export async function getProjectTasksService(
  projectId: string,
  userId: string,
  filters?: { status?: string[] | undefined },
): Promise<TaskListItem[]> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Verify project exists
    const project = await repo.getProject(projectId, userId);
    if (!project) {
      throw new AppError("Project not found", "PROJECT_NOT_FOUND", "validation", false);
    }

    // Get tasks for this project
    return await repo.getTasks(userId, {
      projectId,
      ...filters,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get project tasks",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// SUBTASKS
// ============================================================================

/**
 * Get subtasks for a parent task
 */
export async function getSubtasksService(
  userId: string,
  parentTaskId: string,
): Promise<{ parentTask: TaskListItem; subtasks: TaskListItem[] }> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Get parent task
    const parentTask = await repo.getTask(parentTaskId, userId);
    if (!parentTask) {
      throw new AppError("Parent task not found", "TASK_NOT_FOUND", "validation", false);
    }

    // Get subtasks
    const subtasks = await repo.getTasks(userId, {
      parentTaskId,
    });

    return { parentTask, subtasks };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get subtasks",
      "DB_ERROR",
      "database",
      false,
    );
  }
}
