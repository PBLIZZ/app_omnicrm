// OmniMomentum business logic service
import type {
  Project,
  Task,
  Zone,
  TaskFilters,
  ProjectFilters,
  CreateTaskInput,
  UpdateTaskInput,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTask as DrizzleCreateTask,
  UpdateTask as DrizzleUpdateTask,
  CreateProject as DrizzleCreateProject,
  UpdateProject as DrizzleUpdateProject,
} from "@/server/db/business-schemas/productivity";
import { ZonesRepository, createProductivityRepository, ProductivityRepository } from "@repo";
import type {
  ZoneWithStats,
  ZonesListResponse,
  ZonesWithStatsResponse,
} from "@/server/db/business-schemas/productivity";
import {
  ZoneWithStatsSchema,
  TaskSchema,
  ProjectSchema,
} from "@/server/db/business-schemas/productivity";
import { ok, err, DbResult, isErr } from "@/lib/utils/result";
import { DbClient, getDb } from "@/server/db/client";
import type { z } from "zod";

//=============================================================================
// PRODUCTIVITY EXPORTS
//=============================================================================

export interface TaskWithRelationsDTO extends Task {
  project?: Project | null;
  parentTask?: Task | null;
  subtasks: Task[];
  taggedContacts: Array<{ id: string; name: string }>;
  zone?: Zone | null;
}

type TaskWithNormalizedDetails = Omit<Task, "details"> & {
  details: Record<string, unknown>;
};

type ProjectWithNormalizedDetails = Omit<Project, "details"> & {
  details: Record<string, unknown>;
};

class ProductivityService {
  private async getRepository(): Promise<{ db: DbClient; repo: ProductivityRepository }> {
    const db = await getDb();
    return {
      db,
      repo: createProductivityRepository(db),
    };
  }

  private parseTask(task: TaskWithNormalizedDetails): z.infer<typeof TaskSchema> {
    return TaskSchema.parse(task);
  }

  private parseProject(project: ProjectWithNormalizedDetails): z.infer<typeof ProjectSchema> {
    return ProjectSchema.parse(project);
  }

