/**
 * Explicit Productivity Types
 *
 * Drizzle's type inference breaks with circular references (tasks.parentTaskId -> tasks.id)
 * These explicit types break the circular dependency while maintaining type safety.
 *
 * @see https://github.com/drizzle-team/drizzle-orm/issues/695
 */

// ============================================================================
// BASE TYPES - NO CIRCULAR REFERENCES
// ============================================================================

export type Task = {
  id: string;
  userId: string;
  projectId: string | null;
  parentTaskId: string | null;
  name: string;
  status: "todo" | "in_progress" | "done" | "canceled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null; // date column returns string
  details: unknown;
  completedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Project = {
  id: string;
  userId: string;
  name: string;
  status: "active" | "on_hold" | "completed" | "archived";
  dueDate: string | null; // date column returns string
  details: unknown;
  createdAt: Date | null;
  updatedAt: Date | null;
  zoneId: number | null;
};

export type Zone = {
  id: number;
  name: string;
  color: string | null;
  iconName: string | null;
};

export type Goal = {
  id: string;
  userId: string;
  contactId: string | null;
  goalType: "practitioner_business" | "practitioner_personal" | "client_wellness";
  name: string;
  status: "on_track" | "at_risk" | "achieved" | "abandoned";
  targetDate: string | null; // date column returns string
  details: unknown;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type DailyPulseLog = {
  id: string;
  userId: string;
  logDate: string; // date column returns string
  details: unknown;
  createdAt: Date | null;
};

export type InboxItem = {
  id: string;
  userId: string;
  rawText: string;
  status: "unprocessed" | "processed" | "archived";
  createdTaskId: string | null;
  processedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type TaskContactTag = {
  taskId: string;
  contactId: string;
};

// ============================================================================
// LIST ITEM TYPES (what most queries return)
// ============================================================================

export type TaskListItem = Task;
export type ProjectListItem = Project;
export type GoalListItem = Goal;
export type DailyPulseLogListItem = DailyPulseLog;
export type InboxItemListItem = InboxItem;

// ============================================================================
// EXTENDED TYPES (when you explicitly need relations)
// ============================================================================

export type TaskWithProject = Task & {
  project?: {
    id: string;
    name: string;
    status: string;
  } | null;
};

export type TaskWithSubtasks = Task & {
  subtasks?: Task[];
};

// Only use this when you REALLY need the parent task
export type TaskWithParent = Task & {
  parentTask?: Task | null;
};

// Full relations (use sparingly!)
export type TaskWithRelations = Task & {
  project?: {
    id: string;
    name: string;
    status: string;
  } | null;
  parentTask?: Task | null;
  subtasks?: Task[];
};

export type ProjectWithZone = Project & {
  zone?: Zone | null;
};

// ============================================================================
// INPUT TYPES (for create/update)
// ============================================================================

export type CreateTask = Omit<Task, "id" | "createdAt" | "updatedAt">;
export type UpdateTask = Partial<CreateTask>;

export type CreateProject = Omit<Project, "id" | "createdAt" | "updatedAt">;
export type UpdateProject = Partial<CreateProject>;

export type CreateGoal = Omit<Goal, "id" | "createdAt" | "updatedAt">;
export type UpdateGoal = Partial<CreateGoal>;

export type CreateDailyPulseLog = Omit<DailyPulseLog, "id" | "createdAt">;
export type UpdateDailyPulseLog = Partial<CreateDailyPulseLog>;

export type CreateInboxItem = Omit<InboxItem, "id" | "createdAt" | "updatedAt">;
export type UpdateInboxItem = Partial<CreateInboxItem>;
