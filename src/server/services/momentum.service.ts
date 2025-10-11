// OmniMomentum business logic service
import { MomentumRepository } from "@repo";
import type { Zone, InboxItem } from "@/server/db/types";
import type {
  Project,
  CreateProject,
  UpdateProject,
  Task,
  CreateTask,
  UpdateTask,
  TaskWithRelationsDTO,
  GoalDTO,
  CreateGoalDTO,
  UpdateGoalDTO,
  DailyPulseLogDTO,
  CreateDailyPulseLogDTO,
  UpdateDailyPulseLogDTO,
  ProjectFilters,
  TaskFilters,
  GoalFilters,
  QuickTaskCreateDTO,
  BulkTaskUpdateDTO,
} from "@/server/db/business-schemas/business-schema";

export class MomentumService {
  private readonly momentumRepository = new MomentumRepository();

  // ============================================================================
  // PROJECTS (Pathways)
  // ============================================================================

  async createProject(userId: string, data: CreateProject): Promise<Project> {
    const projectData = {
      name: data.name,
      zoneId: data.zoneId,
      status: data.status ?? "active",
      dueDate: data.dueDate,
      details: data.details ?? {},
    };

    const project = await this.momentumRepository.createProject(userId, projectData);
    return project;
  }

  async getProjects(userId: string, filters: ProjectFilters = {}): Promise<Project[]> {
    // Apply filters - for now just zoneId, can expand later
    const projects = await this.momentumRepository.getProjects(userId, filters);

    // Apply additional filters
    let filteredProjects = projects;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredProjects = filteredProjects.filter((p) => {
        const hasNameMatch = p.name.toLowerCase().includes(search);
        const hasDescriptionMatch =
          p.details &&
          typeof p.details === "object" &&
          "description" in p.details &&
          typeof p.details["description"] === "string" &&
          p.details["description"].toLowerCase().includes(search);
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

    return filteredProjects;
  }

  async getProject(projectId: string, userId: string): Promise<Project | null> {
    const project = await this.momentumRepository.getProject(projectId, userId);
    return project;
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProject,
  ): Promise<Project | null> {
    await this.momentumRepository.updateProject(projectId, userId, data);
    const project = await this.momentumRepository.getProject(projectId, userId);
    return project;
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
      name: data.name,
      projectId: data.projectId,
      parentTaskId: data.parentTaskId,
      status: data.status ?? "todo",
      priority: data.priority ?? "medium",
      dueDate: data.dueDate,
      details: data.details ?? {},
    };

    const task = await this.momentumRepository.createTask(userId, taskData);

    // Add contact tags if provided
    if (data.taggedContactIds && data.taggedContactIds.length > 0) {
      await this.momentumRepository.addTaskContactTags(task.id, data.taggedContactIds);
    }

    return task;
  }

  async createQuickTask(userId: string, data: QuickTaskCreateDTO): Promise<Task> {
    return this.createTask(userId, {
      name: data.name,
      priority: data.priority,
      dueDate: data.dueDate,
      projectId: data.projectId,
      parentTaskId: data.parentTaskId,
    });
  }

  async getTasks(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const dbFilters = {
      projectId: filters.projectId,
      parentTaskId: filters.parentTaskId,
      status: filters.status,
      priority: filters.priority,
    };

    const tasks = await this.momentumRepository.getTasks(userId, dbFilters);

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
    const task = await this.momentumRepository.getTask(taskId, userId);
    return task;
  }

  async getTaskWithRelations(taskId: string, userId: string): Promise<TaskWithRelationsDTO | null> {
    const taskData = await this.momentumRepository.getTaskWithRelations(taskId, userId);
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
    const tasks = await this.momentumRepository.getTasksWithProject(userId, projectId);
    return tasks;
  }

  async getSubtasks(parentTaskId: string, userId: string): Promise<Task[]> {
    const subtasks = await this.momentumRepository.getSubtasks(parentTaskId, userId);
    return subtasks;
  }

  /**
   * Get subtasks with parent task validation
   */
  async getSubtasksWithValidation(
    taskId: string,
    userId: string,
  ): Promise<{ subtasks: Task[]; parentTask: Task | null }> {
    // Ensure parent task exists and belongs to user
    const parentTask = await this.momentumRepository.getTask(taskId, userId);

    if (!parentTask) {
      return { subtasks: [], parentTask: null };
    }

    // Get subtasks for this parent task
    const subtasks = await this.momentumRepository.getSubtasks(taskId, userId);

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
    const parentTask = await this.momentumRepository.getTask(taskId, userId);

    if (!parentTask) {
      return { subtask: null, parentTask: null };
    }

    // Build validated data with parent task context
    const taskData: CreateTask = {
      ...subtaskData,
      parentTaskId: taskId, // Ensure subtask is linked to parent
      // Inherit project from parent if not specified
      projectId: subtaskData.projectId ?? parentTask.projectId,
    };

    const subtask = await this.momentumRepository.createTask(userId, taskData);

    // Add contact tags if provided
    if (taskData.taggedContactIds && taskData.taggedContactIds.length > 0) {
      await this.momentumRepository.addTaskContactTags(subtask.id, taskData.taggedContactIds);
    }

    return { subtask, parentTask };
  }

  async updateTask(taskId: string, userId: string, data: UpdateTask): Promise<Task | null> {
    // Handle completion status changes
    const updates: UpdateTask = { ...data };
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

    const task = await this.momentumRepository.getTask(taskId, userId);
    return task;
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
    const subtasks = await this.momentumRepository.getSubtasks(taskId, userId);
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
      contactId: data.contactId,
      goalType: data.goalType,
      name: data.name,
      status: data.status ?? "on_track",
      targetDate: data.targetDate,
      details: data.details ?? {},
    };

    const goal = await this.momentumRepository.createGoal(userId, goalData);
    return goal;
  }

