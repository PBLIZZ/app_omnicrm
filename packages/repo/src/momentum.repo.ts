import { eq, and, desc, isNull } from "drizzle-orm";
import {
  momentumWorkspaces,
  momentumProjects,
  momentums,
  momentumActions
} from "./schema";
import { getDb } from "./db";
import type {
  MomentumWorkspaceDTO,
  CreateMomentumWorkspaceDTO,
  UpdateMomentumWorkspaceDTO,
  MomentumProjectDTO,
  CreateMomentumProjectDTO,
  MomentumDTO,
  CreateMomentumDTO,
  UpdateMomentumDTO,
  MomentumActionDTO,
  CreateMomentumActionDTO
} from "@omnicrm/contracts";
import {
  MomentumWorkspaceDTOSchema,
  MomentumProjectDTOSchema,
  MomentumDTOSchema,
  MomentumActionDTOSchema
} from "@omnicrm/contracts";

export class MomentumRepository {
  // ---------- Workspaces ----------

  /**
   * List workspaces for a user
   */
  static async listWorkspaces(userId: string): Promise<MomentumWorkspaceDTO[]> {
    const db = await getDb();

    const rows = await db
      .select({
        id: momentumWorkspaces.id,
        userId: momentumWorkspaces.userId,
        name: momentumWorkspaces.name,
        description: momentumWorkspaces.description,
        color: momentumWorkspaces.color,
        isDefault: momentumWorkspaces.isDefault,
        createdAt: momentumWorkspaces.createdAt,
        updatedAt: momentumWorkspaces.updatedAt,
      })
      .from(momentumWorkspaces)
      .where(eq(momentumWorkspaces.userId, userId))
      .orderBy(desc(momentumWorkspaces.isDefault), momentumWorkspaces.name);

    return rows.map(row => MomentumWorkspaceDTOSchema.parse(row));
  }

