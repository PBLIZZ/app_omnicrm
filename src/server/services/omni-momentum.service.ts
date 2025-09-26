/**
 * OmniMomentum Service - Handles business logic for momentum/task management endpoints
 */
import { momentumRepository } from "@repo";
import type { TaskDTO, UpdateTaskDTO } from "@omnicrm/contracts";

export interface GetProjectTasksResult {
  ok: true;
  data: TaskDTO[];
} | {
  ok: false;
  error: string;
  status: number;
}

export interface GetTaskResult {
  ok: true;
  data: TaskDTO;
} | {
  ok: false;
  error: string;
  status: number;
}

export interface UpdateTaskResult {
  ok: true;
  data: TaskDTO;
} | {
  ok: false;
  error: string;
  status: number;
}

export interface DeleteTaskResult {
  ok: true;
  data: { success: true };
} | {
  ok: false;
  error: string;
  status: number;
}

export interface RejectTaskResult {
  ok: true;
  data: TaskDTO | { success: true; deleted: true };
} | {
  ok: false;
  error: string;
  status: number;
}

export class OmniMomentumService {
  /**
   * Get all tasks for a specific project
   */
  static async getProjectTasks(userId: string, projectId: string): Promise<GetProjectTasksResult> {
    try {
      // Ensure project exists and belongs to user
      const project = await momentumRepository.getProject(projectId, userId);
      if (!project) {
        return {
          ok: false,
          error: "Project not found",
          status: 404,
        };
      }

      // Get tasks for this project
      const tasks = await momentumRepository.getTasksWithProject(userId, projectId);

      return {
        ok: true,
        data: tasks,
      };
    } catch (error) {
      console.error("Failed to get project tasks:", error);
      return {
        ok: false,
        error: "Failed to retrieve project tasks",
        status: 500,
      };
    }
  }

  /**
   * Get a specific task by ID
   */
  static async getTask(userId: string, taskId: string): Promise<GetTaskResult> {
    try {
      const task = await momentumRepository.getTask(taskId, userId);

      if (!task) {
        return {
          ok: false,
          error: "Task not found",
          status: 404,
        };
      }

      return {
        ok: true,
        data: task,
      };
    } catch (error) {
      console.error("Failed to get task:", error);
      return {
        ok: false,
        error: "Failed to retrieve task",
        status: 500,
      };
    }
  }

  /**
   * Update a task
   */
  static async updateTask(
    userId: string,
    taskId: string,
    updateData: UpdateTaskDTO
  ): Promise<UpdateTaskResult> {
    try {
      // Update task (returns void)
      await momentumRepository.updateTask(taskId, userId, updateData);

      // Get the updated task to return
      const task = await momentumRepository.getTask(taskId, userId);
      if (!task) {
        return {
          ok: false,
          error: "Task not found",
          status: 404,
        };
      }

      return {
        ok: true,
        data: task,
      };
    } catch (error) {
      console.error("Failed to update task:", error);

      // Handle validation errors specifically
      if (error instanceof Error && error.name === "ZodError") {
        return {
          ok: false,
          error: "Invalid task data",
          status: 400,
        };
      }

      return {
        ok: false,
        error: "Failed to update task",
        status: 500,
      };
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(userId: string, taskId: string): Promise<DeleteTaskResult> {
    try {
      await momentumRepository.deleteTask(taskId, userId);

      return {
        ok: true,
        data: { success: true },
      };
    } catch (error) {
      console.error("Failed to delete task:", error);
      return {
        ok: false,
        error: "Failed to delete task",
        status: 500,
      };
    }
  }

  /**
   * Reject an AI-generated task
   */
  static async rejectTask(
    userId: string,
    taskId: string,
    deleteTask: boolean = false
  ): Promise<RejectTaskResult> {
    try {
      // Get the task to ensure it exists and belongs to the user
      const task = await momentumRepository.getTask(taskId, userId);
      if (!task) {
        return {
          ok: false,
          error: "Task not found",
          status: 404,
        };
      }

      if (deleteTask) {
        // Delete the task entirely
        await momentumRepository.deleteTask(taskId, userId);
        return {
          ok: true,
          data: { success: true, deleted: true },
        };
      } else {
        // Update task to rejected status (keep for AI learning)
        await momentumRepository.updateTask(taskId, userId, {
          status: "canceled", // Move to cancelled status
        });

        // Get the updated task to return
        const updatedTask = await momentumRepository.getTask(taskId, userId);
        if (!updatedTask) {
          return {
            ok: false,
            error: "Failed to reject task",
            status: 500,
          };
        }

        return {
          ok: true,
          data: updatedTask,
        };
      }
    } catch (error) {
      console.error("Failed to reject task:", error);
      return {
        ok: false,
        error: "Failed to reject task",
        status: 500,
      };
    }
  }
}