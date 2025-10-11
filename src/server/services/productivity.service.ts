// OmniMomentum business logic service
import { MomentumRepository } from "@repo";
import { ok, err, isErr, isOk, DbResult } from "@/lib/utils/result";
import { isObject, getString } from "@/lib/utils/type-guards";
import type {
  Project,
  CreateProject,
  UpdateProject,
  ProjectFilters,
} from "@/server/db/business-schemas/projects";
import { ProjectSchema } from "@/server/db/business-schemas/projects";
import type { CreateProject as DbCreateProject } from "@/server/db/schema";
import type { Task, CreateTask, UpdateTask, TaskFilters } from "@/server/db/business-schemas/tasks";
import { TaskSchema } from "@/server/db/business-schemas/tasks";
import type { Zone } from "@/server/db/business-schemas/zones";
import { ZoneSchema } from "@/server/db/business-schemas/zones";
import type { InboxItem } from "@/server/db/business-schemas/inbox";
import { InboxItemSchema } from "@/server/db/business-schemas/inbox";

// Missing type definitions
export interface QuickTaskCreateDTO {
  name: string;
  priority?: "high" | "medium" | "low" | "urgent";
  dueDate?: Date | null;
  projectId?: string | null;
  parentTaskId?: string | null;
}

export interface TaskWithRelationsDTO extends Task {
  project?: Project | null;
  parentTask?: Task | null;
  subtasks: Task[];
  taggedContacts: Array<{ id: string; name: string }>;
  zone?: Zone | null;
}

export interface BulkTaskUpdateDTO {
  taskIds: string[];
  updates: UpdateTask;
}

export interface CreateGoalDTO {
  contactId?: string | null;
  goalType: "practitioner_business" | "practitioner_personal" | "client_wellness";
  name: string;
  status?: "on_track" | "at_risk" | "achieved" | "abandoned";
  targetDate?: Date | null;
  details?: Record<string, unknown>;
}

export interface GoalDTO {
  id: string;
  userId: string;
  contactId: string | null;
  goalType: "practitioner_business" | "practitioner_personal" | "client_wellness";
  name: string;
  status: "on_track" | "at_risk" | "achieved" | "abandoned";
  targetDate: Date | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalFilters {
  contactId?: string;
  goalType?: Array<"practitioner_business" | "practitioner_personal" | "client_wellness">;
  status?: string[];
  search?: string;
  targetAfter?: Date;
  targetBefore?: Date;
}

export interface UpdateGoalDTO {
  name?: string;
  status?: "on_track" | "at_risk" | "achieved" | "abandoned";
  targetDate?: Date | null;
  details?: Record<string, unknown>;
}

export interface CreateDailyPulseLogDTO {
  energy: number;
  mood: number;
  productivity: number;
  stress: number;
  details?: Record<string, unknown>;
}

export interface DailyPulseLogDTO {
  id: string;
  userId: string;
  logDate: Date;
  energy: number;
  mood: number;
  productivity: number;
  stress: number;
  details: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateDailyPulseLogDTO {
  energy?: number;
  mood?: number;
  productivity?: number;
  stress?: number;
  details?: Record<string, unknown>;
}

export class ProductivityService {
  private readonly momentumRepository = new MomentumRepository();

  // Transform database project to business schema project
  private transformProject(dbProject: any): Project {
    return ProjectSchema.parse(dbProject);
  }

  // Transform database task to business schema task
  private transformTask(dbTask: any): Task {
    return TaskSchema.parse(dbTask);
  }

  // Transform database goal to business schema goal
  private transformGoal(dbGoal: any): GoalDTO {
    return {
      id: dbGoal.id,
      userId: dbGoal.userId,
      contactId: dbGoal.contactId,
      goalType: dbGoal.goalType,
      name: dbGoal.name,
      status: dbGoal.status || "on_track", // Provide default for null status
      targetDate: dbGoal.targetDate,
      details: dbGoal.details || {},
      createdAt: dbGoal.createdAt,
      updatedAt: dbGoal.updatedAt,
    };
  }

  // Transform database daily pulse log to business schema daily pulse log
  private transformDailyPulseLog(dbLog: any): DailyPulseLogDTO {
    const details = dbLog.details || {};
    return {
      id: dbLog.id,
      userId: dbLog.userId,
      logDate: new Date(dbLog.logDate),
      energy: details.energy || 0,
      mood: details.mood || 0,
      productivity: details.productivity || 0,
      stress: details.stress || 0,
      details: details,
      createdAt: dbLog.createdAt,
      updatedAt: dbLog.updatedAt || dbLog.createdAt,
    };
  }

