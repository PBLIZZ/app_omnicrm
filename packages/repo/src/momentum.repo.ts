// OmniMomentum repository - Projects, Tasks, Goals, and Daily Pulse
import { getDb } from "./db";
import {
  projects,
  tasks,
  goals,
  dailyPulseLogs,
  zones,
  inboxItems,
  taskContactTags,
  contacts
} from "./schema";
import type { InboxItem } from "./schema";
import { eq, desc, and, asc, isNull, inArray } from "drizzle-orm";
import type {
  ProjectDTO,
  CreateProjectDTO,
  UpdateProjectDTO,
  TaskDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  GoalDTO,
  CreateGoalDTO,
  UpdateGoalDTO,
  DailyPulseLogDTO,
  CreateDailyPulseLogDTO,
  UpdateDailyPulseLogDTO,
  ProjectFilters,
  TaskFilters,
  GoalFilters,
} from "@omnicrm/contracts";
import {
  ProjectDTOSchema,
  TaskDTOSchema,
  GoalDTOSchema,
  DailyPulseLogDTOSchema,
} from "@omnicrm/contracts";

export class MomentumRepository {
  // ============================================================================
  // PROJECTS (Pathways)
  // ============================================================================

  async createProject(userId: string, data: CreateProjectDTO): Promise<ProjectDTO> {
    const db = await getDb();
    const [project] = await db
      .insert(projects)
      .values({
        ...data,
        userId,
        zoneId: data.zoneId ?? null,
        dueDate: data.dueDate ?? null,
        details: data.details ?? {},
      })
      .returning();
    if (!project) throw new Error("Failed to create project");
    return ProjectDTOSchema.parse(this.mapProjectToDTO(project));
  }

  async getProjects(userId: string, filters: ProjectFilters = {}): Promise<ProjectDTO[]> {
    const db = await getDb();
    const whereConditions = [eq(projects.userId, userId)];

    if (filters.zoneId !== undefined) {
      whereConditions.push(eq(projects.zoneId, filters.zoneId));
    }

    if (filters.status && filters.status.length > 0) {
      const validStatuses = filters.status.filter((status): status is "active" | "on_hold" | "completed" | "archived" =>
        ["active", "on_hold", "completed", "archived"].includes(status)
      );
      if (validStatuses.length > 0) {
        whereConditions.push(inArray(projects.status, validStatuses));
      }
    }

    const projectsData = await db
      .select()
      .from(projects)
      .where(and(...whereConditions))
      .orderBy(desc(projects.updatedAt));

    return projectsData.map(p => ProjectDTOSchema.parse(this.mapProjectToDTO(p)));
  }

