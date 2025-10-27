// Productivity repository - Projects, Tasks, Goals, and Daily Pulse
import type { DbClient } from "@/server/db/client";
import { projects, tasks, goals, dailyPulseLogs, zones, inboxItems, taskTags, tags } from "@/server/db/schema";
import { eq, desc, and, asc, inArray, sql } from "drizzle-orm";
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

  async createProject(
    userId: string,
    data: Omit<CreateProject, "userId">,
  ): Promise<ProjectListItem> {
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
    filters?: { zoneUuid?: string | undefined; status?: string[] | undefined },
  ): Promise<ProjectListItem[]> {
    const whereConditions = [eq(projects.userId, userId)];

    if (filters?.zoneUuid !== undefined) {
      whereConditions.push(eq(projects.zoneUuid, filters.zoneUuid));
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
        zoneUuid: projects.zoneUuid,
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
        zoneUuid: projects.zoneUuid,
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

  async createTask(userId: string, data: Omit<CreateTask, "userId">): Promise<TaskListItem> {
    // Explicitly construct the insert data to avoid any extra fields
    // Only include completedAt if it's explicitly provided (not null)
    const insertData: any = {
      userId,
      name: data.name,
      projectId: data.projectId,
      zoneUuid: data.zoneUuid,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate,
      details: data.details,
    };

    // Only add completedAt if it's not null (let DB default to null otherwise)
    if (data.completedAt !== null) {
      insertData.completedAt = data.completedAt;
    }

    const [task] = await this.db
      .insert(tasks)
      .values(insertData)
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
      status?: string[] | undefined;
      priority?: string[] | undefined;
    },
  ): Promise<TaskListItem[]> {
    const whereConditions = [eq(tasks.userId, userId)];

    if (filters?.projectId) {
      whereConditions.push(eq(tasks.projectId, filters.projectId));
    }

    if (filters?.status && filters.status.length > 0) {
      whereConditions.push(
        inArray(tasks.status, filters.status as ("todo" | "in_progress" | "done" | "canceled")[]),
      );
    }

    if (filters?.priority && filters.priority.length > 0) {
      whereConditions.push(
        inArray(tasks.priority, filters.priority as ("low" | "medium" | "high")[]),
      );
    }

    const rows = await this.db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        projectId: tasks.projectId,
        zoneUuid: tasks.zoneUuid,
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

    // Fetch tags for all tasks in a single query
    if (rows.length > 0) {
      const taskIds = rows.map(r => r.id);
      const taskTagsData = await this.db
        .select({
          taskId: taskTags.taskId,
          tagId: tags.id,
          tagName: tags.name,
          tagColor: tags.color,
          tagCategory: tags.category,
        })
        .from(taskTags)
        .innerJoin(tags, eq(taskTags.tagId, tags.id))
        .where(inArray(taskTags.taskId, taskIds));

      // Group tags by task ID
      const tagsByTaskId = taskTagsData.reduce((acc, row) => {
        if (!acc[row.taskId]) acc[row.taskId] = [];
        acc[row.taskId]!.push({
          id: row.tagId,
          name: row.tagName,
          color: row.tagColor,
          category: row.tagCategory,
        });
        return acc;
      }, {} as Record<string, Array<{ id: string; name: string; color: string; category: string | null }>>);

      // Attach tags to tasks
      return rows.map(task => ({
        ...task,
        tags: tagsByTaskId[task.id] || [],
      })) as TaskListItem[];
    }

    return rows as TaskListItem[];
  }

  async getTask(taskId: string, userId: string): Promise<TaskListItem | null> {
    const rows = await this.db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        projectId: tasks.projectId,
        zoneUuid: tasks.zoneUuid,
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

    const task = rows[0];
    if (!task) return null;

    // Fetch tags for this task
    const taskTagsData = await this.db
      .select({
        taskId: taskTags.taskId,
        tagId: tags.id,
        tagName: tags.name,
        tagColor: tags.color,
        tagCategory: tags.category,
      })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(eq(taskTags.taskId, taskId));

    // Attach tags to task
    return {
      ...task,
      tags: taskTagsData.map(row => ({
        id: row.tagId,
        name: row.tagName,
        color: row.tagColor,
        category: row.tagCategory,
      })),
    } as TaskListItem;
  }

  async getTasksWithProject(userId: string, projectId: string): Promise<TaskListItem[]> {
    const rows = await this.db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        projectId: tasks.projectId,
        zoneUuid: tasks.zoneUuid,
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

  async updateTask(taskId: string, userId: string, data: Partial<CreateTask>): Promise<void> {
    // No filtering - service layer provides clean data
    await this.db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    // Delete task (legacy task_contact_tags system removed)
    await this.db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
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

  async createDailyPulseLog(
    userId: string,
    data: { logDate?: string | Date | undefined; details?: unknown | undefined },
  ): Promise<DailyPulseLog> {
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
    Array<{ uuidId: string; name: string; color: string | null; iconName: string | null }>
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

  // ============================================================================
  // PULSE ANALYTICS
  // ============================================================================

  /**
   * Get pulse logs for analytics (with date range)
   */
  async getPulseLogsForAnalytics(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyPulseLog[]> {
    const rows = await this.db
      .select()
      .from(dailyPulseLogs)
      .where(
        and(
          eq(dailyPulseLogs.userId, userId),
          sql`${dailyPulseLogs.logDate} >= ${startDate}`,
          sql`${dailyPulseLogs.logDate} <= ${endDate}`,
        ),
      )
      .orderBy(asc(dailyPulseLogs.logDate));

    return rows;
  }

  /**
   * Get task completions count by date range (for correlation analysis)
   */
  async getTaskCompletionsByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<Array<{ date: string; count: number }>> {
    const results = await this.db
      .select({
        date: sql<string>`DATE(${tasks.completedAt})`.as("date"),
        count: sql<number>`COUNT(*)::int`.as("count"),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          sql`${tasks.completedAt} IS NOT NULL`,
          sql`DATE(${tasks.completedAt}) >= ${startDate}`,
          sql`DATE(${tasks.completedAt}) <= ${endDate}`,
        ),
      )
      .groupBy(sql`DATE(${tasks.completedAt})`);

    return results.map((r) => ({
      date: r.date,
      count: r.count,
    }));
  }

  /**
   * Delete a pulse log by ID
   */
  async deleteDailyPulseLog(logId: string, userId: string): Promise<void> {
    await this.db
      .delete(dailyPulseLogs)
      .where(and(eq(dailyPulseLogs.id, logId), eq(dailyPulseLogs.userId, userId)));
  }
}

export function createProductivityRepository(db: DbClient): ProductivityRepository {
  return new ProductivityRepository(db);
}