  // Transform database zone to business schema zone
  private transformZone(dbZone: any): Zone {
    // Use ZoneSchema to properly transform the database zone
    return ZoneSchema.parse({
      id: dbZone.id,
      name: dbZone.name,
      color: dbZone.color,
      iconName: dbZone.iconName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Transform database inbox item to business schema inbox item
  private transformInboxItem(dbItem: any): InboxItem {
    // Use InboxItemSchema to properly transform the database item
    return InboxItemSchema.parse({
      id: dbItem.id,
      userId: dbItem.userId,
      rawText: dbItem.rawText,
      status: dbItem.status || "unprocessed", // Provide default for null status
      createdTaskId: dbItem.createdTaskId,
      processedAt: dbItem.processedAt,
      createdAt: dbItem.createdAt,
      updatedAt: dbItem.updatedAt,
    });
  }

  // Helper function to handle raw data that might not be wrapped in Result
  private handleRepositoryResult<T>(result: T | DbResult<T>): DbResult<T> {
    // If it's already a Result type, return as-is
    if (result && typeof result === 'object' && 'success' in result) {
      return result as DbResult<T>;
    }
    // If it's raw data, wrap it in ok()
    return ok(result as T);
  }


  // ============================================================================
  // PROJECTS (Pathways)
  // ============================================================================

  async createProject(userId: string, data: CreateProject): Promise<DbResult<Project>> {
    try {
      const projectData = {
        userId,
        name: data.name,
        zoneId: data.zoneId,
        status: data.status ?? "active",
        dueDate: data.dueDate,
        details: data.details ?? {},
      };

      const result = await this.momentumRepository.createProject(userId, projectData);
      if (isErr(result)) {
        return err({
          code: "PROJECT_CREATE_FAILED",
          message: "Failed to create project",
          details: result.error,
        });
      }
      if (isOk(result)) {
        const transformedProject = this.transformProject(result.data);
        return ok(transformedProject);
      }
      return err({
        code: "PROJECT_CREATE_FAILED",
        message: "Invalid result state",
      });
    } catch (error) {
      return err({
        code: "PROJECT_CREATE_ERROR",
        message: "Error creating project",
        details: error,
      });
    }
  }

  async getProjects(
    userId: string,
    filters: ProjectFilters = {},
  ): Promise<DbResult<Project[]>> {
    try {
      // Apply filters - for now just zoneId, can expand later
      const dbFilters: { zoneId?: number | undefined; status?: string[] | undefined } = {};
      if (filters.zoneId !== undefined) {
        dbFilters.zoneId = filters.zoneId;
      }
      if (filters.status !== undefined) {
        dbFilters.status = filters.status;
      }
      // Only pass defined filters to avoid exactOptionalPropertyTypes issues
      const safeFilters = Object.fromEntries(
        Object.entries(dbFilters).filter(([, value]) => value !== undefined)
      );
      const result = await this.momentumRepository.getProjects(userId, safeFilters);
      if (isErr(result)) {
        return err({
          code: "PROJECTS_GET_FAILED",
          message: "Failed to get projects",
          details: result.error,
        });
      }
      if (!isOk(result)) {
        return err({
          code: "PROJECTS_GET_FAILED",
          message: "Invalid result state",
        });
      }
      const projects = result.data.map(dbProject => this.transformProject(dbProject));

      // Apply additional filters
      let filteredProjects = projects;

      if (filters.search) {
        const search = filters.search.toLowerCase();
        filteredProjects = filteredProjects.filter((p) => {
          const hasNameMatch = p.name.toLowerCase().includes(search);

          // Safe description access using type guards
          const description = isObject(p.details) ? getString(p.details, "description") : undefined;
          const hasDescriptionMatch = description?.toLowerCase().includes(search) ?? false;

          return hasNameMatch || hasDescriptionMatch;
        });
      }

      if (filters.status && filters.status.length > 0) {
        filteredProjects = filteredProjects.filter((p) => filters.status!.includes(p.status));
      }

      if (filters.dueAfter) {
        filteredProjects = filteredProjects.filter(
          (p) => p.dueDate && new Date(p.dueDate) >= filters.dueAfter!,
        );
      }

      if (filters.dueBefore) {
        filteredProjects = filteredProjects.filter(
          (p) => p.dueDate && new Date(p.dueDate) <= filters.dueBefore!,
        );
      }

      return ok(filteredProjects);
    } catch (error) {
      return err({
        code: "PROJECTS_GET_ERROR",
        message: "Error getting projects",
        details: error,
      });
    }
  }

  async getProject(projectId: string, userId: string): Promise<DbResult<Project | null>> {
    try {
      const result = await this.momentumRepository.getProject(projectId, userId);
      if (isErr(result)) {
        return err({
          code: "PROJECT_GET_FAILED",
          message: "Failed to get project",
          details: result.error,
        });
      }
      if (!isOk(result)) {
        return err({
          code: "PROJECT_GET_FAILED",
          message: "Invalid result state",
        });
      }
      // Transform the raw database result into business schema
      const dbProject = result.data;
      if (!dbProject) {
        return ok(null);
      }
      const project = this.transformProject(dbProject);
      return ok(project);
    } catch (error) {
      return err({
        code: "PROJECT_GET_ERROR",
        message: "Error getting project",
        details: error,
      });
    }
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProject,
  ): Promise<DbResult<Project | null>> {
    try {
      // Filter out undefined values to match repository expectations
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      ) as Partial<DbCreateProject>;

      await this.momentumRepository.updateProject(projectId, userId, filteredData);
      const result = await this.momentumRepository.getProject(projectId, userId);
      if (isErr(result)) {
        return err({
          code: "PROJECT_UPDATE_GET_FAILED",
          message: "Failed to get updated project",
          details: result.error,
        });
      }
      if (!isOk(result)) {
        return err({
          code: "PROJECT_UPDATE_GET_FAILED",
          message: "Invalid result state after update",
        });
      }
      // Transform the raw database result into business schema
      const dbProject = result.data;
      if (!dbProject) {
        return ok(null);
      }
      const project = this.transformProject(dbProject);
      return ok(project);
    } catch (error) {
      return err({
        code: "PROJECT_UPDATE_ERROR",
        message: "Error updating project",
        details: error,
      });
    }
  }

  async deleteProject(projectId: string, userId: string): Promise<DbResult<void>> {
    try {
      // TODO: Add business logic to handle cascade deletion of tasks if needed
      await this.momentumRepository.deleteProject(projectId, userId);
      return ok(undefined);
    } catch (error) {
      return err({
        code: "PROJECT_DELETE_ERROR",
        message: "Error deleting project",
        details: error,
      });
    }
  }

  // ============================================================================
  // TASKS (Hierarchical)
  // ============================================================================

  async createTask(userId: string, data: CreateTask): Promise<DbResult<Task>> {
    try {
      const taskData = {
        userId,
        name: data.name,
        projectId: data.projectId,
        parentTaskId: data.parentTaskId,
        status: data.status ?? "todo",
        priority: data.priority ?? "medium",
        dueDate: data.dueDate,
        details: data.details ?? {},
      };

      const result = await this.momentumRepository.createTask(userId, taskData);
      if (isErr(result)) {
        return err({
          code: "TASK_CREATE_FAILED",
          message: "Failed to create task",
          details: result.error,
        });
      }
      if (!isOk(result)) {
        return err({
          code: "TASK_CREATE_FAILED",
          message: "Invalid result state",
        });
      }
      const task = this.transformTask(result.data);

      // Add contact tags if provided
      if (data.taggedContactIds && data.taggedContactIds.length > 0) {
        await this.momentumRepository.addTaskContactTags(task.id, data.taggedContactIds);
      }

      return ok(task);
    } catch (error) {
      return err({
        code: "TASK_CREATE_ERROR",
        message: "Error creating task",
        details: error,
      });
    }
  }

  async createQuickTask(userId: string, data: QuickTaskCreateDTO): Promise<DbResult<Task>> {
    return this.createTask(userId, {
      userId,
      name: data.name,
      priority: data.priority ?? "medium",
      dueDate: data.dueDate ?? null,
      projectId: data.projectId ?? null,
      parentTaskId: data.parentTaskId ?? null,
      status: "todo",
      details: {},
    });
  }

  async getTasks(userId: string, filters: TaskFilters = {}): Promise<DbResult<Task[]>> {
    try {
      const dbFilters: {
        projectId?: string;
        parentTaskId?: string | null;
        status?: string[];
        priority?: string[];
      } = {};
      if (filters.projectId !== undefined) dbFilters.projectId = filters.projectId;
      if (filters.parentTaskId !== undefined) dbFilters.parentTaskId = filters.parentTaskId;
      if (filters.status !== undefined) dbFilters.status = filters.status;
      if (filters.priority !== undefined) dbFilters.priority = filters.priority;

      const result = await this.momentumRepository.getTasks(userId, dbFilters);
      if (isErr(result)) {
        return err({
          code: "TASKS_GET_FAILED",
          message: "Failed to get tasks",
          details: result.error,
        });
      }
      if (!isOk(result)) {
        return err({
          code: "TASKS_GET_FAILED",
          message: "Invalid result state",
        });
      }
      const tasks = result.data.map(dbTask => this.transformTask(dbTask));

    // Apply additional filters
    let filteredTasks = tasks;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredTasks = filteredTasks.filter((t) => {
        const hasNameMatch = t.name.toLowerCase().includes(search);
        const hasDescriptionMatch =
          t.details &&
          typeof t.details === "object" &&
          "description" in t.details &&
          typeof t.details["description"] === "string" &&
          t.details["description"].toLowerCase().includes(search);
        return hasNameMatch || hasDescriptionMatch;
      });
    }

    if (filters.taggedContactId) {
      // Get tasks that have this contact tagged
      const contactTaggedTasks = new Set<string>();
      for (const task of filteredTasks) {
        const tags = await this.momentumRepository.getTaskContactTags(task.id);
        if (tags.some((tag) => tag.contactId === filters.taggedContactId)) {
          contactTaggedTasks.add(task.id);
        }
      }
      filteredTasks = filteredTasks.filter((t) => contactTaggedTasks.has(t.id));
    }

    if (filters.dueAfter) {
      filteredTasks = filteredTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) >= filters.dueAfter!,
      );
    }

    if (filters.dueBefore) {
      filteredTasks = filteredTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) <= filters.dueBefore!,
      );
    }