  async getProject(projectId: string, userId: string): Promise<ProjectDTO | null> {
    const db = await getDb();
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
    return project ? ProjectDTOSchema.parse(this.mapProjectToDTO(project)) : null;
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProjectDTO,
  ): Promise<void> {
    const db = await getDb();
    // Filter out undefined values for exact optional property types
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    await db
      .update(projects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    const db = await getDb();
    await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  }

  // ============================================================================
  // TASKS (Hierarchical)
  // ============================================================================

  async createTask(userId: string, data: CreateTaskDTO): Promise<TaskDTO> {
    const db = await getDb();
    const [task] = await db
      .insert(tasks)
      .values({
        ...data,
        userId,
        projectId: data.projectId || null,
        parentTaskId: data.parentTaskId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        details: data.details || {},
      })
      .returning();
    if (!task) throw new Error("Failed to create task");
    return TaskDTOSchema.parse(this.mapTaskToDTO(task));
  }

  async getTasks(
    userId: string,
    filters: TaskFilters = {}
  ): Promise<TaskDTO[]> {
    const db = await getDb();
    const whereConditions = [eq(tasks.userId, userId)];

    if (filters.projectId) {
      whereConditions.push(eq(tasks.projectId, filters.projectId));
    }

    if (filters.parentTaskId !== undefined) {
      if (filters.parentTaskId === null) {
        whereConditions.push(isNull(tasks.parentTaskId));
      } else {
        whereConditions.push(eq(tasks.parentTaskId, filters.parentTaskId));
      }
    }

    if (filters.status && filters.status.length > 0) {
      const validStatuses = filters.status.filter((status): status is "todo" | "in_progress" | "done" | "canceled" =>
        ["todo", "in_progress", "done", "canceled"].includes(status)
      );
      if (validStatuses.length > 0) {
        whereConditions.push(inArray(tasks.status, validStatuses));
      }
    }

    if (filters.priority && filters.priority.length > 0) {
      const validPriorities = filters.priority.filter((priority): priority is "low" | "medium" | "high" | "urgent" =>
        ["low", "medium", "high", "urgent"].includes(priority)
      );
      if (validPriorities.length > 0) {
        whereConditions.push(inArray(tasks.priority, validPriorities));
      }
    }

    const tasksData = await db
      .select()
      .from(tasks)
      .where(and(...whereConditions))
      .orderBy(desc(tasks.updatedAt));

    return tasksData.map(t => TaskDTOSchema.parse(this.mapTaskToDTO(t)));
  }

  async getTask(taskId: string, userId: string): Promise<TaskDTO | null> {
    const db = await getDb();
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
    return task ? TaskDTOSchema.parse(this.mapTaskToDTO(task)) : null;
  }

  async getTasksWithProject(userId: string, projectId: string): Promise<TaskDTO[]> {
    const db = await getDb();
    const tasksData = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.projectId, projectId)))
      .orderBy(desc(tasks.updatedAt));

    return tasksData.map(t => TaskDTOSchema.parse(this.mapTaskToDTO(t)));
  }

  async getSubtasks(parentTaskId: string, userId: string): Promise<TaskDTO[]> {
    const db = await getDb();
    const tasksData = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.parentTaskId, parentTaskId)))
      .orderBy(asc(tasks.createdAt));

    return tasksData.map(t => TaskDTOSchema.parse(this.mapTaskToDTO(t)));
  }

  async updateTask(
    taskId: string,
    userId: string,
    data: UpdateTaskDTO,
  ): Promise<void> {
    const db = await getDb();
    // Filter out undefined values for exact optional property types
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    await db
      .update(tasks)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    const db = await getDb();
    // Delete task and its contact tags
    await db.delete(taskContactTags).where(eq(taskContactTags.taskId, taskId));
    await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  // ============================================================================
  // TASK CONTACT TAGS (Many-to-Many)
  // ============================================================================

  async addTaskContactTags(taskId: string, contactIds: string[]): Promise<void> {
    if (contactIds.length === 0) return;

    const db = await getDb();
    const tagData = contactIds.map(contactId => ({
      taskId,
      contactId,
    }));

    await db.insert(taskContactTags).values(tagData).onConflictDoNothing();
  }

  async removeTaskContactTags(taskId: string, contactIds?: string[]): Promise<void> {
    const db = await getDb();

    if (contactIds && contactIds.length > 0) {
      // Remove specific contact tags
      await db
        .delete(taskContactTags)
        .where(and(
          eq(taskContactTags.taskId, taskId),
          inArray(taskContactTags.contactId, contactIds)
        ));
    } else {
      // Remove all contact tags for this task
      await db.delete(taskContactTags).where(eq(taskContactTags.taskId, taskId));
    }
  }

  async getTaskContactTags(taskId: string): Promise<Array<{ taskId: string; contactId: string }>> {
    const db = await getDb();
    return await db
      .select()
      .from(taskContactTags)
      .where(eq(taskContactTags.taskId, taskId));
  }

  // ============================================================================
  // GOALS
  // ============================================================================

  async createGoal(userId: string, data: CreateGoalDTO): Promise<GoalDTO> {
    const db = await getDb();
    const [goal] = await db
      .insert(goals)
      .values({
        ...data,
        userId,
        contactId: data.contactId ?? null,
        targetDate: data.targetDate ?? null,
        details: data.details ?? {},
      })
      .returning();
    if (!goal) throw new Error("Failed to create goal");
    return GoalDTOSchema.parse(this.mapGoalToDTO(goal));
  }

  async getGoals(
    userId: string,
    filters: GoalFilters = {}
  ): Promise<GoalDTO[]> {
    const db = await getDb();
    const whereConditions = [eq(goals.userId, userId)];

    if (filters.contactId) {
      whereConditions.push(eq(goals.contactId, filters.contactId));
    }

    if (filters.goalType && filters.goalType.length > 0) {
      const validGoalTypes = filters.goalType.filter((type): type is "practitioner_business" | "practitioner_personal" | "client_wellness" =>
        ["practitioner_business", "practitioner_personal", "client_wellness"].includes(type)
      );
      if (validGoalTypes.length > 0) {
        whereConditions.push(inArray(goals.goalType, validGoalTypes));
      }
    }

    if (filters.status && filters.status.length > 0) {
      const validStatuses = filters.status.filter((status): status is "on_track" | "at_risk" | "achieved" | "abandoned" =>
        ["on_track", "at_risk", "achieved", "abandoned"].includes(status)
      );
      if (validStatuses.length > 0) {
        whereConditions.push(inArray(goals.status, validStatuses));
      }
    }

    const goalsData = await db
      .select()
      .from(goals)
      .where(and(...whereConditions))
      .orderBy(desc(goals.updatedAt));

    return goalsData.map(g => GoalDTOSchema.parse(this.mapGoalToDTO(g)));
  }

  async getGoal(goalId: string, userId: string): Promise<GoalDTO | null> {
    const db = await getDb();
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
    return goal ? GoalDTOSchema.parse(this.mapGoalToDTO(goal)) : null;
  }

  async updateGoal(
    goalId: string,
    userId: string,
    data: UpdateGoalDTO,
  ): Promise<void> {
    const db = await getDb();
    // Filter out undefined values for exact optional property types
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    await db
      .update(goals)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    const db = await getDb();
    await db.delete(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  }

  // ============================================================================
  // DAILY PULSE LOGS
  // ============================================================================

  async createDailyPulseLog(userId: string, data: CreateDailyPulseLogDTO): Promise<DailyPulseLogDTO> {
    const db = await getDb();
    const logDate = data.logDate || new Date();
    const isoString = logDate.toISOString();
    const logDateString = isoString.split('T')[0]; // Convert to YYYY-MM-DD format
    if (!logDateString) {
      throw new Error("Failed to format log date");
    }

    const [log] = await db
      .insert(dailyPulseLogs)
      .values({
        userId,
        logDate: logDateString,
        details: data.details ?? {},
      })
      .returning();
    if (!log) throw new Error("Failed to create daily pulse log");
    return DailyPulseLogDTOSchema.parse(this.mapDailyPulseLogToDTO(log));
  }

  async getDailyPulseLogs(userId: string, limit = 30): Promise<DailyPulseLogDTO[]> {
    const db = await getDb();
    const logsData = await db
      .select()
      .from(dailyPulseLogs)
      .where(eq(dailyPulseLogs.userId, userId))
      .orderBy(desc(dailyPulseLogs.logDate))
      .limit(limit);

    return logsData.map(l => DailyPulseLogDTOSchema.parse(this.mapDailyPulseLogToDTO(l)));
  }

  async getDailyPulseLog(userId: string, logDate: Date): Promise<DailyPulseLogDTO | null> {
    const db = await getDb();
    const isoString = logDate.toISOString();
    const dateString = isoString.split('T')[0]; // Convert to YYYY-MM-DD format
    if (!dateString) {
      throw new Error("Failed to format log date");
    }
    const [log] = await db
      .select()
      .from(dailyPulseLogs)
      .where(and(
        eq(dailyPulseLogs.userId, userId),
        eq(dailyPulseLogs.logDate, dateString)
      ));
    return log ? DailyPulseLogDTOSchema.parse(this.mapDailyPulseLogToDTO(log)) : null;
  }

  async updateDailyPulseLog(
    logId: string,
    userId: string,
    data: UpdateDailyPulseLogDTO,
  ): Promise<void> {
    const db = await getDb();
    // Filter out undefined values for exact optional property types
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    await db
      .update(dailyPulseLogs)
      .set(updateData)
      .where(and(eq(dailyPulseLogs.id, logId), eq(dailyPulseLogs.userId, userId)));
  }

  // ============================================================================
  // ZONES (Lookup)
  // ============================================================================

  async getZones(): Promise<Array<{ id: number; name: string; color: string | null; iconName: string | null }>> {
    const db = await getDb();
    return await db.select().from(zones).orderBy(asc(zones.name));
  }

  // ============================================================================
  // INBOX ITEMS (AI Quick Capture)
  // ============================================================================

  async createInboxItem(userId: string, data: { rawText: string; status?: "unprocessed" | "processed" | "archived" }): Promise<InboxItem> {
    const db = await getDb();
    const [item] = await db
      .insert(inboxItems)
      .values({
        userId,
        rawText: data.rawText,
        status: data.status || "unprocessed",
      })
      .returning();
    if (!item) throw new Error("Failed to create inbox item");
    return this.mapInboxItemToDTO(item);
  }

  async getInboxItems(userId: string, status?: string): Promise<InboxItem[]> {
    const db = await getDb();
    const whereConditions = [eq(inboxItems.userId, userId)];

    if (status) {
      const validStatus = ["unprocessed", "processed", "archived"].includes(status);
      if (validStatus) {
        whereConditions.push(eq(inboxItems.status, status as "unprocessed" | "processed" | "archived"));
      }
    }

    const itemsData = await db
      .select()
      .from(inboxItems)
      .where(and(...whereConditions))
      .orderBy(desc(inboxItems.createdAt));

    return itemsData.map(item => this.mapInboxItemToDTO(item));
  }

  async updateInboxItem(
    itemId: string,
    userId: string,
    data: { rawText?: string; status?: "unprocessed" | "processed" | "archived"; createdTaskId?: string; processedAt?: Date },
  ): Promise<void> {
    const db = await getDb();
    // Filter out undefined values for exact optional property types
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    await db
      .update(inboxItems)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(inboxItems.id, itemId), eq(inboxItems.userId, userId)));
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  async getTaskStats(userId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  }> {
    const db = await getDb();
    const allTasks = await db
      .select({ status: tasks.status })
      .from(tasks)
      .where(eq(tasks.userId, userId));

    const stats = {
      total: allTasks.length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      completed: allTasks.filter(t => t.status === 'done').length,
      cancelled: allTasks.filter(t => t.status === 'canceled').length,
    };

    return stats;
  }

  async getProjectStats(userId: string): Promise<{
    total: number;
    active: number;
    onHold: number;
    completed: number;
    archived: number;
  }> {
    const db = await getDb();
    const allProjects = await db
      .select({ status: projects.status })
      .from(projects)
      .where(eq(projects.userId, userId));

    const stats = {
      total: allProjects.length,
      active: allProjects.filter(p => p.status === 'active').length,
      onHold: allProjects.filter(p => p.status === 'on_hold').length,
      completed: allProjects.filter(p => p.status === 'completed').length,
      archived: allProjects.filter(p => p.status === 'archived').length,
    };

    return stats;
  }

  // ============================================================================
  // COMPLEX QUERIES WITH RELATIONS
  // ============================================================================

  async getTaskWithRelations(taskId: string, userId: string): Promise<{
    task: TaskDTO;
    project: ProjectDTO | null;
    parentTask: TaskDTO | null;
    subtasks: TaskDTO[];
    taggedContacts: Array<{ id: string; displayName: string; primaryEmail?: string }>;
    zone: { id: number; name: string; color: string | null; iconName: string | null } | null;
  } | null> {
    const db = await getDb();

    // Get main task
    const task = await this.getTask(taskId, userId);
    if (!task) return null;

    // Get related data in parallel
    const [
      project,
      parentTask,
      subtasks,
      taggedContactsData,
    ] = await Promise.all([
      task.projectId ? this.getProject(task.projectId, userId) : null,
      task.parentTaskId ? this.getTask(task.parentTaskId, userId) : null,
      this.getSubtasks(taskId, userId),
      // Get tagged contacts
      db.select({
        id: contacts.id,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
      })
      .from(taskContactTags)
      .innerJoin(contacts, eq(taskContactTags.contactId, contacts.id))
      .where(eq(taskContactTags.taskId, taskId))
      .then(results => results.map(result => {
        const contact: { id: string; displayName: string; primaryEmail?: string } = {
          id: result.id,
          displayName: result.displayName,
        };
        if (result.primaryEmail) {
          contact.primaryEmail = result.primaryEmail;
        }
        return contact;
      })),
    ]);

    // Get zone if project has one
    let zone: { id: number; name: string; color: string | null; iconName: string | null } | null = null;
    if (project?.zoneId) {
      const [zoneData] = await db
        .select()
        .from(zones)
        .where(eq(zones.id, project.zoneId));
      zone = zoneData ?? null;
    }

    return {
      task,
      project,
      parentTask,
      subtasks,
      taggedContacts: taggedContactsData,
      zone,
    };
  }

  // ============================================================================
  // PRIVATE MAPPER METHODS
  // ============================================================================

  private mapProjectToDTO(project: typeof projects.$inferSelect): ProjectDTO {
    return {
      id: project.id,
      userId: project.userId,
      zoneId: project.zoneId,
      name: project.name,
      status: project.status as "active" | "on_hold" | "completed" | "archived",
      dueDate: project.dueDate,
      details: project.details as Record<string, unknown>,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private mapTaskToDTO(task: typeof tasks.$inferSelect): TaskDTO {
    return {
      id: task.id,
      userId: task.userId,
      projectId: task.projectId,
      parentTaskId: task.parentTaskId,
      name: task.name,
      status: task.status as "todo" | "in_progress" | "done" | "canceled",
      priority: task.priority as "low" | "medium" | "high" | "urgent",
      dueDate: task.dueDate,
      details: task.details as Record<string, unknown>,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  private mapGoalToDTO(goal: typeof goals.$inferSelect): GoalDTO {
    return {
      id: goal.id,
      userId: goal.userId,
      contactId: goal.contactId,
      goalType: goal.goalType as "practitioner_business" | "practitioner_personal" | "client_wellness",
      name: goal.name,
      status: goal.status as "on_track" | "at_risk" | "achieved" | "abandoned",
      targetDate: goal.targetDate,
      details: goal.details as Record<string, unknown>,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  private mapDailyPulseLogToDTO(log: typeof dailyPulseLogs.$inferSelect): DailyPulseLogDTO {
    return {
      id: log.id,
      userId: log.userId,
      logDate: new Date(log.logDate),
      details: log.details as Record<string, unknown>,
      createdAt: log.createdAt,
    };
  }

  private mapInboxItemToDTO(item: typeof inboxItems.$inferSelect): InboxItem {
    return {
      id: item.id,
      userId: item.userId,
      rawText: item.rawText,
      status: item.status as "unprocessed" | "processed" | "archived",
      createdTaskId: item.createdTaskId,
      processedAt: item.processedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export const momentumRepository = new MomentumRepository();