  private normalizeDetails(details: Record<string, unknown> | undefined): Record<string, unknown> {
    return details ?? {};
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private prepareProjectForParsing(project: Project): ProjectWithNormalizedDetails {
    const details = this.isRecord(project.details) ? project.details : undefined;

    const normalized: ProjectWithNormalizedDetails = {
      ...project,
      details: this.normalizeDetails(details),
    };

    return normalized;
  }

  private prepareTaskForParsing(task: Task): TaskWithNormalizedDetails {
    const details = this.isRecord(task.details) ? task.details : undefined;

    const normalized: TaskWithNormalizedDetails = {
      ...task,
      details: this.normalizeDetails(details),
    };

    return normalized;
  }

  private toNullableDate(value: unknown): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    const parsed = new Date(value as string | number);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid date value");
    }
    return parsed;
  }

  private applyTaskPostFilters(
    tasks: z.infer<typeof TaskSchema>[],
    filters: TaskFilters = {},
  ): z.infer<typeof TaskSchema>[] {
    let filtered = tasks;

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((task) => task.name.toLowerCase().includes(searchTerm));
    }

    if (filters.dueAfter) {
      const dueAfter = this.toNullableDate(filters.dueAfter);
      if (dueAfter instanceof Date) {
        filtered = filtered.filter((task) => task.dueDate && task.dueDate >= dueAfter);
      }
    }

    if (filters.dueBefore) {
      const dueBefore = this.toNullableDate(filters.dueBefore);
      if (dueBefore instanceof Date) {
        filtered = filtered.filter((task) => task.dueDate && task.dueDate <= dueBefore);
      }
    }

    // Currently we do not support taggedContactId or hasSubtasks filtering at the repository level.
    // These can be implemented once the underlying data model supports the associations.

    return filtered;
  }

  private applyProjectPostFilters(
    projects: z.infer<typeof ProjectSchema>[],
    filters: ProjectFilters = {},
  ): z.infer<typeof ProjectSchema>[] {
    let filtered = projects;

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((project) => project.name.toLowerCase().includes(searchTerm));
    }

    if (filters.dueAfter) {
      const dueAfter = this.toNullableDate(filters.dueAfter);
      if (dueAfter instanceof Date) {
        filtered = filtered.filter((project) => project.dueDate && project.dueDate >= dueAfter);
      }
    }

    if (filters.dueBefore) {
      const dueBefore = this.toNullableDate(filters.dueBefore);
      if (dueBefore instanceof Date) {
        filtered = filtered.filter((project) => project.dueDate && project.dueDate <= dueBefore);
      }
    }

    return filtered;
  }

  private buildCreateProjectPayload(data: CreateProjectInput): DrizzleCreateProject {
    const payload: Partial<DrizzleCreateProject> & { name: string } = {
      name: data.name,
      details: this.normalizeDetails(data.details),
    };

    if (data.status !== undefined) {
      payload.status = data.status;
    }

    const dueDate = this.toNullableDate(data.dueDate);
    if (dueDate !== undefined) {
      payload.dueDate = dueDate ? dueDate.toISOString().split("T")[0] : null;
    }

    if (data.zoneId !== undefined) {
      payload.zoneId = data.zoneId;
    }

    return payload as DrizzleCreateProject;
  }

  private buildUpdateProjectPayload(data: UpdateProjectInput): DrizzleUpdateProject {
    const payload: DrizzleUpdateProject = {};

    if (data.name !== undefined) {
      payload.name = data.name;
    }

    if (data.status !== undefined) {
      payload.status = data.status;
    }

    if (data.dueDate !== undefined) {
      const dueDate = this.toNullableDate(data.dueDate);
      payload.dueDate = dueDate ? dueDate.toISOString().split("T")[0] : null;
    }

    if (data.details !== undefined) {
      payload.details = this.normalizeDetails(data.details);
    }

    if (data.zoneId !== undefined) {
      payload.zoneId = data.zoneId;
    }

    return payload;
  }

  private buildCreateTaskPayload(
    data: CreateTaskInput,
    overrides: Partial<DrizzleCreateTask> = {},
  ): DrizzleCreateTask {
    const payload: Partial<DrizzleCreateTask> & { name: string } = {
      name: data.name,
      projectId: data.projectId ?? null,
      parentTaskId: data.parentTaskId ?? null,
      details: this.normalizeDetails(data.details),
      ...overrides,
    };

    if (data.status !== undefined) {
      payload["status"] = data.status;
    }

    if (data.priority !== undefined) {
      payload["priority"] = data.priority;
    }

    const dueDate = this.toNullableDate(data.dueDate);
    if (dueDate !== undefined) {
      payload["dueDate"] = dueDate ? dueDate.toISOString().split("T")[0] : null;
    }

    return payload as DrizzleCreateTask;
  }

  private buildUpdateTaskPayload(data: UpdateTaskInput): DrizzleUpdateTask {
    const payload: DrizzleUpdateTask = {};

    if (data.name !== undefined) {
      payload["name"] = data.name;
    }

    if (data.status !== undefined) {
      payload["status"] = data.status;
    }

    if (data.priority !== undefined) {
      payload["priority"] = data.priority;
    }

    if (data.projectId !== undefined) {
      payload["projectId"] = data.projectId ?? null;
    }

    if (data.parentTaskId !== undefined) {
      payload["parentTaskId"] = data.parentTaskId ?? null;
    }

    if (data.dueDate !== undefined) {
      const dueDate = this.toNullableDate(data.dueDate);
      payload["dueDate"] = dueDate ? dueDate.toISOString().split("T")[0] : null;
    }

    if (data.details !== undefined) {
      payload["details"] = this.normalizeDetails(data.details);
    }

    if (data.completedAt !== undefined) {
      payload["completedAt"] = this.toNullableDate(data.completedAt) ?? null;
    }

    return payload;
  }

  async getProjects(
    userId: string,
    filters: ProjectFilters = {},
  ): Promise<DbResult<z.infer<typeof ProjectSchema>[]>> {
    const { repo } = await this.getRepository();
    const repoFilters: { zoneId?: number; status?: string[] } = {};
    
    if (filters.zoneId !== undefined) {
      repoFilters.zoneId = filters.zoneId;
    }
    if (filters.status !== undefined) {
      repoFilters.status = filters.status;
    }

    const result = await repo.getProjects(userId, repoFilters);
    if (!result.success) {
      return result;
    }

    const parsedProjects = result.data.map((project) =>
      this.parseProject(this.prepareProjectForParsing(project)),
    );

    return ok(this.applyProjectPostFilters(parsedProjects, filters));
  }

  async createProject(
    userId: string,
    data: CreateProjectInput,
  ): Promise<DbResult<z.infer<typeof ProjectSchema>>> {
    try {
      const { repo } = await this.getRepository();
      const payload = this.buildCreateProjectPayload(data);

      const result = await repo.createProject(userId, payload);
      if (!result.success) {
        return result;
      }

      return ok(this.parseProject(this.prepareProjectForParsing(result.data)));
    } catch (error) {
      return err({
        code: "PROJECT_CREATE_ERROR",
        message: "Failed to create project",
        details: error,
      });
    }
  }

  async getProject(
    projectId: string,
    userId: string,
  ): Promise<DbResult<z.infer<typeof ProjectSchema> | null>> {
    const { repo } = await this.getRepository();
    const result = await repo.getProject(projectId, userId);
    if (!result.success) {
      return result;
    }

    if (!result.data) {
      return ok(null);
    }

    return ok(this.parseProject(this.prepareProjectForParsing(result.data)));
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProjectInput,
  ): Promise<DbResult<z.infer<typeof ProjectSchema> | null>> {
    try {
      const { repo } = await this.getRepository();
      const updatePayload = this.buildUpdateProjectPayload(data);

      const updateResult = await repo.updateProject(projectId, userId, updatePayload);
      if (isErr(updateResult)) {
        return updateResult;
      }

      const refreshed = await repo.getProject(projectId, userId);
      if (!refreshed.success) {
        return refreshed;
      }

      if (!refreshed.data) {
        return ok(null);
      }

      return ok(this.parseProject(this.prepareProjectForParsing(refreshed.data)));
    } catch (error) {
      return err({
        code: "PROJECT_UPDATE_ERROR",
        message: "Failed to update project",
        details: error,
      });
    }
  }

  async deleteProject(projectId: string, userId: string): Promise<DbResult<void>> {
    const { repo } = await this.getRepository();
    return repo.deleteProject(projectId, userId);
  }

  async getProjectTasks(
    projectId: string,
    userId: string,
    filters: TaskFilters = {},
  ): Promise<DbResult<z.infer<typeof TaskSchema>[]>> {
    const { repo } = await this.getRepository();
    const repoFilters: {
      projectId: string;
      status?: string[];
      priority?: string[];
      parentTaskId?: string | null;
    } = {
      projectId,
    };

    if (filters.status !== undefined) {
      repoFilters.status = filters.status;
    }

    if (filters.priority !== undefined) {
      repoFilters.priority = filters.priority;
    }

    if (filters.parentTaskId !== undefined) {
      repoFilters.parentTaskId = filters.parentTaskId;
    }

    const result = await repo.getTasks(userId, repoFilters);
    if (isErr(result)) {
      return result;
    }

    if (!result.success) {
      return result;
    }

    const parsedTasks = result.data.map((task) =>
      this.parseTask(this.prepareTaskForParsing(task)),
    );

    return ok(this.applyTaskPostFilters(parsedTasks, filters));
  }

  async getTasks(
    userId: string,
    filters: TaskFilters = {},
  ): Promise<DbResult<z.infer<typeof TaskSchema>[]>> {
    const { repo } = await this.getRepository();
    const repoFilters: {
      projectId?: string;
      parentTaskId?: string | null;
      status?: string[];
      priority?: string[];
    } = {};

    if (filters.projectId !== undefined) {
      repoFilters.projectId = filters.projectId;
    }

    if (filters.parentTaskId !== undefined) {
      repoFilters.parentTaskId = filters.parentTaskId;
    }

    if (filters.status !== undefined) {
      repoFilters.status = filters.status;
    }

    if (filters.priority !== undefined) {
      repoFilters.priority = filters.priority;
    }

    const result = await repo.getTasks(userId, repoFilters);
    if (isErr(result)) {
      return result;
    }

    if (!result.success) {
      return result;
    }

    const parsedTasks = result.data.map((task) =>
      this.parseTask({
        ...task,
        details: this.normalizeDetails(
          typeof task.details === "object" && task.details !== null
            ? (task.details as Record<string, unknown>)
            : undefined
        ),
      }),
    );

    return ok(this.applyTaskPostFilters(parsedTasks, filters));
  }

  async createTask(
    userId: string,
    data: CreateTaskInput,
  ): Promise<DbResult<z.infer<typeof TaskSchema>>> {
    try {
      const { repo } = await this.getRepository();
      const payload = this.buildCreateTaskPayload(data);

      const result = await repo.createTask(userId, payload);
      if (isErr(result)) {
        return result;
      }

      if (!result.success) {
        return result;
      }

      return ok(this.parseTask(this.prepareTaskForParsing(result.data)));
    } catch (error) {
      return err({
        code: "TASK_CREATE_ERROR",
        message: "Failed to create task",
        details: error,
      });
    }
  }

  async getTask(
    taskId: string,
    userId: string,
  ): Promise<DbResult<z.infer<typeof TaskSchema> | null>> {
    const { repo } = await this.getRepository();
    const task = await repo.getTask(taskId, userId);
    if (!task) {
      return ok(null);
    }

    return ok(this.parseTask(this.prepareTaskForParsing(task)));
  }

  async updateTask(
    taskId: string,
    userId: string,
    data: UpdateTaskInput,
  ): Promise<DbResult<z.infer<typeof TaskSchema> | null>> {
    try {
      const { repo } = await this.getRepository();
      const updatePayload = this.buildUpdateTaskPayload(data);

      await repo.updateTask(taskId, userId, updatePayload);

      const refreshed = await repo.getTask(taskId, userId);
      if (!refreshed) {
        return ok(null);
      }

      return ok(this.parseTask(this.prepareTaskForParsing(refreshed)));
    } catch (error) {
      return err({
        code: "TASK_UPDATE_ERROR",
        message: "Failed to update task",
        details: error,
      });
    }
  }

  async deleteTask(taskId: string, userId: string): Promise<DbResult<void>> {
    try {
      const { repo } = await this.getRepository();
      await repo.deleteTask(taskId, userId);
      return ok(undefined);
    } catch (error) {
      return err({
        code: "TASK_DELETE_ERROR",
        message: "Failed to delete task",
        details: error,
      });
    }
  }

  async getSubtasksWithValidation(
    parentTaskId: string,
    userId: string,
  ): Promise<
    DbResult<{ parentTask: z.infer<typeof TaskSchema>; subtasks: z.infer<typeof TaskSchema>[] }>
  > {
    try {
      const { repo } = await this.getRepository();
      const parentTask = await repo.getTask(parentTaskId, userId);

      if (!parentTask) {
        return err({
          code: "PARENT_TASK_NOT_FOUND",
          message: "Parent task not found",
        });
      }

      const subtasks = await repo.getSubtasks(parentTaskId, userId);

      return ok({
        parentTask: this.parseTask(this.prepareTaskForParsing(parentTask)),
        subtasks: subtasks.map((task) => this.parseTask(this.prepareTaskForParsing(task))),
      });
    } catch (error) {
      return err({
        code: "SUBTASK_FETCH_ERROR",
        message: "Failed to fetch subtasks",
        details: error,
      });
    }
  }

  async createSubtaskWithValidation(
    parentTaskId: string,
    userId: string,
    data: CreateTaskInput,
  ): Promise<
    DbResult<{ parentTask: z.infer<typeof TaskSchema>; subtask: z.infer<typeof TaskSchema> | null }>
  > {
    try {
      const { repo } = await this.getRepository();
      const parentTask = await repo.getTask(parentTaskId, userId);

      if (!parentTask) {
        return err({
          code: "PARENT_TASK_NOT_FOUND",
          message: "Parent task not found",
        });
      }

      const overrides: Partial<DrizzleCreateTask> = {
        parentTaskId,
        projectId: data.projectId ?? parentTask.projectId ?? null,
      };

      const createResult = await repo.createTask(
        userId,
        this.buildCreateTaskPayload(data, overrides),
      );
      if (isErr(createResult)) {
        return createResult;
      }

      if (!createResult.success) {
        return createResult;
      }

      return ok({
        parentTask: this.parseTask(this.prepareTaskForParsing(parentTask)),
        subtask: this.parseTask(this.prepareTaskForParsing(createResult.data)),
      });
    } catch (error) {
      return err({
        code: "SUBTASK_CREATE_ERROR",
        message: "Failed to create subtask",
        details: error,
      });
    }
  }

  async getPendingApprovalTasks(userId: string): Promise<
    DbResult<{
      tasks: Array<{
        id: string;
        name: string;
        description: string | null;
        priority: string;
        status: string;
        createdAt: string;
        aiGenerated: boolean;
      }>;
      total: number;
    }>
  > {
    try {
      const { repo } = await this.getRepository();
      const result = await repo.getTasks(userId, {});
      if (isErr(result)) {
        return result;
      }

      if (!result.success) {
        return result;
      }

      const normalizedTasks = result.data.map((task): TaskWithNormalizedDetails =>
        this.prepareTaskForParsing(task),
      );
      const pending = normalizedTasks.filter((task) => {
        const aiGenerated = Boolean(task.details["aiGenerated"]);
        const approved = Boolean(task.details["approved"]);
        return aiGenerated && !approved;
      });

      return ok({
        tasks: pending.map((task) => {
          const description =
            typeof task.details["description"] === "string" ? (task.details["description"] as string) : null;

          return {
            id: task.id,
            name: task.name,
            description,
            priority: task.priority,
            status: task.status,
            createdAt: task.createdAt?.toISOString() ?? new Date().toISOString(),
            aiGenerated: true,
          };
        }),
        total: pending.length,
      });
    } catch (error) {
      return err({
        code: "PENDING_TASKS_ERROR",
        message: "Failed to load pending approval tasks",
        details: error,
      });
    }
  }

  async approveTask(taskId: string, userId: string): Promise<z.infer<typeof TaskSchema> | null> {
    try {
      const { repo } = await this.getRepository();
      const task = await repo.getTask(taskId, userId);
      if (!task) {
        return null;
      }

      const preparedTask = this.prepareTaskForParsing(task);
      const details: Record<string, unknown> = {
        ...preparedTask.details,
        approved: true,
        approvedAt: new Date().toISOString(),
      };

      await repo.updateTask(taskId, userId, {
        status: preparedTask.status === "canceled" ? "todo" : preparedTask.status,
        details,
      });

      const refreshed = await repo.getTask(taskId, userId);
      if (!refreshed) {
        return null;
      }

      return this.parseTask(this.prepareTaskForParsing(refreshed));
    } catch (error) {
      throw error;
    }
  }
}

