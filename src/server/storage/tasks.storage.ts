// Tasks storage layer
import { db } from "@/server/db";
import { workspaces, projects, tasks, taskActions, contacts } from "@/server/db/schema";
import { eq, desc, and, isNull, inArray } from "drizzle-orm";
import type { 
  Workspace, NewWorkspace,
  Project, NewProject, 
  Task, NewTask,
  TaskAction, NewTaskAction,
  Contact
} from "@/server/db/schema";

export class TasksStorage {
  // ============ WORKSPACES ============
  
  async createWorkspace(userId: string, data: Omit<NewWorkspace, 'userId'>): Promise<Workspace> {
    const [workspace] = await db
      .insert(workspaces)
      .values({
        ...data,
        userId,
      })
      .returning();
    return workspace!;
  }

  async getWorkspaces(userId: string): Promise<Workspace[]> {
    return await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userId, userId))
      .orderBy(desc(workspaces.updatedAt));
  }

  async getWorkspace(workspaceId: string, userId: string): Promise<Workspace | null> {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)));
    return workspace || null;
  }

  async updateWorkspace(workspaceId: string, userId: string, data: Partial<Omit<NewWorkspace, 'userId'>>): Promise<void> {
    await db
      .update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)));
  }

  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    // Note: This will cascade delete projects and tasks via DB constraints
    await db
      .delete(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)));
  }

  // ============ PROJECTS ============
  
  async createProject(userId: string, data: Omit<NewProject, 'userId'>): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values({
        ...data,
        userId,
      })
      .returning();
    return project!;
  }

  async getProjects(userId: string, workspaceId?: string): Promise<Project[]> {
    let query: any = db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId));
    
    if (workspaceId) {
      query = query.where(and(eq(projects.userId, userId), eq(projects.workspaceId, workspaceId)));
    }
    
    return await query.orderBy(desc(projects.updatedAt));
  }

  async getProject(projectId: string, userId: string): Promise<Project | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
    return project || null;
  }

  async updateProject(projectId: string, userId: string, data: Partial<Omit<NewProject, 'userId'>>): Promise<void> {
    await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    // Note: This will cascade delete tasks via DB constraints or set projectId to null
    await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  }

  // ============ TASKS ============
  
  async createTask(userId: string, data: Omit<NewTask, 'userId'>): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        ...data,
        userId,
      })
      .returning();
    return task!;
  }

  async getTasks(userId: string, filters?: {
    workspaceId?: string;
    projectId?: string;
    status?: string;
    assignee?: string;
    approvalStatus?: string;
    parentTaskId?: string | null;
  }): Promise<Task[]> {
    let query: any = db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId));

    if (filters?.workspaceId) {
      query = query.where(and(eq(tasks.userId, userId), eq(tasks.workspaceId, filters.workspaceId)));
    }
    if (filters?.projectId) {
      query = query.where(and(eq(tasks.userId, userId), eq(tasks.projectId, filters.projectId)));
    }
    if (filters?.status) {
      query = query.where(and(eq(tasks.userId, userId), eq(tasks.status, filters.status)));
    }
    if (filters?.assignee) {
      query = query.where(and(eq(tasks.userId, userId), eq(tasks.assignee, filters.assignee)));
    }
    if (filters?.approvalStatus) {
      query = query.where(and(eq(tasks.userId, userId), eq(tasks.approvalStatus, filters.approvalStatus)));
    }
    if (filters?.parentTaskId !== undefined) {
      if (filters.parentTaskId === null) {
        query = query.where(and(eq(tasks.userId, userId), isNull(tasks.parentTaskId)));
      } else {
        query = query.where(and(eq(tasks.userId, userId), eq(tasks.parentTaskId, filters.parentTaskId)));
      }
    }

    return await query.orderBy(desc(tasks.updatedAt));
  }

  async getTask(taskId: string, userId: string): Promise<Task | null> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
    return task || null;
  }

  async updateTask(taskId: string, userId: string, data: Partial<Omit<NewTask, 'userId'>>): Promise<void> {
    await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  // Get subtasks for a parent task
  async getSubtasks(parentTaskId: string, userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parentTaskId, parentTaskId), eq(tasks.userId, userId)))
      .orderBy(desc(tasks.createdAt));
  }

  // Get tasks pending approval (AI-generated)
  async getPendingApprovalTasks(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId), 
        eq(tasks.approvalStatus, "pending_approval")
      ))
      .orderBy(desc(tasks.createdAt));
  }

  // Get tasks with tagged contacts populated
  async getTasksWithContacts(userId: string, taskIds?: string[]): Promise<Array<Task & { taggedContactsData?: Contact[] }>> {
    let query: any = db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId));

    if (taskIds && taskIds.length > 0) {
      query = query.where(and(eq(tasks.userId, userId), inArray(tasks.id, taskIds)));
    }

    const tasksList = await query.orderBy(desc(tasks.updatedAt));
    
    // For each task, fetch the tagged contacts if they exist
    const tasksWithContacts = await Promise.all(
      tasksList.map(async (task: any) => {
        if (task['taggedContacts'] && Array.isArray(task['taggedContacts']) && task['taggedContacts'].length > 0) {
          const taggedContactsData = await db
            .select()
            .from(contacts)
            .where(and(
              eq(contacts.userId, userId),
              inArray(contacts.id, task['taggedContacts'] as string[])
            ));
          
          return { ...task, taggedContactsData };
        }
        return { ...task, taggedContactsData: [] };
      })
    );

    return tasksWithContacts;
  }

  // ============ TASK ACTIONS (for AI training) ============
  
  async createTaskAction(userId: string, data: Omit<NewTaskAction, 'userId'>): Promise<TaskAction> {
    const [action] = await db
      .insert(taskActions)
      .values({
        ...data,
        userId,
      })
      .returning();
    return action!;
  }

  async getTaskActions(taskId: string, userId: string): Promise<TaskAction[]> {
    return await db
      .select()
      .from(taskActions)
      .where(and(eq(taskActions.taskId, taskId), eq(taskActions.userId, userId)))
      .orderBy(desc(taskActions.createdAt));
  }

  async getUserTaskActions(userId: string, limit?: number): Promise<TaskAction[]> {
    let query: any = db
      .select()
      .from(taskActions)
      .where(eq(taskActions.userId, userId))
      .orderBy(desc(taskActions.createdAt));

    if (limit) {
      query = query.limit(limit);
    }

    return await query;
  }

  // ============ BULK OPERATIONS ============
  
  async approveTask(taskId: string, userId: string, notes?: string): Promise<void> {
    const task = await this.getTask(taskId, userId);
    if (!task) return;

    // Update task approval status
    await this.updateTask(taskId, userId, { 
      approvalStatus: "approved",
      status: task.status === "pending_approval" ? "todo" : task.status
    });

    // Record the action for AI training
    await this.createTaskAction(userId, {
      taskId,
      action: "approved",
      previousData: { approvalStatus: task.approvalStatus },
      newData: { approvalStatus: "approved" },
      notes,
    });
  }

  async rejectTask(taskId: string, userId: string, notes?: string): Promise<void> {
    const task = await this.getTask(taskId, userId);
    if (!task) return;

    // Update task approval status
    await this.updateTask(taskId, userId, { 
      approvalStatus: "rejected",
      status: "cancelled"
    });

    // Record the action for AI training
    await this.createTaskAction(userId, {
      taskId,
      action: "rejected", 
      previousData: { approvalStatus: task.approvalStatus },
      newData: { approvalStatus: "rejected" },
      notes,
    });
  }

  async bulkApprove(taskIds: string[], userId: string): Promise<void> {
    for (const taskId of taskIds) {
      await this.approveTask(taskId, userId);
    }
  }

  async bulkReject(taskIds: string[], userId: string): Promise<void> {
    for (const taskId of taskIds) {
      await this.rejectTask(taskId, userId);
    }
  }
}

// Export singleton instance
export const tasksStorage = new TasksStorage();