  async getGoals(userId: string, filters: GoalFilters = {}): Promise<GoalDTO[]> {
    const dbFilters = {
      contactId: filters.contactId,
      goalType: filters.goalType,
      status: filters.status,
    };

    const goals = await this.momentumRepository.getGoals(userId, dbFilters);

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
    const goal = await this.momentumRepository.getGoal(goalId, userId);
    return goal;
  }

  async updateGoal(goalId: string, userId: string, data: UpdateGoalDTO): Promise<GoalDTO | null> {
    await this.momentumRepository.updateGoal(goalId, userId, data);
    const goal = await this.momentumRepository.getGoal(goalId, userId);
    return goal;
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
    const log = await this.momentumRepository.createDailyPulseLog(userId, data);
    return log;
  }

  async getDailyPulseLogs(userId: string, limit = 30): Promise<DailyPulseLogDTO[]> {
    const logs = await this.momentumRepository.getDailyPulseLogs(userId, limit);
    return logs;
  }

  async getDailyPulseLog(userId: string, logDate: Date): Promise<DailyPulseLogDTO | null> {
    const log = await this.momentumRepository.getDailyPulseLog(userId, logDate);
    return log;
  }

  async updateDailyPulseLog(
    logId: string,
    userId: string,
    data: UpdateDailyPulseLogDTO,
  ): Promise<DailyPulseLogDTO | null> {
    await this.momentumRepository.updateDailyPulseLog(logId, userId, { details: data.details });
    // Get the log back - need to find by ID
    const logs = await this.momentumRepository.getDailyPulseLogs(userId, 100);
    const log = logs.find((l) => l.id === logId);
    return log ?? null;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getZones(): Promise<Zone[]> {
    return this.momentumRepository.getZones();
  }

  async createInboxItem(userId: string, rawText: string): Promise<InboxItem> {
    return this.momentumRepository.createInboxItem(userId, { rawText });
  }

  async getInboxItems(userId: string, status?: string): Promise<InboxItem[]> {
    return this.momentumRepository.getInboxItems(userId, status);
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
    const [taskStats, projectStats] = await Promise.all([
      this.momentumRepository.getTaskStats(userId),
      this.momentumRepository.getProjectStats(userId),
    ]);

    return {
      tasks: taskStats,
      projects: projectStats,
    };
  }

  // ============================================================================
  // PENDING APPROVAL TASKS (AI-generated tasks awaiting user approval)
  // ============================================================================

  async getPendingApprovalTasks(userId: string): Promise<Task[]> {
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
    const existingTask = await this.momentumRepository.getTask(taskId, userId);
    if (!existingTask) {
      return null;
    }

    // Update task to active status (business rule: approval moves task to todo)
    const updatedTask = await this.momentumRepository.updateTask(taskId, userId, {
      status: "todo", // Move to active todo status
    });

    // TODO: When approval system is implemented, add audit trail here
    // await this.momentumRepository.createMomentumAction(taskId, userId, "approve", {
    //   previousStatus: existingTask.status,
    //   newStatus: "todo"
    // });

    return updatedTask;
  }
}

export const momentumService = new MomentumService();