    if (filters.hasSubtasks !== undefined) {
      const tasksWithSubtasks = new Set<string>();
      for (const task of filteredTasks) {
        const subtasks = await this.momentumRepository.getSubtasks(task.id, userId);
        if (subtasks.length > 0) {
          tasksWithSubtasks.add(task.id);
        }
      }

      if (filters.hasSubtasks) {
        filteredTasks = filteredTasks.filter((t) => tasksWithSubtasks.has(t.id));
      } else {
        filteredTasks = filteredTasks.filter((t) => !tasksWithSubtasks.has(t.id));
      }
    }

      return ok(filteredTasks);
    } catch (error) {
      return err({
        code: "TASKS_GET_ERROR",
        message: "Error getting tasks",
        details: error,
      });
    }
  }

  async getTask(taskId: string, userId: string): Promise<DbResult<Task | null>> {
    try {
      const rawResult = await this.momentumRepository.getTask(taskId, userId);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "TASK_GET_FAILED",
          message: "Failed to get task",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "TASK_GET_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform the raw database result into business schema
      const dbTask = result.data;
      if (!dbTask) {
        return ok(null);
      }
      const task = this.transformTask(dbTask);
      return ok(task);
    } catch (error) {
      return err({
        code: "TASK_GET_ERROR",
        message: "Error getting task",
        details: error,
      });
    }
  }

  async getTaskWithRelations(taskId: string, userId: string): Promise<DbResult<TaskWithRelationsDTO | null>> {
    try {
      const rawResult = await this.momentumRepository.getTaskWithRelations(taskId, userId);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "TASK_WITH_RELATIONS_GET_FAILED",
          message: "Failed to get task with relations",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "TASK_WITH_RELATIONS_GET_FAILED",
          message: "Invalid result state",
        });
      }

      const taskData = result.data;
      if (!taskData) return ok(null);

      // Transform the main task and related data to proper business schema
      const transformedTask = this.transformTask(taskData.task);

      // Ensure taggedContacts conforms to expected interface structure
      const taggedContacts = Array.isArray(taskData.taggedContacts)
        ? taskData.taggedContacts.map((contact: any) => ({
            id: contact.id || '',
            name: contact.displayName || contact.name || '',
          }))
        : [];

      const taskWithRelations: TaskWithRelationsDTO = {
        ...transformedTask,
        project: taskData.project ? this.transformProject(taskData.project) : null,
        parentTask: taskData.parentTask ? this.transformTask(taskData.parentTask) : null,
        subtasks: taskData.subtasks.map(subtask => this.transformTask(subtask)),
        taggedContacts,
        zone: taskData.zone ? this.transformZone(taskData.zone) : null,
      };

      return ok(taskWithRelations);
    } catch (error) {
      return err({
        code: "TASK_WITH_RELATIONS_GET_ERROR",
        message: "Error getting task with relations",
        details: error,
      });
    }
  }

  async getProjectTasks(projectId: string, userId: string): Promise<DbResult<Task[]>> {
    try {
      const rawResult = await this.momentumRepository.getTasksWithProject(userId, projectId);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "PROJECT_TASKS_GET_FAILED",
          message: "Failed to get project tasks",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "PROJECT_TASKS_GET_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database results into business schema
      const tasks = result.data.map(dbTask => this.transformTask(dbTask));
      return ok(tasks);
    } catch (error) {
      return err({
        code: "PROJECT_TASKS_GET_ERROR",
        message: "Error getting project tasks",
        details: error,
      });
    }
  }

  async getSubtasks(parentTaskId: string, userId: string): Promise<DbResult<Task[]>> {
    try {
      const rawResult = await this.momentumRepository.getSubtasks(parentTaskId, userId);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "SUBTASKS_GET_FAILED",
          message: "Failed to get subtasks",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "SUBTASKS_GET_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database results into business schema
      const tasks = result.data.map(dbTask => this.transformTask(dbTask));
      return ok(tasks);
    } catch (error) {
      return err({
        code: "SUBTASKS_GET_ERROR",
        message: "Error getting subtasks",
        details: error,
      });
    }
  }

  /**
   * Get subtasks with parent task validation
   */
  async getSubtasksWithValidation(
    taskId: string,
    userId: string,
  ): Promise<DbResult<{ subtasks: Task[]; parentTask: Task | null }>> {
    try {
      // Ensure parent task exists and belongs to user
      const parentRawResult = await this.momentumRepository.getTask(taskId, userId);
      const parentResult = this.handleRepositoryResult(parentRawResult);

      if (isErr(parentResult)) {
        return err({
          code: "PARENT_TASK_GET_FAILED",
          message: "Failed to get parent task",
          details: parentResult.error,
        });
      }

      if (!isOk(parentResult)) {
        return err({
          code: "PARENT_TASK_GET_FAILED",
          message: "Invalid result state",
        });
      }

      const dbParentTask = parentResult.data;

      if (!dbParentTask) {
        return ok({ subtasks: [], parentTask: null });
      }

      const parentTask = this.transformTask(dbParentTask);

      // Get subtasks for this parent task
      const subtasksRawResult = await this.momentumRepository.getSubtasks(taskId, userId);
      const subtasksResult = this.handleRepositoryResult(subtasksRawResult);

      if (isErr(subtasksResult)) {
        return err({
          code: "SUBTASKS_VALIDATION_GET_FAILED",
          message: "Failed to get subtasks for validation",
          details: subtasksResult.error,
        });
      }

      if (!isOk(subtasksResult)) {
        return err({
          code: "SUBTASKS_VALIDATION_GET_FAILED",
          message: "Invalid result state",
        });
      }

      const subtasks = subtasksResult.data.map(dbTask => this.transformTask(dbTask));

      return ok({ subtasks, parentTask });
    } catch (error) {
      return err({
        code: "SUBTASKS_VALIDATION_ERROR",
        message: "Error validating subtasks",
        details: error,
      });
    }
  }

  /**
   * Create subtask with parent task validation and business logic
   */
  async createSubtaskWithValidation(
    taskId: string,
    userId: string,
    subtaskData: CreateTask,
  ): Promise<DbResult<{ subtask: Task | null; parentTask: Task | null }>> {
    try {
      // Ensure parent task exists and belongs to user
      const parentRawResult = await this.momentumRepository.getTask(taskId, userId);
      const parentResult = this.handleRepositoryResult(parentRawResult);

      if (isErr(parentResult)) {
        return err({
          code: "PARENT_TASK_VALIDATION_FAILED",
          message: "Failed to validate parent task",
          details: parentResult.error,
        });
      }

      if (!isOk(parentResult)) {
        return err({
          code: "PARENT_TASK_VALIDATION_FAILED",
          message: "Invalid result state",
        });
      }

      const dbParentTask = parentResult.data;

      if (!dbParentTask) {
        return ok({ subtask: null, parentTask: null });
      }

      const parentTask = this.transformTask(dbParentTask);

      // Build validated data with parent task context
      const taskData: CreateTask = {
        ...subtaskData,
        userId,
        parentTaskId: taskId, // Ensure subtask is linked to parent
        // Inherit project from parent if not specified
        projectId: subtaskData.projectId ?? parentTask.projectId,
      };

      const subtaskResult = await this.momentumRepository.createTask(userId, taskData);
      if (isErr(subtaskResult)) {
        return err({
          code: "SUBTASK_CREATE_FAILED",
          message: "Failed to create subtask",
          details: subtaskResult.error,
        });
      }
      if (!isOk(subtaskResult)) {
        return err({
          code: "SUBTASK_CREATE_FAILED",
          message: "Invalid result state",
        });
      }
      const subtask = this.transformTask(subtaskResult.data);

      // Add contact tags if provided
      if (taskData.taggedContactIds && taskData.taggedContactIds.length > 0) {
        await this.momentumRepository.addTaskContactTags(subtask.id, taskData.taggedContactIds);
      }

      return ok({ subtask, parentTask });
    } catch (error) {
      return err({
        code: "SUBTASK_VALIDATION_ERROR",
        message: "Error creating subtask with validation",
        details: error,
      });
    }
  }

  async updateTask(taskId: string, userId: string, data: UpdateTask): Promise<DbResult<Task | null>> {
    try {
      // Handle completion status changes
      const updates: UpdateTask & { completedAt?: Date | null | undefined } = { ...data };
      if (data.status === "done" && !updates.completedAt) {
        updates.completedAt = new Date();
      } else if (data.status !== "done" && updates.completedAt !== undefined) {
        updates.completedAt = null;
      }

      // Filter out undefined values for exact optional property types
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined),
      );

      await this.momentumRepository.updateTask(taskId, userId, filteredUpdates);

      // Update contact tags if provided
      if (data.taggedContactIds !== undefined) {
        await this.momentumRepository.removeTaskContactTags(taskId);
        if (data.taggedContactIds.length > 0) {
          await this.momentumRepository.addTaskContactTags(taskId, data.taggedContactIds);
        }
      }

      const rawResult = await this.momentumRepository.getTask(taskId, userId);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "TASK_UPDATE_GET_FAILED",
          message: "Failed to get updated task",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "TASK_UPDATE_GET_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform the raw database result into business schema
      const dbTask = result.data;
      if (!dbTask) {
        return ok(null);
      }
      const task = this.transformTask(dbTask);
      return ok(task);
    } catch (error) {
      return err({
        code: "TASK_UPDATE_ERROR",
        message: "Error updating task",
        details: error,
      });
    }
  }

  async bulkUpdateTasks(userId: string, data: BulkTaskUpdateDTO): Promise<DbResult<Task[]>> {
    try {
      const updatedTasks: Task[] = [];

      for (const taskId of data.taskIds) {
        const taskResult = await this.updateTask(taskId, userId, data.updates);
        if (isErr(taskResult)) {
          return err({
            code: "BULK_TASK_UPDATE_FAILED",
            message: "Failed to update one or more tasks in bulk operation",
            details: taskResult.error,
          });
        }
        if (isOk(taskResult) && taskResult.data) {
          updatedTasks.push(taskResult.data);
        }
      }

      return ok(updatedTasks);
    } catch (error) {
      return err({
        code: "BULK_TASK_UPDATE_ERROR",
        message: "Error in bulk task update",
        details: error,
      });
    }
  }

  async deleteTask(taskId: string, userId: string): Promise<DbResult<void>> {
    try {
      // Business logic: Also delete all subtasks
      const subtasksRawResult = await this.momentumRepository.getSubtasks(taskId, userId);
      const subtasksResult = this.handleRepositoryResult(subtasksRawResult);

      if (isErr(subtasksResult)) {
        return err({
          code: "TASK_DELETE_SUBTASKS_FAILED",
          message: "Failed to get subtasks for deletion",
          details: subtasksResult.error,
        });
      }

      if (!isOk(subtasksResult)) {
        return err({
          code: "TASK_DELETE_SUBTASKS_FAILED",
          message: "Invalid result state",
        });
      }

      const subtasks = subtasksResult.data;
      for (const subtask of subtasks) {
        await this.momentumRepository.deleteTask(subtask.id, userId);
      }

      await this.momentumRepository.deleteTask(taskId, userId);
      return ok(undefined);
    } catch (error) {
      return err({
        code: "TASK_DELETE_ERROR",
        message: "Error deleting task",
        details: error,
      });
    }
  }

  // ============================================================================
  // GOALS
  // ============================================================================

  async createGoal(userId: string, data: CreateGoalDTO): Promise<DbResult<GoalDTO>> {
    try {
      const goalData = {
        userId,
        contactId: data.contactId,
        goalType: data.goalType,
        name: data.name,
        status: data.status ?? "on_track",
        targetDate: data.targetDate,
        details: data.details ?? {},
      };

      const rawResult = await this.momentumRepository.createGoal(userId, goalData);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "GOAL_CREATE_FAILED",
          message: "Failed to create goal",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "GOAL_CREATE_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database result into business schema
      const transformedGoal = this.transformGoal(result.data);
      return ok(transformedGoal);
    } catch (error) {
      return err({
        code: "GOAL_CREATE_ERROR",
        message: "Error creating goal",
        details: error,
      });
    }
  }

  async getGoals(userId: string, filters: GoalFilters = {}): Promise<DbResult<GoalDTO[]>> {
    try {
      const dbFilters: { contactId?: string; goalType?: string[]; status?: string[] } = {};
      if (filters.contactId !== undefined) dbFilters.contactId = filters.contactId;
      if (filters.goalType !== undefined) dbFilters.goalType = filters.goalType;
      if (filters.status !== undefined) dbFilters.status = filters.status;

      const rawResult = await this.momentumRepository.getGoals(userId, dbFilters);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "GOALS_GET_FAILED",
          message: "Failed to get goals",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "GOALS_GET_FAILED",
          message: "Invalid result state",
        });
      }

      const rawGoals = result.data;

    // Transform raw database results into business schema
    const goals = rawGoals.map(dbGoal => this.transformGoal(dbGoal));

    // Apply additional filters
    let filteredGoals = goals;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredGoals = filteredGoals.filter((g) => {
        const hasNameMatch = g.name.toLowerCase().includes(search);
        const hasDescriptionMatch =
          g.details &&
          typeof g.details === "object" &&
          "description" in g.details &&
          typeof g.details["description"] === "string" &&
          g.details["description"].toLowerCase().includes(search);
        return hasNameMatch || hasDescriptionMatch;
      });
    }

    if (filters.targetAfter) {
      filteredGoals = filteredGoals.filter(
        (g) => g.targetDate && new Date(g.targetDate) >= filters.targetAfter!,
      );
    }

    if (filters.targetBefore) {
      filteredGoals = filteredGoals.filter(
        (g) => g.targetDate && new Date(g.targetDate) <= filters.targetBefore!,
      );
    }

      return ok(filteredGoals);
    } catch (error) {
      return err({
        code: "GOALS_GET_ERROR",
        message: "Error getting goals",
        details: error,
      });
    }
  }

  async getGoal(goalId: string, userId: string): Promise<DbResult<GoalDTO | null>> {
    try {
      const rawResult = await this.momentumRepository.getGoal(goalId, userId);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "GOAL_GET_FAILED",
          message: "Failed to get goal",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "GOAL_GET_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database result into business schema
      const dbGoal = result.data;
      if (!dbGoal) {
        return ok(null);
      }
      const transformedGoal = this.transformGoal(dbGoal);
      return ok(transformedGoal);
    } catch (error) {
      return err({
        code: "GOAL_GET_ERROR",
        message: "Error getting goal",
        details: error,
      });
    }
  }

  async updateGoal(goalId: string, userId: string, data: UpdateGoalDTO): Promise<DbResult<GoalDTO | null>> {
    try {
      await this.momentumRepository.updateGoal(goalId, userId, data);
      const rawResult = await this.momentumRepository.getGoal(goalId, userId);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "GOAL_UPDATE_GET_FAILED",
          message: "Failed to get updated goal",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "GOAL_UPDATE_GET_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database result into business schema
      const dbGoal = result.data;
      if (!dbGoal) {
        return ok(null);
      }
      const transformedGoal = this.transformGoal(dbGoal);
      return ok(transformedGoal);
    } catch (error) {
      return err({
        code: "GOAL_UPDATE_ERROR",
        message: "Error updating goal",
        details: error,
      });
    }
  }

  async deleteGoal(goalId: string, userId: string): Promise<DbResult<void>> {
    try {
      await this.momentumRepository.deleteGoal(goalId, userId);
      return ok(undefined);
    } catch (error) {
      return err({
        code: "GOAL_DELETE_ERROR",
        message: "Error deleting goal",
        details: error,
      });
    }
  }

  // ============================================================================
  // DAILY PULSE LOGS
  // ============================================================================

  async createDailyPulseLog(
    userId: string,
    data: CreateDailyPulseLogDTO,
  ): Promise<DbResult<DailyPulseLogDTO>> {
    try {
      const logData = {
        userId,
        logDate: new Date().toISOString().split("T")[0] as string, // Today's date as string
        energy: data.energy,
        mood: data.mood,
        productivity: data.productivity,
        stress: data.stress,
        details: data.details ?? {},
      };
      const rawResult = await this.momentumRepository.createDailyPulseLog(userId, logData);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "DAILY_PULSE_LOG_CREATE_FAILED",
          message: "Failed to create daily pulse log",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "DAILY_PULSE_LOG_CREATE_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database result into business schema
      const transformedLog = this.transformDailyPulseLog(result.data);
      return ok(transformedLog);
    } catch (error) {
      return err({
        code: "DAILY_PULSE_LOG_CREATE_ERROR",
        message: "Error creating daily pulse log",
        details: error,
      });
    }
  }

  async getDailyPulseLogs(userId: string, limit = 30): Promise<DbResult<DailyPulseLogDTO[]>> {
    try {
      const rawResult = await this.momentumRepository.getDailyPulseLogs(userId, limit);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "DAILY_PULSE_LOGS_GET_FAILED",
          message: "Failed to get daily pulse logs",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "DAILY_PULSE_LOGS_GET_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database results into business schema
      const transformedLogs = result.data.map(dbLog => this.transformDailyPulseLog(dbLog));
      return ok(transformedLogs);
    } catch (error) {
      return err({
        code: "DAILY_PULSE_LOGS_GET_ERROR",
        message: "Error getting daily pulse logs",
        details: error,
      });
    }
  }

  async getDailyPulseLog(userId: string, logDate: Date): Promise<DbResult<DailyPulseLogDTO | null>> {
    try {
      const rawResult = await this.momentumRepository.getDailyPulseLog(userId, logDate);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "DAILY_PULSE_LOG_GET_FAILED",
          message: "Failed to get daily pulse log",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "DAILY_PULSE_LOG_GET_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database result into business schema
      const dbLog = result.data;
      if (!dbLog) {
        return ok(null);
      }
      const transformedLog = this.transformDailyPulseLog(dbLog);
      return ok(transformedLog);
    } catch (error) {
      return err({
        code: "DAILY_PULSE_LOG_GET_ERROR",
        message: "Error getting daily pulse log",
        details: error,
      });
    }
  }

  async updateDailyPulseLog(
    logId: string,
    userId: string,
    data: UpdateDailyPulseLogDTO,
  ): Promise<DbResult<DailyPulseLogDTO | null>> {
    try {
      // Filter out undefined values for exact optional property types
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      );

      // Pass all mutable fields to the repository update call
      await this.momentumRepository.updateDailyPulseLog(logId, userId, filteredData);

      // Since updateDailyPulseLog returns void, we can't easily get the updated record
      // The caller should handle this by calling getDailyPulseLogs or getDailyPulseLog separately
      return ok(null); // Indicate success but no data returned
    } catch (error) {
      return err({
        code: "DAILY_PULSE_LOG_UPDATE_ERROR",
        message: "Error updating daily pulse log",
        details: error,
      });
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getZones(): Promise<DbResult<Zone[]>> {
    try {
      const rawResult = await this.momentumRepository.getZones();
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "ZONES_GET_FAILED",
          message: "Failed to get zones",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "ZONES_GET_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database results into business schema
      const transformedZones = result.data.map(dbZone => this.transformZone(dbZone));
      return ok(transformedZones);
    } catch (error) {
      return err({
        code: "ZONES_GET_ERROR",
        message: "Error getting zones",
        details: error,
      });
    }
  }

  async createInboxItem(userId: string, rawText: string): Promise<DbResult<InboxItem>> {
    try {
      const rawResult = await this.momentumRepository.createInboxItem(userId, { rawText });
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "INBOX_ITEM_CREATE_FAILED",
          message: "Failed to create inbox item",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "INBOX_ITEM_CREATE_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database result into business schema
      const transformedItem = this.transformInboxItem(result.data);
      return ok(transformedItem);
    } catch (error) {
      return err({
        code: "INBOX_ITEM_CREATE_ERROR",
        message: "Error creating inbox item",
        details: error,
      });
    }
  }

  async getInboxItems(userId: string, status?: string): Promise<DbResult<InboxItem[]>> {
    try {
      const rawResult = await this.momentumRepository.getInboxItems(userId, status);
      const result = this.handleRepositoryResult(rawResult);

      if (isErr(result)) {
        return err({
          code: "INBOX_ITEMS_GET_FAILED",
          message: "Failed to get inbox items",
          details: result.error,
        });
      }

      if (!isOk(result)) {
        return err({
          code: "INBOX_ITEMS_GET_FAILED",
          message: "Invalid result state",
        });
      }

      // Transform raw database results into business schema
      const transformedItems = result.data.map(dbItem => this.transformInboxItem(dbItem));
      return ok(transformedItems);
    } catch (error) {
      return err({
        code: "INBOX_ITEMS_GET_ERROR",
        message: "Error getting inbox items",
        details: error,
      });
    }
  }

  async processInboxItem(itemId: string, userId: string, createdTaskId?: string): Promise<DbResult<void>> {
    try {
      const updateData: {
        status: "processed";
        processedAt: Date;
        createdTaskId?: string;
      } = {
        status: "processed",
        processedAt: new Date(),
      };

      if (createdTaskId !== undefined) {
        updateData.createdTaskId = createdTaskId;
      }

      await this.momentumRepository.updateInboxItem(itemId, userId, updateData);
      return ok(undefined);
    } catch (error) {
      return err({
        code: "INBOX_ITEM_PROCESS_ERROR",
        message: "Error processing inbox item",
        details: error,
      });
    }
  }

  async getStats(userId: string): Promise<DbResult<{
    tasks: {
      total: number;
      todo: number;
      inProgress: number;
      completed: number;
      cancelled: number;
    };
    projects: {
      total: number;
      active: number;
      onHold: number;
      completed: number;
      archived: number;
    };
  }>> {
    try {
      const [taskStatsRaw, projectStatsRaw] = await Promise.all([
        this.momentumRepository.getTaskStats(userId),
        this.momentumRepository.getProjectStats(userId),
      ]);

      const taskStatsResult = this.handleRepositoryResult(taskStatsRaw);
      const projectStatsResult = this.handleRepositoryResult(projectStatsRaw);

      if (isErr(taskStatsResult)) {
        return err({
          code: "TASK_STATS_GET_FAILED",
          message: "Failed to get task stats",
          details: taskStatsResult.error,
        });
      }
      if (isErr(projectStatsResult)) {
        return err({
          code: "PROJECT_STATS_GET_FAILED",
          message: "Failed to get project stats",
          details: projectStatsResult.error,
        });
      }

      if (!isOk(taskStatsResult) || !isOk(projectStatsResult)) {
        return err({
          code: "STATS_GET_FAILED",
          message: "Invalid result state for stats",
        });
      }

      const taskStats = taskStatsResult.data;
      const projectStats = projectStatsResult.data;

      return ok({
        tasks: taskStats,
        projects: projectStats,
      });
    } catch (error) {
      return err({
        code: "STATS_GET_ERROR",
        message: "Error getting stats",
        details: error,
      });
    }
  }

  // ============================================================================
  // PENDING APPROVAL TASKS (AI-generated tasks awaiting user approval)
  // ============================================================================

  async getPendingApprovalTasks(_userId: string): Promise<DbResult<Task[]>> {
    try {
      // Note: The current schema doesn't have an approval status field.
      // This method is a placeholder for when the approval system is implemented.
      // For now, return empty array until the approval system and database schema
      // are enhanced to support task approval workflows.
      return ok([]);
    } catch (error) {
      return err({
        code: "PENDING_APPROVAL_TASKS_ERROR",
        message: "Error getting pending approval tasks",
        details: error,
      });
    }
  }

  /**
   * Approve an AI-generated task by changing its status to active
   */
  async approveTask(taskId: string, userId: string): Promise<DbResult<Task | null>> {
    try {
      // Get the task to ensure it exists and belongs to the user
      const existingRawResult = await this.momentumRepository.getTask(taskId, userId);
      const existingResult = this.handleRepositoryResult(existingRawResult);

      if (isErr(existingResult)) {
        return err({
          code: "TASK_APPROVE_GET_FAILED",
          message: "Failed to get task for approval",
          details: existingResult.error,
        });
      }

      if (!isOk(existingResult)) {
        return err({
          code: "TASK_APPROVE_GET_FAILED",
          message: "Invalid result state",
        });
      }

      const existingTask = existingResult.data;
      if (!existingTask) {
        return ok(null);
      }

      // Update task to active status (business rule: approval moves task to todo)
      await this.momentumRepository.updateTask(taskId, userId, {
        status: "todo", // Move to active todo status
      });

      // Get the updated task
      const updatedRawResult = await this.momentumRepository.getTask(taskId, userId);
      const updatedResult = this.handleRepositoryResult(updatedRawResult);

      if (isErr(updatedResult)) {
        return err({
          code: "TASK_APPROVE_UPDATE_GET_FAILED",
          message: "Failed to get updated task after approval",
          details: updatedResult.error,
        });
      }

      if (!isOk(updatedResult)) {
        return err({
          code: "TASK_APPROVE_UPDATE_GET_FAILED",
          message: "Invalid result state",
        });
      }

      const dbTask = updatedResult.data;
      const updatedTask = dbTask ? this.transformTask(dbTask) : null;

      // TODO: When approval system is implemented, add audit trail here
      // await this.momentumRepository.createMomentumAction(taskId, userId, "approve", {
      //   previousStatus: existingTask.status,
      //   newStatus: "todo"
      // });

      return ok(updatedTask);
    } catch (error) {
      return err({
        code: "TASK_APPROVE_ERROR",
        message: "Error approving task",
        details: error,
      });
    }
  }
}

export const productivityService = new ProductivityService();
