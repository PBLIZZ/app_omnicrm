/**
 * Explicit Productivity Types
 *
 * NOTE: Subtasks are now stored in details.subtasks JSONB array (not separate task records).
 * This eliminates the circular reference issue and simplifies the architecture.
 *
 * These explicit types maintain type safety and are used across the productivity domain.
 */

// ============================================================================
// BASE TYPES - NO CIRCULAR REFERENCES
// ============================================================================

export type Task = {
  id: string;
  userId: string;
  projectId: string | null;
  zoneUuid: string | null; // Changed from zoneId (number) to zoneUuid (string/UUID)
  name: string;
  status: "todo" | "in_progress" | "done" | "canceled";
  priority: "low" | "medium" | "high"; // Note: "urgent" removed to match database enum
  dueDate: string | null; // date column returns string
  details: unknown;
  completedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
    category: string | null;
  }>;
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
  zoneUuid: string | null; // Changed from zoneId (number) to zoneUuid (string/UUID)
};

export type Zone = {
  uuidId: string; // UUID ID (used for task/project references)
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

// ============================================================================
// PULSE LOG DETAILS JSONB STRUCTURE
// ============================================================================

/**
 * Pulse Details Schema - stored in daily_pulse_logs.details jsonb field
 */
export type PulseDetails = {
  time: number; // 1-5 scale (time availability)
  energy: number; // 1-5 scale (energy level)
  mood: number; // 1-5 scale (mood/wellness)
  notes?: string; // user notes
  tags?: string[]; // optional tags
  // Correlation data (calculated, not user-input)
  tasksCompleted?: number;
  contactsEngaged?: number;
  habitsCompleted?: number;
  // Deep reflection scores (optional, from "Go Deeper" feature)
  reflectionScores?: {
    safety: -3 | -2 | -1 | 0 | 1 | 2 | 3 | null; // -3 to +3 scale: under-active to balanced to over-active
    creativity: -3 | -2 | -1 | 0 | 1 | 2 | 3 | null;
    confidence: -3 | -2 | -1 | 0 | 1 | 2 | 3 | null;
    connection: -3 | -2 | -1 | 0 | 1 | 2 | 3 | null;
    expression: -3 | -2 | -1 | 0 | 1 | 2 | 3 | null;
    clarity: -3 | -2 | -1 | 0 | 1 | 2 | 3 | null;
    purpose: -3 | -2 | -1 | 0 | 1 | 2 | 3 | null;
  };
  reflectionNotes?: string; // Optional freeform insights from reflection
};

/**
 * Pulse log with parsed details
 */
export type DailyPulseLogWithDetails = DailyPulseLog & {
  details: PulseDetails;
};

// ============================================================================
// PULSE ANALYTICS TYPES
// ============================================================================

/**
 * Pulse summary statistics for a time period
 */
export type PulseSummary = {
  period: "week" | "month" | "quarter";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  averages: {
    time: number;
    energy: number;
    mood: number;
  };
  trends: {
    time: "up" | "down" | "stable";
    energy: "up" | "down" | "stable";
    mood: "up" | "down" | "stable";
  };
  bestDay: {
    date: string;
    overallScore: number;
  } | null;
  worstDay: {
    date: string;
    overallScore: number;
  } | null;
  totalLogs: number;
  completionRate: number; // percentage of days logged
};

/**
 * Correlation analysis between pulse and tasks/contacts
 */
export type PulseCorrelation = {
  metric: "tasks" | "contacts" | "habits";
  correlation: number; // -1 to 1 (Pearson correlation)
  significance: "strong" | "moderate" | "weak" | "none";
  insights: string[];
};

/**
 * Time pattern analysis
 */
export type PulseTimePattern = {
  hourOfDay: number; // 0-23
  averageEnergy: number;
  averageMood: number;
  totalLogs: number;
  bestFor: "high_energy_work" | "creative_work" | "social_tasks" | "rest";
};

/**
 * Full pulse analytics response
 */
export type PulseAnalytics = {
  summary: PulseSummary;
  correlations: PulseCorrelation[];
  timePatterns: PulseTimePattern[];
  weeklyHeatmap: Array<{
    date: string;
    overallScore: number;
    time: number;
    energy: number;
    mood: number;
  }>;
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

// NOTE: Subtasks are now stored in details.subtasks JSONB array as lightweight objects
// They are NOT separate Task records anymore
export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
  duration?: string;
};

export type TaskWithSubtasks = Task & {
  subtasks?: Subtask[];
};

// Full relations (use sparingly!)
export type TaskWithRelations = Task & {
  project?: {
    id: string;
    name: string;
    status: string;
  } | null;
  subtasks?: Subtask[];
};

export type ProjectWithZone = Project & {
  zone?: Zone | null;
};

// ============================================================================
// INPUT TYPES (for create/update)
// ============================================================================

export type CreateTask = Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt"> & {
  completedAt?: Date | null; // Optional for create, defaults to null in DB
};
export type UpdateTask = Partial<CreateTask>;

export type CreateProject = Omit<Project, "id" | "createdAt" | "updatedAt">;
export type UpdateProject = Partial<CreateProject>;

export type CreateGoal = Omit<Goal, "id" | "createdAt" | "updatedAt">;
export type UpdateGoal = Partial<CreateGoal>;

export type CreateDailyPulseLog = Omit<DailyPulseLog, "id" | "createdAt">;
export type UpdateDailyPulseLog = Partial<CreateDailyPulseLog>;

export type CreateInboxItem = Omit<InboxItem, "id" | "createdAt" | "updatedAt">;
export type UpdateInboxItem = Partial<CreateInboxItem>;
