// OmniMomentum business logic service
import { MomentumRepository } from "@repo";
import { Result, ok, err, isErr, DbResult } from "@/lib/utils/result";
import { isObject, getString } from "@/lib/utils/type-guards";
import type {
  Project,
  CreateProject,
  UpdateProject,
  ProjectFilters,
} from "@/server/db/business-schemas/projects";
import type { Task, CreateTask, UpdateTask, TaskFilters } from "@/server/db/business-schemas/tasks";
import type { Zone } from "@/server/db/business-schemas/zones";
import type { InboxItem } from "@/server/db/business-schemas/inbox";

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
  goalType?: "practitioner_business" | "practitioner_personal" | "client_wellness";
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

export class MomentumService {
  private readonly momentumRepository = new MomentumRepository();

  // Helper function to unwrap DbResult
  private unwrapDbResult<T>(result: DbResult<T>): T {
    if (isErr(result)) {
      const error = result.error as { message: string };
      throw new Error(`Database error: ${error.message}`);
    }
    return (result as { success: true; data: T }).data;
  }

  // ============================================================================
  // PROJECTS (Pathways)
  // ============================================================================

  async createProject(userId: string, data: CreateProject): Promise<Result<Project, string>> {
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
      const project = this.unwrapDbResult<Project>(result);
      return ok(project);
    } catch (error) {
      return err(error instanceof Error ? error.message : "Failed to create project");
    }
  }

  async getProjects(
    userId: string,
    filters: ProjectFilters = {},
  ): Promise<Result<Project[], string>> {
    try {
      // Apply filters - for now just zoneId, can expand later
      const dbFilters: { zoneId?: number; status?: string[] } = {
        ...filters,
      };
      if (filters.zoneId !== undefined) {
        dbFilters.zoneId = filters.zoneId;
      }
      const result = await this.momentumRepository.getProjects(userId, dbFilters);
      const projects = this.unwrapDbResult<Project[]>(result);

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
      return err(error instanceof Error ? error.message : "Failed to get projects");
    }
  }

  async getProject(projectId: string, userId: string): Promise<Project | null> {
    const result = await this.momentumRepository.getProject(projectId, userId);
    return this.unwrapDbResult<Project | null>(result);
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProject,
  ): Promise<Project | null> {
    await this.momentumRepository.updateProject(projectId, userId, data);
    const result = await this.momentumRepository.getProject(projectId, userId);
    return this.unwrapDbResult<Project | null>(result);
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    // TODO: Add business logic to handle cascade deletion of tasks if needed
    await this.momentumRepository.deleteProject(projectId, userId);
  }

  // ============================================================================
  // TASKS (Hierarchical)
  // ============================================================================

  async createTask(userId: string, data: CreateTask): Promise<Task> {
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
    const task = this.unwrapDbResult<Task>(result);

    // Add contact tags if provided
    if (data.taggedContactIds && data.taggedContactIds.length > 0) {
      await this.momentumRepository.addTaskContactTags(task.id, data.taggedContactIds);
    }

    return task;
  }

  async createQuickTask(userId: string, data: QuickTaskCreateDTO): Promise<Task> {
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

  async getTasks(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
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
    const tasks = this.unwrapDbResult<Task[]>(result);

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

    return filteredTasks;
  }

  async getTask(taskId: string, userId: string): Promise<Task | null> {
    const result = await this.momentumRepository.getTask(taskId, userId);
    return this.unwrapDbResult<Task | null>(result);
  }

  async getTaskWithRelations(taskId: string, userId: string): Promise<TaskWithRelationsDTO | null> {
    const result = await this.momentumRepository.getTaskWithRelations(taskId, userId);
    const taskData = this.unwrapDbResult<{
      task: Task;
      project: Project | null;
      parentTask: Task | null;
      subtasks: Task[];
      taggedContacts: Array<{ id: string; displayName: string; primaryEmail?: string }>;
      zone: { id: number; name: string; color: string | null; iconName: string | null } | null;
    } | null>(result);
    if (!taskData) return null;

    return {
      ...taskData.task,
      project: taskData.project,
      parentTask: taskData.parentTask,
      subtasks: taskData.subtasks,
      taggedContacts: taskData.taggedContacts,
      zone: taskData.zone,
    };
  }

  async getProjectTasks(projectId: string, userId: string): Promise<Task[]> {
    const result = await this.momentumRepository.getTasksWithProject(userId, projectId);
    return this.unwrapDbResult<Task[]>(result);
  }

  async getSubtasks(parentTaskId: string, userId: string): Promise<Task[]> {
    const result = await this.momentumRepository.getSubtasks(parentTaskId, userId);
    return this.unwrapDbResult<Task[]>(result);
  }

  /**
   * Get subtasks with parent task validation
   */
  async getSubtasksWithValidation(
    taskId: string,
    userId: string,
  ): Promise<{ subtasks: Task[]; parentTask: Task | null }> {
    // Ensure parent task exists and belongs to user
    const parentResult = await this.momentumRepository.getTask(taskId, userId);
    const parentTask = this.unwrapDbResult<Task | null>(parentResult);

    if (!parentTask) {
      return { subtasks: [], parentTask: null };
    }

    // Get subtasks for this parent task
    const subtasksResult = await this.momentumRepository.getSubtasks(taskId, userId);
    const subtasks = this.unwrapDbResult<Task[]>(subtasksResult);

    return { subtasks, parentTask };
  }

  /**
   * Create subtask with parent task validation and business logic
   */
  async createSubtaskWithValidation(
    taskId: string,
    userId: string,
    subtaskData: CreateTask,
  ): Promise<{ subtask: Task | null; parentTask: Task | null }> {
    // Ensure parent task exists and belongs to user
    const parentResult = await this.momentumRepository.getTask(taskId, userId);
    const parentTask = this.unwrapDbResult<Task | null>(parentResult);

    if (!parentTask) {
      return { subtask: null, parentTask: null };
    }

    // Build validated data with parent task context
    const taskData: CreateTask = {
      ...subtaskData,
      userId,
      parentTaskId: taskId, // Ensure subtask is linked to parent
      // Inherit project from parent if not specified
      projectId: subtaskData.projectId ?? parentTask.projectId,
    };

    const subtaskResult = await this.momentumRepository.createTask(userId, taskData);
    const subtask = this.unwrapDbResult<Task>(subtaskResult);

    // Add contact tags if provided
    if (taskData.taggedContactIds && taskData.taggedContactIds.length > 0) {
      await this.momentumRepository.addTaskContactTags(subtask.id, taskData.taggedContactIds);
    }

    return { subtask, parentTask };
  }

  async updateTask(taskId: string, userId: string, data: UpdateTask): Promise<Task | null> {
    // Handle completion status changes
    const updates: UpdateTask & { completedAt?: Date } = { ...data };
    if (data.status === "done" && !updates.completedAt) {
      updates.completedAt = new Date();
    } else if (data.status !== "done" && updates.completedAt) {
      updates.completedAt = null;
    }

    await this.momentumRepository.updateTask(taskId, userId, updates);

    // Update contact tags if provided
    if (data.taggedContactIds !== undefined) {
      await this.momentumRepository.removeTaskContactTags(taskId);
      if (data.taggedContactIds.length > 0) {
        await this.momentumRepository.addTaskContactTags(taskId, data.taggedContactIds);
      }
    }

    const result = await this.momentumRepository.getTask(taskId, userId);
    return this.unwrapDbResult<Task | null>(result);
  }

  async bulkUpdateTasks(userId: string, data: BulkTaskUpdateDTO): Promise<Task[]> {
    const updatedTasks: Task[] = [];

    for (const taskId of data.taskIds) {
      const task = await this.updateTask(taskId, userId, data.updates);
      if (task) {
        updatedTasks.push(task);
      }
    }

    return updatedTasks;
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    // Business logic: Also delete all subtasks
    const subtasksResult = await this.momentumRepository.getSubtasks(taskId, userId);
    const subtasks = this.unwrapDbResult<Task[]>(subtasksResult);
    for (const subtask of subtasks) {
      await this.momentumRepository.deleteTask(subtask.id, userId);
    }

    await this.momentumRepository.deleteTask(taskId, userId);
  }

  // ============================================================================
  // GOALS
  // ============================================================================

  async createGoal(userId: string, data: CreateGoalDTO): Promise<GoalDTO> {
    const goalData = {
      userId,
      contactId: data.contactId,
      goalType: data.goalType,
      name: data.name,
      status: data.status ?? "on_track",
      targetDate: data.targetDate,
      details: data.details ?? {},
    };

    const result = await this.momentumRepository.createGoal(userId, goalData);
    return this.unwrapDbResult<GoalDTO>(result);
  }

  async getGoals(userId: string, filters: GoalFilters = {}): Promise<GoalDTO[]> {
    const dbFilters: { contactId?: string; goalType?: string[]; status?: string[] } = {};
    if (filters.contactId !== undefined) dbFilters.contactId = filters.contactId;
    if (filters.goalType !== undefined) dbFilters.goalType = filters.goalType;
    if (filters.status !== undefined) dbFilters.status = filters.status;

    const result = await this.momentumRepository.getGoals(userId, dbFilters);
    const goals = this.unwrapDbResult<GoalDTO[]>(result);

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

    return filteredGoals;
  }

  async getGoal(goalId: string, userId: string): Promise<GoalDTO | null> {
    const result = await this.momentumRepository.getGoal(goalId, userId);
    return this.unwrapDbResult<GoalDTO | null>(result);
  }

  async updateGoal(goalId: string, userId: string, data: UpdateGoalDTO): Promise<GoalDTO | null> {
    await this.momentumRepository.updateGoal(goalId, userId, data);
    const result = await this.momentumRepository.getGoal(goalId, userId);
    return this.unwrapDbResult<GoalDTO | null>(result);
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    await this.momentumRepository.deleteGoal(goalId, userId);
  }

  // ============================================================================
  // DAILY PULSE LOGS
  // ============================================================================

  async createDailyPulseLog(
    userId: string,
    data: CreateDailyPulseLogDTO,
  ): Promise<DailyPulseLogDTO> {
    const logData = {
      userId,
      logDate: new Date().toISOString().split("T")[0] as string, // Today's date as string
      details: data.details ?? {},
    };
    const result = await this.momentumRepository.createDailyPulseLog(userId, logData);
    return this.unwrapDbResult<DailyPulseLogDTO>(result);
  }

  async getDailyPulseLogs(userId: string, limit = 30): Promise<DailyPulseLogDTO[]> {
    const result = await this.momentumRepository.getDailyPulseLogs(userId, limit);
    return this.unwrapDbResult<DailyPulseLogDTO[]>(result);
  }

  async getDailyPulseLog(userId: string, logDate: Date): Promise<DailyPulseLogDTO | null> {
    const result = await this.momentumRepository.getDailyPulseLog(userId, logDate);
    return this.unwrapDbResult<DailyPulseLogDTO | null>(result);
  }

  async updateDailyPulseLog(
    logId: string,
    userId: string,
    data: UpdateDailyPulseLogDTO,
  ): Promise<DailyPulseLogDTO | null> {
    await this.momentumRepository.updateDailyPulseLog(logId, userId, { details: data.details });
    // Get the log back - need to find by ID
    const logsResult = await this.momentumRepository.getDailyPulseLogs(userId, 100);
    const logs = this.unwrapDbResult<DailyPulseLogDTO[]>(logsResult);
    const log = logs.find((l) => l.id === logId);
    return log ?? null;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getZones(): Promise<Zone[]> {
    const result = await this.momentumRepository.getZones();
    return this.unwrapDbResult<Zone[]>(result);
  }

  async createInboxItem(userId: string, rawText: string): Promise<InboxItem> {
    const result = await this.momentumRepository.createInboxItem(userId, { rawText });
    return this.unwrapDbResult<InboxItem>(result);
  }

  async getInboxItems(userId: string, status?: string): Promise<InboxItem[]> {
    const result = await this.momentumRepository.getInboxItems(userId, status);
    return this.unwrapDbResult<InboxItem[]>(result);
  }

  async processInboxItem(itemId: string, userId: string, createdTaskId?: string): Promise<void> {
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
  }

  async getStats(userId: string): Promise<{
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
  }> {
    const [taskStatsResult, projectStatsResult] = await Promise.all([
      this.momentumRepository.getTaskStats(userId),
      this.momentumRepository.getProjectStats(userId),
    ]);

    const taskStats = this.unwrapDbResult<{
      total: number;
      todo: number;
      inProgress: number;
      completed: number;
      cancelled: number;
    }>(taskStatsResult);
    const projectStats = this.unwrapDbResult<{
      total: number;
      active: number;
      onHold: number;
      completed: number;
      archived: number;
    }>(projectStatsResult);

    return {
      tasks: taskStats,
      projects: projectStats,
    };
  }

  // ============================================================================
  // PENDING APPROVAL TASKS (AI-generated tasks awaiting user approval)
  // ============================================================================

  async getPendingApprovalTasks(_userId: string): Promise<Task[]> {
    // Note: The current schema doesn't have an approval status field.
    // This method is a placeholder for when the approval system is implemented.
    // For now, return empty array until the approval system and database schema
    // are enhanced to support task approval workflows.
    return [];
  }

  /**
   * Approve an AI-generated task by changing its status to active
   */
  async approveTask(taskId: string, userId: string): Promise<Task | null> {
    // Get the task to ensure it exists and belongs to the user
    const existingResult = await this.momentumRepository.getTask(taskId, userId);
    const existingTask = this.unwrapDbResult<Task | null>(existingResult);
    if (!existingTask) {
      return null;
    }

    // Update task to active status (business rule: approval moves task to todo)
    await this.momentumRepository.updateTask(taskId, userId, {
      status: "todo", // Move to active todo status
    });

    // Get the updated task
    const updatedResult = await this.momentumRepository.getTask(taskId, userId);
    const updatedTask = this.unwrapDbResult<Task | null>(updatedResult);

    // TODO: When approval system is implemented, add audit trail here
    // await this.momentumRepository.createMomentumAction(taskId, userId, "approve", {
    //   previousStatus: existingTask.status,
    //   newStatus: "todo"
    // });

    return updatedTask;
  }
}

export const momentumService = new MomentumService();
