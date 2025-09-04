// Momentum storage layer
import { getDb } from "@/server/db/client";
import {
  momentumWorkspaces,
  momentumProjects,
  momentums,
  momentumActions,
  contacts,
} from "@/server/db/schema";
import { eq, desc, and, isNull, inArray } from "drizzle-orm";
import type {
  MomentumWorkspace,
  NewMomentumWorkspace,
  MomentumProject,
  NewMomentumProject,
  Momentum,
  NewMomentum,
  MomentumAction,
  NewMomentumAction,
  Contact,
} from "@/server/db/schema";

export class MomentumStorage {
  // ============ MOMENTUM WORKSPACES ============

  async createMomentumWorkspace(
    userId: string,
    data: Omit<NewMomentumWorkspace, "userId">,
  ): Promise<MomentumWorkspace> {
    const db = await getDb();
    const [workspace] = await db
      .insert(momentumWorkspaces)
      .values({
        ...data,
        userId,
      })
      .returning();
    if (!workspace) throw new Error("Failed to create momentum workspace");
    return workspace;
  }

  async getMomentumWorkspaces(userId: string): Promise<MomentumWorkspace[]> {
    const db = await getDb();
    return await db
      .select()
      .from(momentumWorkspaces)
      .where(eq(momentumWorkspaces.userId, userId))
      .orderBy(desc(momentumWorkspaces.updatedAt));
  }

  async getMomentumWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<MomentumWorkspace | null> {
    const db = await getDb();
    const [workspace] = await db
      .select()
      .from(momentumWorkspaces)
      .where(and(eq(momentumWorkspaces.id, workspaceId), eq(momentumWorkspaces.userId, userId)));
    return workspace ?? null;
  }