  /**
   * Get workspace by ID
   */
  static async getWorkspaceById(userId: string, workspaceId: string): Promise<MomentumWorkspaceDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: momentumWorkspaces.id,
        userId: momentumWorkspaces.userId,
        name: momentumWorkspaces.name,
        description: momentumWorkspaces.description,
        color: momentumWorkspaces.color,
        isDefault: momentumWorkspaces.isDefault,
        createdAt: momentumWorkspaces.createdAt,
        updatedAt: momentumWorkspaces.updatedAt,
      })
      .from(momentumWorkspaces)
      .where(and(eq(momentumWorkspaces.userId, userId), eq(momentumWorkspaces.id, workspaceId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return MomentumWorkspaceDTOSchema.parse(rows[0]);
  }

  /**
   * Create workspace
   */
  static async createWorkspace(userId: string, data: CreateMomentumWorkspaceDTO): Promise<MomentumWorkspaceDTO> {
    const db = await getDb();

    const [newWorkspace] = await db
      .insert(momentumWorkspaces)
      .values({
        userId: userId,
        name: data.name,
        description: data.description ?? null,
        color: data.color,
        isDefault: data.isDefault,
      })
      .returning({
        id: momentumWorkspaces.id,
        userId: momentumWorkspaces.userId,
        name: momentumWorkspaces.name,
        description: momentumWorkspaces.description,
        color: momentumWorkspaces.color,
        isDefault: momentumWorkspaces.isDefault,
        createdAt: momentumWorkspaces.createdAt,
        updatedAt: momentumWorkspaces.updatedAt,
      });

    return MomentumWorkspaceDTOSchema.parse(newWorkspace);
  }

  /**
   * Update workspace
   */
  static async updateWorkspace(
    userId: string,
    workspaceId: string,
    data: UpdateMomentumWorkspaceDTO
  ): Promise<MomentumWorkspaceDTO | null> {
    const db = await getDb();

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const updateValues = {
      updatedAt: new Date(),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    };

    const [updatedWorkspace] = await db
      .update(momentumWorkspaces)
      .set(updateValues)
      .where(and(eq(momentumWorkspaces.userId, userId), eq(momentumWorkspaces.id, workspaceId)))
      .returning({
        id: momentumWorkspaces.id,
        userId: momentumWorkspaces.userId,
        name: momentumWorkspaces.name,
        description: momentumWorkspaces.description,
        color: momentumWorkspaces.color,
        isDefault: momentumWorkspaces.isDefault,
        createdAt: momentumWorkspaces.createdAt,
        updatedAt: momentumWorkspaces.updatedAt,
      });

    if (!updatedWorkspace) {
      return null;
    }

    return MomentumWorkspaceDTOSchema.parse(updatedWorkspace);
  }

  /**
   * Delete workspace
   */
  static async deleteWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    const db = await getDb();

    const result = await db
      .delete(momentumWorkspaces)
      .where(and(eq(momentumWorkspaces.userId, userId), eq(momentumWorkspaces.id, workspaceId)));

    return result.length > 0;
  }

  // ---------- Projects ----------

  /**
   * List projects for a workspace
   */
  static async listProjects(userId: string, workspaceId?: string): Promise<MomentumProjectDTO[]> {
    const db = await getDb();

    // Build conditions array
    const conditions = [eq(momentumProjects.userId, userId)];

    if (workspaceId) {
      conditions.push(eq(momentumProjects.momentumWorkspaceId, workspaceId));
    }

    const query = db
      .select({
        id: momentumProjects.id,
        userId: momentumProjects.userId,
        momentumWorkspaceId: momentumProjects.momentumWorkspaceId,
        name: momentumProjects.name,
        description: momentumProjects.description,
        color: momentumProjects.color,
        status: momentumProjects.status,
        dueDate: momentumProjects.dueDate,
        createdAt: momentumProjects.createdAt,
        updatedAt: momentumProjects.updatedAt,
      })
      .from(momentumProjects)
      .where(and(...conditions))
      .orderBy(momentumProjects.name);

    const rows = await query;

    return rows.map(row => MomentumProjectDTOSchema.parse(row));
  }

  /**
   * Get project by ID
   */
  static async getProjectById(userId: string, projectId: string): Promise<MomentumProjectDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: momentumProjects.id,
        userId: momentumProjects.userId,
        momentumWorkspaceId: momentumProjects.momentumWorkspaceId,
        name: momentumProjects.name,
        description: momentumProjects.description,
        color: momentumProjects.color,
        status: momentumProjects.status,
        dueDate: momentumProjects.dueDate,
        createdAt: momentumProjects.createdAt,
        updatedAt: momentumProjects.updatedAt,
      })
      .from(momentumProjects)
      .where(and(eq(momentumProjects.userId, userId), eq(momentumProjects.id, projectId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return MomentumProjectDTOSchema.parse(rows[0]);
  }

  /**
   * Create project
   */
  static async createProject(userId: string, data: CreateMomentumProjectDTO): Promise<MomentumProjectDTO> {
    const db = await getDb();

    const [newProject] = await db
      .insert(momentumProjects)
      .values({
        userId: userId,
        momentumWorkspaceId: data.momentumWorkspaceId,
        name: data.name,
        description: data.description ?? null,
        color: data.color,
        status: data.status,
        dueDate: data.dueDate ?? null,
      })
      .returning({
        id: momentumProjects.id,
        userId: momentumProjects.userId,
        momentumWorkspaceId: momentumProjects.momentumWorkspaceId,
        name: momentumProjects.name,
        description: momentumProjects.description,
        color: momentumProjects.color,
        status: momentumProjects.status,
        dueDate: momentumProjects.dueDate,
        createdAt: momentumProjects.createdAt,
        updatedAt: momentumProjects.updatedAt,
      });

    return MomentumProjectDTOSchema.parse(newProject);
  }

  // ---------- Momentums ----------

  /**
   * List momentums with optional filtering
   */
  static async listMomentums(
    userId: string,
    filters?: {
      workspaceId?: string;
      projectId?: string;
      status?: string;
      parentMomentumId?: string | null;
    }
  ): Promise<MomentumDTO[]> {
    const db = await getDb();

    // Build conditions array
    const conditions = [eq(momentums.userId, userId)];

    if (filters?.workspaceId) {
      conditions.push(eq(momentums.momentumWorkspaceId, filters.workspaceId));
    }

    if (filters?.projectId) {
      conditions.push(eq(momentums.momentumProjectId, filters.projectId));
    }

    if (filters?.status) {
      conditions.push(eq(momentums.status, filters.status));
    }

    if (filters?.parentMomentumId === null) {
      conditions.push(isNull(momentums.parentMomentumId));
    } else if (filters?.parentMomentumId) {
      conditions.push(eq(momentums.parentMomentumId, filters.parentMomentumId));
    }

    const query = db
      .select({
        id: momentums.id,
        userId: momentums.userId,
        momentumWorkspaceId: momentums.momentumWorkspaceId,
        momentumProjectId: momentums.momentumProjectId,
        parentMomentumId: momentums.parentMomentumId,
        title: momentums.title,
        description: momentums.description,
        status: momentums.status,
        priority: momentums.priority,
        assignee: momentums.assignee,
        source: momentums.source,
        approvalStatus: momentums.approvalStatus,
        taggedContacts: momentums.taggedContacts,
        dueDate: momentums.dueDate,
        completedAt: momentums.completedAt,
        estimatedMinutes: momentums.estimatedMinutes,
        actualMinutes: momentums.actualMinutes,
        aiContext: momentums.aiContext,
        createdAt: momentums.createdAt,
        updatedAt: momentums.updatedAt,
      })
      .from(momentums)
      .where(and(...conditions))
      .orderBy(desc(momentums.createdAt));

    const rows = await query;

    return rows.map(row => MomentumDTOSchema.parse(row));
  }

  /**
   * Get momentum by ID
   */
  static async getMomentumById(userId: string, momentumId: string): Promise<MomentumDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: momentums.id,
        userId: momentums.userId,
        momentumWorkspaceId: momentums.momentumWorkspaceId,
        momentumProjectId: momentums.momentumProjectId,
        parentMomentumId: momentums.parentMomentumId,
        title: momentums.title,
        description: momentums.description,
        status: momentums.status,
        priority: momentums.priority,
        assignee: momentums.assignee,
        source: momentums.source,
        approvalStatus: momentums.approvalStatus,
        taggedContacts: momentums.taggedContacts,
        dueDate: momentums.dueDate,
        completedAt: momentums.completedAt,
        estimatedMinutes: momentums.estimatedMinutes,
        actualMinutes: momentums.actualMinutes,
        aiContext: momentums.aiContext,
        createdAt: momentums.createdAt,
        updatedAt: momentums.updatedAt,
      })
      .from(momentums)
      .where(and(eq(momentums.userId, userId), eq(momentums.id, momentumId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return MomentumDTOSchema.parse(rows[0]);
  }

  /**
   * Create momentum
   */
  static async createMomentum(userId: string, data: CreateMomentumDTO): Promise<MomentumDTO> {
    const db = await getDb();

    const [newMomentum] = await db
      .insert(momentums)
      .values({
        userId: userId,
        momentumWorkspaceId: data.momentumWorkspaceId ?? null,
        momentumProjectId: data.momentumProjectId ?? null,
        parentMomentumId: data.parentMomentumId ?? null,
        title: data.title,
        description: data.description ?? null,
        status: data.status,
        priority: data.priority,
        assignee: data.assignee,
        source: data.source,
        approvalStatus: data.approvalStatus,
        taggedContacts: data.taggedContacts ?? null,
        dueDate: data.dueDate ?? null,
        estimatedMinutes: data.estimatedMinutes ?? null,
        aiContext: data.aiContext ?? null,
      })
      .returning({
        id: momentums.id,
        userId: momentums.userId,
        momentumWorkspaceId: momentums.momentumWorkspaceId,
        momentumProjectId: momentums.momentumProjectId,
        parentMomentumId: momentums.parentMomentumId,
        title: momentums.title,
        description: momentums.description,
        status: momentums.status,
        priority: momentums.priority,
        assignee: momentums.assignee,
        source: momentums.source,
        approvalStatus: momentums.approvalStatus,
        taggedContacts: momentums.taggedContacts,
        dueDate: momentums.dueDate,
        completedAt: momentums.completedAt,
        estimatedMinutes: momentums.estimatedMinutes,
        actualMinutes: momentums.actualMinutes,
        aiContext: momentums.aiContext,
        createdAt: momentums.createdAt,
        updatedAt: momentums.updatedAt,
      });

    return MomentumDTOSchema.parse(newMomentum);
  }

  /**
   * Update momentum
   */
  static async updateMomentum(
    userId: string,
    momentumId: string,
    data: UpdateMomentumDTO
  ): Promise<MomentumDTO | null> {
    const db = await getDb();

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const updateValues = {
      updatedAt: new Date(),
      ...(data.momentumWorkspaceId !== undefined && { momentumWorkspaceId: data.momentumWorkspaceId ?? null }),
      ...(data.momentumProjectId !== undefined && { momentumProjectId: data.momentumProjectId ?? null }),
      ...(data.parentMomentumId !== undefined && { parentMomentumId: data.parentMomentumId ?? null }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.assignee !== undefined && { assignee: data.assignee }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.approvalStatus !== undefined && { approvalStatus: data.approvalStatus }),
      ...(data.taggedContacts !== undefined && { taggedContacts: data.taggedContacts ?? null }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ?? null }),
      ...(data.estimatedMinutes !== undefined && { estimatedMinutes: data.estimatedMinutes ?? null }),
      ...(data.aiContext !== undefined && { aiContext: data.aiContext ?? null }),
    };

    const [updatedMomentum] = await db
      .update(momentums)
      .set(updateValues)
      .where(and(eq(momentums.userId, userId), eq(momentums.id, momentumId)))
      .returning({
        id: momentums.id,
        userId: momentums.userId,
        momentumWorkspaceId: momentums.momentumWorkspaceId,
        momentumProjectId: momentums.momentumProjectId,
        parentMomentumId: momentums.parentMomentumId,
        title: momentums.title,
        description: momentums.description,
        status: momentums.status,
        priority: momentums.priority,
        assignee: momentums.assignee,
        source: momentums.source,
        approvalStatus: momentums.approvalStatus,
        taggedContacts: momentums.taggedContacts,
        dueDate: momentums.dueDate,
        completedAt: momentums.completedAt,
        estimatedMinutes: momentums.estimatedMinutes,
        actualMinutes: momentums.actualMinutes,
        aiContext: momentums.aiContext,
        createdAt: momentums.createdAt,
        updatedAt: momentums.updatedAt,
      });

    if (!updatedMomentum) {
      return null;
    }

    return MomentumDTOSchema.parse(updatedMomentum);
  }

  /**
   * Delete momentum
   */
  static async deleteMomentum(userId: string, momentumId: string): Promise<boolean> {
    const db = await getDb();

    const result = await db
      .delete(momentums)
      .where(and(eq(momentums.userId, userId), eq(momentums.id, momentumId)));

    return result.length > 0;
  }

  // ---------- Momentum Actions ----------

  /**
   * List actions for a momentum
   */
  static async listMomentumActions(userId: string, momentumId: string): Promise<MomentumActionDTO[]> {
    const db = await getDb();

    const rows = await db
      .select({
        id: momentumActions.id,
        userId: momentumActions.userId,
        momentumId: momentumActions.momentumId,
        action: momentumActions.action,
        previousData: momentumActions.previousData,
        newData: momentumActions.newData,
        notes: momentumActions.notes,
        createdAt: momentumActions.createdAt,
      })
      .from(momentumActions)
      .where(and(eq(momentumActions.userId, userId), eq(momentumActions.momentumId, momentumId)))
      .orderBy(desc(momentumActions.createdAt));

    return rows.map(row => MomentumActionDTOSchema.parse(row));
  }

  /**
   * Create momentum action
   */
  static async createMomentumAction(userId: string, data: CreateMomentumActionDTO): Promise<MomentumActionDTO> {
    const db = await getDb();

    const [newAction] = await db
      .insert(momentumActions)
      .values({
        userId: userId,
        momentumId: data.momentumId,
        action: data.action,
        previousData: data.previousData ?? null,
        newData: data.newData ?? null,
        notes: data.notes ?? null,
      })
      .returning({
        id: momentumActions.id,
        userId: momentumActions.userId,
        momentumId: momentumActions.momentumId,
        action: momentumActions.action,
        previousData: momentumActions.previousData,
        newData: momentumActions.newData,
        notes: momentumActions.notes,
        createdAt: momentumActions.createdAt,
      });

    return MomentumActionDTOSchema.parse(newAction);
  }
}