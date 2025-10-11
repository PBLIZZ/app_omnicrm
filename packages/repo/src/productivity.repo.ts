// Productivity repository - Projects, Tasks, Goals, and Daily Pulse
import type { DbClient } from "@/server/db/client";
import {
  projects,
  tasks,
  goals,
  dailyPulseLogs,
  zones,
  inboxItems,
  taskContactTags,
} from "@/server/db/schema";
import { eq, desc, and, asc, isNull, inArray, sql } from "drizzle-orm";
import type {
  TaskListItem,
  ProjectListItem,
  Goal,
  DailyPulseLog,
  InboxItem,
  CreateTask,
  CreateProject,
  CreateGoal,
  CreateDailyPulseLog,
} from "./types/productivity.types";

export class ProductivityRepository {
  constructor(private readonly db: DbClient) {}
  // ============================================================================
  // PROJECTS (Pathways)
  // ============================================================================

  async createProject(userId: string, data: Omit<CreateProject, 'userId'>): Promise<ProjectListItem> {
    const [project] = await this.db
      .insert(projects)
      .values({ ...data, userId })
      .returning();

    if (!project) {
      throw new Error("Insert returned no data");
    }

    return project as ProjectListItem;
  }

  async getProjects(
    userId: string,
    filters?: { zoneId?: number | undefined; status?: string[] | undefined },
  ): Promise<ProjectListItem[]> {
    const whereConditions = [eq(projects.userId, userId)];

    if (filters?.zoneId !== undefined) {
      whereConditions.push(eq(projects.zoneId, filters.zoneId));
    }

    if (filters?.status && filters.status.length > 0) {
      // Cast to the specific enum values that are valid
      whereConditions.push(
        inArray(
          projects.status,
          filters.status as ("active" | "on_hold" | "completed" | "archived")[],
        ),
      );
    }

    const rows = await this.db
      .select({
        id: projects.id,
        userId: projects.userId,
        name: projects.name,
        status: projects.status,
        dueDate: projects.dueDate,
        details: projects.details,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        zoneId: projects.zoneId,
      })
      .from(projects)
      .where(and(...whereConditions))
      .orderBy(desc(projects.updatedAt));

    return rows as ProjectListItem[];
  }