  async updateMomentumWorkspace(
    workspaceId: string,
    userId: string,
    data: Partial<Omit<NewMomentumWorkspace, "userId">>,
  ): Promise<void> {
    const db = await getDb();
    await db
      .update(momentumWorkspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(momentumWorkspaces.id, workspaceId), eq(momentumWorkspaces.userId, userId)));
  }

  async deleteMomentumWorkspace(workspaceId: string, userId: string): Promise<void> {
    // Note: This will cascade delete projects and momentums via DB constraints
    const db = await getDb();
    await db
      .delete(momentumWorkspaces)
      .where(and(eq(momentumWorkspaces.id, workspaceId), eq(momentumWorkspaces.userId, userId)));
  }

  // ============ MOMENTUM PROJECTS ============

  async createMomentumProject(
    userId: string,
    data: Omit<NewMomentumProject, "userId">,
  ): Promise<MomentumProject> {
    const db = await getDb();
    const [project] = await db
      .insert(momentumProjects)
      .values({
        ...data,
        userId,
      })
      .returning();
    if (!project) throw new Error("Failed to create momentum project");
    return project;
  }

  async getMomentumProjects(userId: string, workspaceId?: string): Promise<MomentumProject[]> {
    const db = await getDb();
    const conditions = [eq(momentumProjects.userId, userId)];

    if (workspaceId) {
      conditions.push(eq(momentumProjects.momentumWorkspaceId, workspaceId));
    }

    return await db
      .select()
      .from(momentumProjects)
      .where(and(...conditions))
      .orderBy(desc(momentumProjects.updatedAt));
  }

  async getMomentumProject(projectId: string, userId: string): Promise<MomentumProject | null> {
    const db = await getDb();
    const [project] = await db
      .select()
      .from(momentumProjects)
      .where(and(eq(momentumProjects.id, projectId), eq(momentumProjects.userId, userId)));
    return project ?? null;
  }

  async updateMomentumProject(
    projectId: string,
    userId: string,
    data: Partial<Omit<NewMomentumProject, "userId">>,
  ): Promise<void> {
    const db = await getDb();
    await db
      .update(momentumProjects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(momentumProjects.id, projectId), eq(momentumProjects.userId, userId)));
  }

  async deleteMomentumProject(projectId: string, userId: string): Promise<void> {
    // Note: This will cascade delete momentums via DB constraints or set projectId to null
    const db = await getDb();
    await db
      .delete(momentumProjects)
      .where(and(eq(momentumProjects.id, projectId), eq(momentumProjects.userId, userId)));
  }

  // ============ MOMENTUMS ============

  async createMomentum(userId: string, data: Omit<NewMomentum, "userId">): Promise<Momentum> {
    const db = await getDb();
    const [momentum] = await db
      .insert(momentums)
      .values({
        ...data,
        userId,
      })
      .returning();
    if (!momentum) throw new Error("Failed to create momentum");
    return momentum;
  }

  async getMomentums(
    userId: string,
    filters?: {
      workspaceId?: string;
      projectId?: string;
      status?: string;
      assignee?: string;
      approvalStatus?: string;
      parentMomentumId?: string | null;
    },
  ): Promise<Momentum[]> {
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
    if (filters?.assignee) {
      conditions.push(eq(momentums.assignee, filters.assignee));
    }
    if (filters?.approvalStatus) {
      conditions.push(eq(momentums.approvalStatus, filters.approvalStatus));
    }
    if (filters?.parentMomentumId !== undefined) {
      if (filters.parentMomentumId === null) {
        conditions.push(isNull(momentums.parentMomentumId));
      } else {
        conditions.push(eq(momentums.parentMomentumId, filters.parentMomentumId));
      }
    }

    const db = await getDb();
    return await db
      .select()
      .from(momentums)
      .where(and(...conditions))
      .orderBy(desc(momentums.updatedAt));
  }

  async getMomentum(momentumId: string, userId: string): Promise<Momentum | null> {
    const db = await getDb();
    const [momentum] = await db
      .select()
      .from(momentums)
      .where(and(eq(momentums.id, momentumId), eq(momentums.userId, userId)));
    return momentum ?? null;
  }

  async updateMomentum(
    momentumId: string,
    userId: string,
    data: Partial<Omit<NewMomentum, "userId">>,
  ): Promise<void> {
    const db = await getDb();
    await db
      .update(momentums)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(momentums.id, momentumId), eq(momentums.userId, userId)));
  }

  async deleteMomentum(momentumId: string, userId: string): Promise<void> {
    const db = await getDb();
    await db
      .delete(momentums)
      .where(and(eq(momentums.id, momentumId), eq(momentums.userId, userId)));
  }

  // Get sub-momentums for a parent momentum
  async getSubMomentums(parentMomentumId: string, userId: string): Promise<Momentum[]> {
    const db = await getDb();
    return await db
      .select()
      .from(momentums)
      .where(and(eq(momentums.parentMomentumId, parentMomentumId), eq(momentums.userId, userId)))
      .orderBy(desc(momentums.createdAt));
  }

  // Get momentums pending approval (AI-generated)
  async getPendingApprovalMomentums(userId: string): Promise<Momentum[]> {
    const db = await getDb();
    return await db
      .select()
      .from(momentums)
      .where(and(eq(momentums.userId, userId), eq(momentums.approvalStatus, "pending_approval")))
      .orderBy(desc(momentums.createdAt));
  }

  // Get momentums with tagged contacts populated
  async getMomentumsWithContacts(
    userId: string,
    momentumIds?: string[],
  ): Promise<Array<Momentum & { taggedContactsData?: Contact[] }>> {
    const conditions = [eq(momentums.userId, userId)];

    if (momentumIds && momentumIds.length > 0) {
      conditions.push(inArray(momentums.id, momentumIds));
    }

    const db = await getDb();
    const momentumsList = await db
      .select()
      .from(momentums)
      .where(and(...conditions))
      .orderBy(desc(momentums.updatedAt));

    // For each momentum, fetch the tagged contacts if they exist
    const momentumsWithContacts = await Promise.all(
      momentumsList.map(async (momentum) => {
        // Type-safe access to taggedContacts
        const taggedContacts = momentum.taggedContacts;
        
        if (
          taggedContacts &&
          Array.isArray(taggedContacts) &&
          taggedContacts.length > 0 &&
          taggedContacts.every(id => typeof id === 'string')
        ) {
          const taggedContactsData = await db
            .select()
            .from(contacts)
            .where(
              and(
                eq(contacts.userId, userId),
                inArray(contacts.id, taggedContacts as string[]),
              ),
            );

          return { ...momentum, taggedContactsData };
        }
        return { ...momentum, taggedContactsData: [] };
      }),
    );

    return momentumsWithContacts;
  }

  // ============ MOMENTUM ACTIONS (for AI training) ============

  async createMomentumAction(
    userId: string,
    data: Omit<NewMomentumAction, "userId">,
  ): Promise<MomentumAction> {
    const db = await getDb();
    const [action] = await db
      .insert(momentumActions)
      .values({
        ...data,
        userId,
      })
      .returning();
    if (!action) throw new Error("Failed to create momentum action");
    return action;
  }

  async getMomentumActions(momentumId: string, userId: string): Promise<MomentumAction[]> {
    const db = await getDb();
    return await db
      .select()
      .from(momentumActions)
      .where(and(eq(momentumActions.momentumId, momentumId), eq(momentumActions.userId, userId)))
      .orderBy(desc(momentumActions.createdAt));
  }

  async getUserMomentumActions(userId: string, limit?: number): Promise<MomentumAction[]> {
    const db = await getDb();
    const query = db
      .select()
      .from(momentumActions)
      .where(eq(momentumActions.userId, userId))
      .orderBy(desc(momentumActions.createdAt));

    if (limit) {
      return await query.limit(limit);
    }

    return await query;
  }

  // ============ BULK OPERATIONS ============

  async approveMomentum(momentumId: string, userId: string, notes?: string): Promise<void> {
    const momentum = await this.getMomentum(momentumId, userId);
    if (!momentum) return;

    // Update momentum approval status
    await this.updateMomentum(momentumId, userId, {
      approvalStatus: "approved",
      status: momentum.status === "pending_approval" ? "todo" : momentum.status,
    });

    // Record the action for AI training
    await this.createMomentumAction(userId, {
      momentumId,
      action: "approved",
      previousData: { approvalStatus: momentum.approvalStatus },
      newData: { approvalStatus: "approved" },
      notes,
    });
  }

  async rejectMomentum(momentumId: string, userId: string, notes?: string): Promise<void> {
    const momentum = await this.getMomentum(momentumId, userId);
    if (!momentum) return;

    // Update momentum approval status
    await this.updateMomentum(momentumId, userId, {
      approvalStatus: "rejected",
      status: "cancelled",
    });

    // Record the action for AI training
    await this.createMomentumAction(userId, {
      momentumId,
      action: "rejected",
      previousData: { approvalStatus: momentum.approvalStatus },
      newData: { approvalStatus: "rejected" },
      notes,
    });
  }

  async bulkApproveMomentums(momentumIds: string[], userId: string): Promise<void> {
    for (const momentumId of momentumIds) {
      await this.approveMomentum(momentumId, userId);
    }
  }

  async bulkRejectMomentums(momentumIds: string[], userId: string): Promise<void> {
    for (const momentumId of momentumIds) {
      await this.rejectMomentum(momentumId, userId);
    }
  }

  // ============ LEGACY COMPATIBILITY METHODS ============
  // These methods provide backward compatibility for existing code during migration

  async createWorkspace(
    userId: string,
    data: Omit<NewMomentumWorkspace, "userId">,
  ): Promise<MomentumWorkspace> {
    return this.createMomentumWorkspace(userId, data);
  }

  async getWorkspaces(userId: string): Promise<MomentumWorkspace[]> {
    return this.getMomentumWorkspaces(userId);
  }

  async getWorkspace(workspaceId: string, userId: string): Promise<MomentumWorkspace | null> {
    return this.getMomentumWorkspace(workspaceId, userId);
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    data: Partial<Omit<NewMomentumWorkspace, "userId">>,
  ): Promise<void> {
    return this.updateMomentumWorkspace(workspaceId, userId, data);
  }

  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    return this.deleteMomentumWorkspace(workspaceId, userId);
  }

  async createProject(
    userId: string,
    data: Omit<NewMomentumProject, "userId">,
  ): Promise<MomentumProject> {
    return this.createMomentumProject(userId, data);
  }

  async getProjects(userId: string, workspaceId?: string): Promise<MomentumProject[]> {
    return this.getMomentumProjects(userId, workspaceId);
  }

  async getProject(projectId: string, userId: string): Promise<MomentumProject | null> {
    return this.getMomentumProject(projectId, userId);
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: Partial<Omit<NewMomentumProject, "userId">>,
  ): Promise<void> {
    return this.updateMomentumProject(projectId, userId, data);
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    return this.deleteMomentumProject(projectId, userId);
  }

  async createTask(userId: string, data: Omit<NewMomentum, "userId">): Promise<Momentum> {
    return this.createMomentum(userId, data);
  }

  async getTasks(
    userId: string,
    filters?: {
      workspaceId?: string;
      projectId?: string;
      status?: string;
      assignee?: string;
      approvalStatus?: string;
      parentTaskId?: string | null;
    },
  ): Promise<Momentum[]> {
    // Map parentTaskId to parentMomentumId for compatibility
    if (!filters) {
      return this.getMomentums(userId);
    }
    const { parentTaskId, ...restFilters } = filters;
    const momentumFilters =
      parentTaskId !== undefined
        ? {
            ...restFilters,
            parentMomentumId: parentTaskId,
          }
        : restFilters;
    return this.getMomentums(userId, momentumFilters);
  }

  async getTask(taskId: string, userId: string): Promise<Momentum | null> {
    return this.getMomentum(taskId, userId);
  }

  async updateTask(
    taskId: string,
    userId: string,
    data: Partial<Omit<NewMomentum, "userId">>,
  ): Promise<void> {
    return this.updateMomentum(taskId, userId, data);
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    return this.deleteMomentum(taskId, userId);
  }

  async getSubtasks(parentTaskId: string, userId: string): Promise<Momentum[]> {
    return this.getSubMomentums(parentTaskId, userId);
  }

  async getPendingApprovalTasks(userId: string): Promise<Momentum[]> {
    return this.getPendingApprovalMomentums(userId);
  }

  async getTasksWithContacts(
    userId: string,
    taskIds?: string[],
  ): Promise<Array<Momentum & { taggedContactsData?: Contact[] }>> {
    return this.getMomentumsWithContacts(userId, taskIds);
  }

  async createTaskAction(
    userId: string,
    data: Omit<NewMomentumAction, "userId">,
  ): Promise<MomentumAction> {
    // Map taskId to momentumId for compatibility
    const actionData = { ...data };
    if ("taskId" in actionData) {
      const dataWithTaskId = actionData as typeof actionData & { taskId: string };
      actionData.momentumId = dataWithTaskId.taskId;
      delete (dataWithTaskId as unknown as { taskId?: string }).taskId;
    }
    return this.createMomentumAction(userId, actionData);
  }

  async getTaskActions(taskId: string, userId: string): Promise<MomentumAction[]> {
    return this.getMomentumActions(taskId, userId);
  }

  async getUserTaskActions(userId: string, limit?: number): Promise<MomentumAction[]> {
    return this.getUserMomentumActions(userId, limit);
  }

  async approveTask(taskId: string, userId: string, notes?: string): Promise<void> {
    return this.approveMomentum(taskId, userId, notes);
  }

  async rejectTask(taskId: string, userId: string, notes?: string): Promise<void> {
    return this.rejectMomentum(taskId, userId, notes);
  }

  async bulkApprove(taskIds: string[], userId: string): Promise<void> {
    return this.bulkApproveMomentums(taskIds, userId);
  }

  async bulkReject(taskIds: string[], userId: string): Promise<void> {
    return this.bulkRejectMomentums(taskIds, userId);
  }
}

// Export singleton instance
export const momentumStorage = new MomentumStorage();

// Legacy export for backward compatibility
export const tasksStorage = momentumStorage;
