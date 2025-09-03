import { getDb } from "@/server/db/client";
import { momentums, contacts } from "@/server/db/schema";
import { and, eq, desc, isNull, inArray } from "drizzle-orm";

export interface TaskFilter {
  workspaceId?: string;
  projectId?: string;
  status?: string;
  assignee?: string;
  approvalStatus?: string;
  parentTaskId?: string | null;
}

export interface CreateTaskData {
  workspaceId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assignee?: string;
  source?: string;
  approvalStatus?: string;
  taggedContacts?: string[] | null;
  dueDate?: Date | null;
  estimatedMinutes?: number | null;
  aiContext?: any | null;
}

export interface TaskWithContacts {
  id: string;
  userId: string;
  workspaceId: string | null;
  projectId: string | null;
  parentMomentumId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: string;
  source: string;
  approvalStatus: string;
  taggedContacts: any;
  dueDate: Date | null;
  completedAt: Date | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  aiContext: any;
  createdAt: Date;
  updatedAt: Date;
  contacts?: any[];
}

class TasksStorage {
  async getTasks(userId: string, filters: TaskFilter = {}): Promise<any[]> {
    const db = await getDb();
    
    // Build where conditions
    const conditions = [eq(momentums.userId, userId)];
    
    if (filters.workspaceId) {
      conditions.push(eq(momentums.workspaceId, filters.workspaceId));
    }
    
    if (filters.projectId) {
      conditions.push(eq(momentums.projectId, filters.projectId));
    }
    
    if (filters.status) {
      conditions.push(eq(momentums.status, filters.status));
    }
    
    if (filters.assignee) {
      conditions.push(eq(momentums.assignee, filters.assignee));
    }
    
    if (filters.approvalStatus) {
      conditions.push(eq(momentums.approvalStatus, filters.approvalStatus));
    }
    
    if (filters.hasOwnProperty('parentTaskId')) {
      if (filters.parentTaskId === null) {
        conditions.push(isNull(momentums.parentMomentumId));
      } else {
        conditions.push(eq(momentums.parentMomentumId, filters.parentTaskId));
      }
    }

    const tasks = await db
      .select()
      .from(momentums)
      .where(and(...conditions))
      .orderBy(desc(momentums.createdAt));

    return tasks;
  }

  async getTasksWithContacts(userId: string): Promise<TaskWithContacts[]> {
    const db = await getDb();
    
    const tasks = await db
      .select()
      .from(momentums)
      .where(eq(momentums.userId, userId))
      .orderBy(desc(momentums.createdAt));

    // For tasks with tagged contacts, fetch the contact details
    const tasksWithContacts: TaskWithContacts[] = [];
    
    for (const task of tasks) {
      let taskContacts: any[] = [];
      
      if (task.taggedContacts && Array.isArray(task.taggedContacts)) {
        const contactIds = task.taggedContacts.filter((id: any) => typeof id === 'string');
        
        if (contactIds.length > 0) {
          taskContacts = await db
            .select({
              id: contacts.id,
              displayName: contacts.displayName,
              primaryEmail: contacts.primaryEmail,
            })
            .from(contacts)
            .where(
              and(
                eq(contacts.userId, userId),
                inArray(contacts.id, contactIds)
              )
            );
        }
      }
      
      tasksWithContacts.push({
        ...task,
        contacts: taskContacts,
      });
    }

    return tasksWithContacts;
  }

  async createTask(userId: string, data: CreateTaskData): Promise<any> {
    const db = await getDb();
    
    const [task] = await db
      .insert(momentums)
      .values({
        userId,
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status || "todo",
        priority: data.priority || "medium",
        assignee: data.assignee || "user",
        source: data.source || "user",
        approvalStatus: data.approvalStatus || "approved",
        taggedContacts: data.taggedContacts ? data.taggedContacts : null,
        dueDate: data.dueDate,
        estimatedMinutes: data.estimatedMinutes,
        aiContext: data.aiContext,
      })
      .returning();

    return task;
  }

  async updateTask(userId: string, taskId: string, data: Partial<CreateTaskData>): Promise<any> {
    const db = await getDb();
    
    const [task] = await db
      .update(momentums)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(momentums.id, taskId), eq(momentums.userId, userId)))
      .returning();

    return task;
  }

  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    const db = await getDb();
    
    const result = await db
      .delete(momentums)
      .where(and(eq(momentums.id, taskId), eq(momentums.userId, userId)));

    return (result as any).rowCount > 0;
  }

  async getTaskById(userId: string, taskId: string): Promise<any | null> {
    const db = await getDb();
    
    const task = await db.query.momentums.findFirst({
      where: and(eq(momentums.id, taskId), eq(momentums.userId, userId)),
    });

    return task || null;
  }

  async getTasksByProject(userId: string, projectId: string): Promise<any[]> {
    return this.getTasks(userId, { projectId });
  }

  async getTasksByWorkspace(userId: string, workspaceId: string): Promise<any[]> {
    return this.getTasks(userId, { workspaceId });
  }

  async getPendingApprovalTasks(userId: string): Promise<any[]> {
    return this.getTasks(userId, { approvalStatus: "pending_approval" });
  }

  async approveTask(userId: string, taskId: string): Promise<any> {
    return this.updateTask(userId, taskId, { approvalStatus: "approved" });
  }

  async rejectTask(userId: string, taskId: string): Promise<any> {
    return this.updateTask(userId, taskId, { approvalStatus: "rejected" });
  }
}

export const tasksStorage = new TasksStorage();