  async getProject(projectId: string, userId: string): Promise<ProjectListItem | null> {
    const rows = await this.db
      .select({
        id: projects.id,
        userId: projects.userId,
        name: projects.name,
        status: projects.status,
        dueDate: projects.dueDate,
        details: projects.details,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        zoneId: projects.zoneId,
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    return rows[0] ? (rows[0] as ProjectListItem) : null;
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: Partial<CreateProject>,
  ): Promise<void> {
    await this.db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    await this.db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  }

  // ============================================================================
  // TASKS (Hierarchical)
  // ============================================================================
  // Note: The `tasks` table has a self-referential foreign key which causes TypeScript
  // to infer it as `any`. This is a known Drizzle ORM limitation with circular references.
  // ESLint warnings for unsafe member access on `tasks` properties are expected and safe.

  async createTask(userId: string, data: Omit<CreateTask, 'userId'>): Promise<TaskListItem> {
    const [task] = await this.db
      .insert(tasks)
      .values({ ...data, userId })
      .returning();

    if (!task) {
      throw new Error("Insert returned no data");
    }

    return task as TaskListItem;
  }

  async getTasks(
    userId: string,
    filters?: {
      projectId?: string | undefined;
      parentTaskId?: string | null | undefined;
      status?: string[] | undefined;
      priority?: string[] | undefined;
    },
  ): Promise<TaskListItem[]> {
    const whereConditions = [eq(tasks.userId, userId)];

    if (filters?.projectId) {
      whereConditions.push(eq(tasks.projectId, filters.projectId));
    }

    if (filters?.parentTaskId !== undefined) {
      if (filters.parentTaskId === null) {
        whereConditions.push(isNull(tasks.parentTaskId));
      } else {
        whereConditions.push(eq(tasks.parentTaskId, filters.parentTaskId));
      }
    }

    if (filters?.status && filters.status.length > 0) {
      whereConditions.push(
        inArray(
          tasks.status,
          filters.status as ("todo" | "in_progress" | "done" | "canceled")[],
        ),
      );
    }

    if (filters?.priority && filters.priority.length > 0) {
      whereConditions.push(
        inArray(
          tasks.priority,
          filters.priority as ("low" | "medium" | "high" | "urgent")[],
        ),
      );
    }

    const rows = await this.db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        projectId: tasks.projectId,
        parentTaskId: tasks.parentTaskId,
        name: tasks.name,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        details: tasks.details,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(...whereConditions))
      .orderBy(desc(tasks.updatedAt));

    return rows as TaskListItem[];
  }

  async getTask(taskId: string, userId: string): Promise<TaskListItem | null> {
    const rows = await this.db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        projectId: tasks.projectId,
        parentTaskId: tasks.parentTaskId,
        name: tasks.name,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        details: tasks.details,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    return rows[0] ? (rows[0] as TaskListItem) : null;
  }

  async getTasksWithProject(userId: string, projectId: string): Promise<TaskListItem[]> {
    const rows = await this.db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        projectId: tasks.projectId,
        parentTaskId: tasks.parentTaskId,
        name: tasks.name,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        details: tasks.details,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.projectId, projectId)))
      .orderBy(desc(tasks.updatedAt));

    return rows as TaskListItem[];
  }

  async getSubtasks(parentTaskId: string, userId: string): Promise<TaskListItem[]> {
    const rows = await this.db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        projectId: tasks.projectId,
        parentTaskId: tasks.parentTaskId,
        name: tasks.name,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        details: tasks.details,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.parentTaskId, parentTaskId)))
      .orderBy(asc(tasks.createdAt));

    return rows as TaskListItem[];
  }

  async updateTask(taskId: string, userId: string, data: Partial<CreateTask>): Promise<void> {
    // No filtering - service layer provides clean data
    await this.db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    // Delete task and its contact tags
    await this.db.delete(taskContactTags).where(eq(taskContactTags.taskId, taskId));
    await this.db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  // ============================================================================
  // TASK CONTACT TAGS (Many-to-Many)
  // ============================================================================

  async addTaskContactTags(taskId: string, contactIds: string[]): Promise<void> {
    if (contactIds.length === 0) return;

    const tagData = contactIds.map((contactId) => ({
      taskId,
      contactId,
    }));

    await this.db.insert(taskContactTags).values(tagData).onConflictDoNothing();
  }

  async removeTaskContactTags(taskId: string, contactIds?: string[]): Promise<void> {
    if (contactIds && contactIds.length > 0) {
      // Remove specific contact tags
      await this.db
        .delete(taskContactTags)
        .where(
          and(eq(taskContactTags.taskId, taskId), inArray(taskContactTags.contactId, contactIds)),
        );
    } else {
      // Remove all contact tags for this task
      await this.db.delete(taskContactTags).where(eq(taskContactTags.taskId, taskId));
    }
  }

  async getTaskContactTags(taskId: string): Promise<Array<{ taskId: string; contactId: string }>> {
    return await this.db.select().from(taskContactTags).where(eq(taskContactTags.taskId, taskId));
  }

  // ============================================================================
  // GOALS
  // ============================================================================

  async createGoal(userId: string, data: CreateGoal): Promise<Goal> {
    const [goal] = await this.db
      .insert(goals)
      .values({
        ...data,
        userId,
        contactId: data.contactId ?? null,
        targetDate: data.targetDate ?? null,
        details: data.details ?? {},
      })
      .returning();

    if (!goal) {
      throw new Error("Failed to create goal");
    }

    return goal as Goal;
  }

  async getGoals(
    userId: string,
    filters?: {
      contactId?: string;
      goalType?: string[];
      status?: string[];
    },
  ): Promise<Goal[]> {
    const whereConditions = [eq(goals.userId, userId)];

    if (filters?.contactId) {
      whereConditions.push(eq(goals.contactId, filters.contactId));
    }

    if (filters?.goalType && filters.goalType.length > 0) {
      const validGoalTypes = filters.goalType.filter(
        (type): type is "practitioner_business" | "practitioner_personal" | "client_wellness" =>
          ["practitioner_business", "practitioner_personal", "client_wellness"].includes(type),
      );
      if (validGoalTypes.length > 0) {
        whereConditions.push(inArray(goals.goalType, validGoalTypes));
      }
    }

    if (filters?.status && filters.status.length > 0) {
      const validStatuses = filters.status.filter(
        (status): status is "on_track" | "at_risk" | "achieved" | "abandoned" =>
          ["on_track", "at_risk", "achieved", "abandoned"].includes(status),
      );
      if (validStatuses.length > 0) {
        whereConditions.push(inArray(goals.status, validStatuses));
      }
    }

    const rows = await this.db
      .select()
      .from(goals)
      .where(and(...whereConditions))
      .orderBy(desc(goals.updatedAt));

    return rows;
  }

  async getGoal(goalId: string, userId: string): Promise<Goal | null> {
    const [goal] = await this.db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));

    return goal ?? null;
  }

  async updateGoal(goalId: string, userId: string, data: Partial<CreateGoal>): Promise<void> {
    // No filtering - service layer provides clean data
    await this.db
      .update(goals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    await this.db.delete(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  }

  // ============================================================================
  // DAILY PULSE LOGS
  // ============================================================================

  async createDailyPulseLog(userId: string, data: CreateDailyPulseLog): Promise<DailyPulseLog> {
    const logDate = data.logDate || new Date();
    const isoString = typeof logDate === "string" ? logDate : logDate.toISOString();
    const logDateString = isoString.split("T")[0]; // Convert to YYYY-MM-DD format
    if (!logDateString) {
      throw new Error("Failed to format log date");
    }

    const [log] = await this.db
      .insert(dailyPulseLogs)
      .values({
        userId,
        logDate: logDateString,
        details: data.details ?? {},
      })
      .returning();

    if (!log) {
      throw new Error("Failed to create daily pulse log");
    }

    return log as DailyPulseLog;
  }

  async getDailyPulseLogs(userId: string, limit = 30): Promise<DailyPulseLog[]> {
    const rows = await this.db
      .select()
      .from(dailyPulseLogs)
      .where(eq(dailyPulseLogs.userId, userId))
      .orderBy(desc(dailyPulseLogs.logDate))
      .limit(limit);

    return rows;
  }

  async getDailyPulseLog(userId: string, logDate: Date): Promise<DailyPulseLog | null> {
    const isoString = logDate.toISOString();
    const dateString = isoString.split("T")[0]; // Convert to YYYY-MM-DD format
    if (!dateString) {
      throw new Error("Failed to format log date");
    }

    const [log] = await this.db
      .select()
      .from(dailyPulseLogs)
      .where(and(eq(dailyPulseLogs.userId, userId), eq(dailyPulseLogs.logDate, dateString)));

    return log ?? null;
  }

  async updateDailyPulseLog(
    logId: string,
    userId: string,
    data: Partial<CreateDailyPulseLog>,
  ): Promise<void> {
    // No filtering - service layer provides clean data
    await this.db
      .update(dailyPulseLogs)
      .set(data)
      .where(and(eq(dailyPulseLogs.id, logId), eq(dailyPulseLogs.userId, userId)));
  }

  // ============================================================================
  // ZONES (Lookup)
  // ============================================================================

  async getZones(): Promise<
    Array<{ id: number; name: string; color: string | null; iconName: string | null }>
  > {
    return await this.db.select().from(zones).orderBy(asc(zones.name));
  }

  // ============================================================================
  // INBOX ITEMS (AI Quick Capture)
  // ============================================================================

  async createInboxItem(
    userId: string,
    data: { rawText: string; status?: "unprocessed" | "processed" | "archived" },
  ): Promise<InboxItem> {
    const [item] = await this.db
      .insert(inboxItems)
      .values({
        userId,
        rawText: data.rawText,
        status: data.status || "unprocessed",
      })
      .returning();

    if (!item) {
      throw new Error("Failed to create inbox item");
    }

    return item as InboxItem;
  }

  async getInboxItems(userId: string, status?: string): Promise<InboxItem[]> {
    const whereConditions = [eq(inboxItems.userId, userId)];

    // No validation - assume service/route layer validated the status
    if (status) {
      whereConditions.push(
        eq(inboxItems.status, status as "unprocessed" | "processed" | "archived"),
      );
    }

    const rows = await this.db
      .select()
      .from(inboxItems)
      .where(and(...whereConditions))
      .orderBy(desc(inboxItems.createdAt));

    return rows;
  }

  async updateInboxItem(
    userId: string,
    itemId: string,
    data: {
      status?: "unprocessed" | "processed" | "archived";
      createdTaskId?: string;
      processedAt?: Date;
    },
  ): Promise<void> {
    // No filtering - service layer provides clean data
    await this.db
      .update(inboxItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(inboxItems.id, itemId), eq(inboxItems.userId, userId)));
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  async getTaskStats(userId: string): Promise<{ total: number }> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.userId, userId));

    return { total: result?.count ?? 0 };
  }

  async getProjectStats(userId: string): Promise<Array<{ status: string | null }>> {
    // Return raw project status data - let service layer calculate statistics
    const allProjects = await this.db
      .select({ status: projects.status })
      .from(projects)
      .where(eq(projects.userId, userId));

    return allProjects;
  }
}

export function createProductivityRepository(db: DbClient): ProductivityRepository {
  return new ProductivityRepository(db);
}