export const productivityService = new ProductivityService();

//=============================================================================
// ZONES SERVICE
//=============================================================================

/**
 * Service error types
 */
export type ZonesServiceError = {
  code: string;
  message: string;
  details?: unknown;
};

/**
 * Zones Service Class
 */
export class ZonesService {
  /**
   * List all zones
   */
  static async listZones(): Promise<DbResult<ZonesListResponse>> {
    try {
      const db = await getDb();
      const zones = await ZonesRepository.listZones(db);

      const zonesWithUI = zones.map((zone) => ({
        ...zone,
        icon: zone.iconName,
        displayName: zone.name,
        hasIcon: !!zone.iconName,
        hasColor: !!zone.color,
      }));

      return ok({
        items: zonesWithUI,
        total: zonesWithUI.length,
      });
    } catch (error) {
      return err({
        code: "ZONES_LIST_ERROR",
        message: "Failed to fetch zones list",
        details: error,
      });
    }
  }

  /**
   * Get zones with usage statistics
   */
  static async getZonesWithStats(): Promise<DbResult<ZonesWithStatsResponse>> {
    try {
      const db = await getDb();
      const zonesWithStats = await ZonesRepository.getZonesWithStats(db);

      const transformedZones: ZoneWithStats[] = zonesWithStats.map((zone) => {
        const zoneWithStatsData = {
          id: zone.id,
          name: zone.name,
          color: zone.color,
          iconName: zone.iconName,
          stats: {
            activeProjects: zone.projectCount,
            completedProjects: 0,
            activeTasks: zone.activeTaskCount,
            completedTasks: zone.taskCount - zone.activeTaskCount,
            totalItems: zone.projectCount + zone.taskCount,
            lastActivity: null as Date | null,
          },
        };

        return ZoneWithStatsSchema.parse(zoneWithStatsData);
      });

      return ok({
        items: transformedZones,
        total: transformedZones.length,
      });
    } catch (error) {
      return err({
        code: "ZONES_STATS_ERROR",
        message: "Failed to fetch zones with statistics",
        details: error,
      });
    }
  }

  /**
   * Get a single zone by ID
   */
  static async getZoneById(id: number): Promise<DbResult<Zone | null>> {
    try {
      const db = await getDb();
      const result = await ZonesRepository.getZoneById(db, id);

      if (!result) {
        return ok(null);
      }

      return ok(result);
    } catch (error) {
      return err({
        code: "ZONE_GET_BY_ID_ERROR",
        message: "Error getting zone by ID",
        details: error,
      });
    }
  }

  /**
   * Get a single zone by name
   */
  static async getZoneByName(name: string): Promise<DbResult<Zone | null>> {
    try {
      const db = await getDb();
      const result = await ZonesRepository.getZoneByName(db, name);

      if (!result) {
        return ok(null);
      }

      return ok(result);
    } catch (error) {
      return err({
        code: "ZONE_GET_BY_NAME_ERROR",
        message: "Error getting zone by name",
        details: error,
      });
    }
  }
}
