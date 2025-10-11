/**
 * Tasks Service Layer
 *
 * Business logic and orchestration for task operations.
 * - Uses factory pattern for repository access
 * - Handles business logic and data transformation
 * - Throws AppError on failures
 */

import { createProductivityRepository } from "@repo";
import type { Task } from "@/server/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";
import { sanitizeJsonb } from "@/lib/validation/jsonb";

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
): Promise<Task> {
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
      dueDate: data.dueDate ?? null,
      details: normalizedDetails,
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
export async function getTaskService(userId: string, taskId: string): Promise<Task | null> {
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
): Promise<Task[]> {
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
): Promise<Task | null> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Business logic: normalize the details field if provided
    const updateData: Record<string, unknown> = {};

    if (data["name"] !== undefined) updateData["name"] = data["name"];
    if (data["projectId"] !== undefined) updateData["projectId"] = data["projectId"];
    if (data["parentTaskId"] !== undefined) updateData["parentTaskId"] = data["parentTaskId"];
    if (data["priority"] !== undefined) updateData["priority"] = data["priority"];
    if (data["status"] !== undefined) updateData["status"] = data["status"];
    if (data["dueDate"] !== undefined) updateData["dueDate"] = data["dueDate"];
    if (data["completedAt"] !== undefined) updateData["completedAt"] = data["completedAt"];

    if (data["details"] !== undefined) {
      updateData["details"] = sanitizeJsonb(data["details"]);
    }

    await repo.updateTask(taskId, userId, updateData);

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
): Promise<{ tasks: Task[]; total: number }> {
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
export async function approveTaskService(userId: string, taskId: string): Promise<Task | null> {
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
export async function rejectTaskService(userId: string, taskId: string): Promise<Task | null> {
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
): Promise<Task[]> {
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
): Promise<{ parentTask: Task; subtasks: Task[] }> {
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
