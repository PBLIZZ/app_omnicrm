/**
 * Goals & Habits Tools
 *
 * AI-callable tools for goal tracking, habit logging, streak calculation,
 * and wellness analytics. Implements comprehensive goal and habit management
 * for the wellness CRM.
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import {
  createProductivityRepository,
  createHabitsRepository,
  type ProductivityRepository,
  type HabitsRepository,
} from "@repo";
import type { Goal } from "@/server/db/schema";
import { AppError } from "@/lib/errors/app-error";

// ============================================================================
// TYPE GUARDS
// ============================================================================

interface ProgressHistoryEntry {
  timestamp: string;
  value: number;
  notes?: string | undefined;
}

function isProgressHistoryEntry(obj: unknown): obj is ProgressHistoryEntry {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "timestamp" in obj &&
    typeof obj.timestamp === "string" &&
    "value" in obj &&
    typeof obj.value === "number"
  );
}

function isProgressHistoryArray(arr: unknown): arr is ProgressHistoryEntry[] {
  return Array.isArray(arr) && arr.every((item) => isProgressHistoryEntry(item));
}

function parseGoalDetails(details: unknown): Record<string, unknown> {
  if (typeof details === "object" && details !== null) {
    return details as Record<string, unknown>;
  }
  return {};
}

function getProgressHistory(details: Record<string, unknown>): ProgressHistoryEntry[] {
  const progressHistory = details["progressHistory"];
  if (Array.isArray(progressHistory) && isProgressHistoryArray(progressHistory)) {
    return progressHistory;
  }
  return [];
}

function getCurrentProgress(details: Record<string, unknown>): number {
  const currentProgress = details["currentProgress"];
  return typeof currentProgress === "number" ? currentProgress : 0;
}

// ============================================================================
// GOALS TOOLS
// ============================================================================

// ============================================================================
// TOOL: get_goal
// ============================================================================

const GetGoalParamsSchema = z.object({
  goal_id: z.string().uuid(),
});

type GetGoalParams = z.infer<typeof GetGoalParamsSchema>;

export const getGoalDefinition: ToolDefinition = {
  name: "get_goal",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve complete details for a specific goal by ID. Returns goal information including name, type (business/personal/client wellness), status, target date, and progress details.",
  useCases: [
    "When user asks 'show me details for my weight loss goal'",
    "When reviewing progress on a specific goal",
    "When preparing goal review session",
    "When checking goal status before updating",
  ],
  exampleCalls: [
    'get_goal({"goal_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'When user says: "What\'s the status of my Q1 revenue goal?"',
  ],
  parameters: {
    type: "object",
    properties: {
      goal_id: {
        type: "string",
        description: "UUID of the goal to retrieve",
      },
    },
    required: ["goal_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300, // 5 minutes
  deprecated: false,
  tags: ["goals", "read", "productivity", "wellness"],
};

export const getGoalHandler: ToolHandler<GetGoalParams> = async (
  params,
  context,
): Promise<Goal> => {
  const validated = GetGoalParamsSchema.parse(params);
  const db = await getDb();
  const repo: ProductivityRepository = createProductivityRepository(db);

  const goal = await repo.getGoal(validated.goal_id, context.userId);

  if (!goal) {
    throw new AppError(
      `Goal with ID ${validated.goal_id} not found`,
      "GOAL_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  return goal;
};

// ============================================================================
// TOOL: list_goals
// ============================================================================

const ListGoalsParamsSchema = z.object({
  goal_type: z
    .enum(["practitioner_business", "practitioner_personal", "client_wellness"])
    .optional(),
  contact_id: z.string().uuid().optional(),
  status: z.enum(["on_track", "at_risk", "achieved", "abandoned"]).optional(),
});

type ListGoalsParams = z.infer<typeof ListGoalsParamsSchema>;

interface ListGoalsResult {
  goals: Goal[];
  count: number;
  filters: ListGoalsParams;
}

export const listGoalsDefinition: ToolDefinition = {
  name: "list_goals",
  category: "data_access",
  version: "1.0.0",
  description:
    "List goals with optional filtering by type, contact, or status. Returns all matching goals ordered by most recently updated. Supports business goals, personal goals, and client wellness goals.",
  useCases: [
    "When user asks 'show me all my business goals'",
    "When user wants to 'list Sarah\\'s wellness goals'",
    "When reviewing goals at risk",
    "When preparing quarterly goal review",
  ],
  exampleCalls: [
    'list_goals({"goal_type": "practitioner_business"})',
    'list_goals({"status": "at_risk"})',
    'list_goals({"contact_id": "123...", "goal_type": "client_wellness"})',
  ],
  parameters: {
    type: "object",
    properties: {
      goal_type: {
        type: "string",
        description: "Filter by goal type",
        enum: ["practitioner_business", "practitioner_personal", "client_wellness"],
      },
      contact_id: {
        type: "string",
        description: "Filter by related contact UUID (for client wellness goals)",
      },
      status: {
        type: "string",
        description: "Filter by goal status",
        enum: ["on_track", "at_risk", "achieved", "abandoned"],
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60,
  deprecated: false,
  tags: ["goals", "list", "read", "productivity"],
};

export const listGoalsHandler: ToolHandler<ListGoalsParams> = async (
  params,
  context,
): Promise<ListGoalsResult> => {
  const validated = ListGoalsParamsSchema.parse(params);
  const db = await getDb();
  const repo: ProductivityRepository = createProductivityRepository(db);

  const filters: {
    contactId?: string;
    goalType?: string[];
    status?: string[];
  } = {};

  if (validated.contact_id) {
    filters.contactId = validated.contact_id;
  }

  if (validated.goal_type) {
    filters.goalType = [validated.goal_type];
  }

  if (validated.status) {
    filters.status = [validated.status];
  }

  const goals = await repo.getGoals(context.userId, filters);

  return {
    goals,
    count: goals.length,
    filters: validated,
  };
};

// ============================================================================
// TOOL: update_goal_progress
// ============================================================================

const UpdateGoalProgressParamsSchema = z.object({
  goal_id: z.string().uuid(),
  progress_value: z.number().min(0).max(100),
  notes: z.string().optional(),
});

type UpdateGoalProgressParams = z.infer<typeof UpdateGoalProgressParamsSchema>;

export const updateGoalProgressDefinition: ToolDefinition = {
  name: "update_goal_progress",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Update progress on a goal with a percentage value (0-100) and optional notes. Records progress value in goal details and updates the goal timestamp.",
  useCases: [
    "When user says 'mark my revenue goal at 75% complete'",
    "When user reports 'I\\'m halfway to my weight loss goal'",
    "When tracking incremental progress on long-term goals",
    "When client reports wellness goal progress",
  ],
  exampleCalls: [
    'update_goal_progress({"goal_id": "123...", "progress_value": 75})',
    'update_goal_progress({"goal_id": "123...", "progress_value": 50, "notes": "Hit milestone - feeling great!"})',
  ],
  parameters: {
    type: "object",
    properties: {
      goal_id: {
        type: "string",
        description: "UUID of goal to update",
      },
      progress_value: {
        type: "number",
        description: "Progress percentage (0-100)",
      },
      notes: {
        type: "string",
        description: "Optional notes about progress update",
      },
    },
    required: ["goal_id", "progress_value"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  tags: ["goals", "update", "write", "progress"],
};

export const updateGoalProgressHandler: ToolHandler<UpdateGoalProgressParams> = async (
  params,
  context,
): Promise<Goal> => {
  const validated = UpdateGoalProgressParamsSchema.parse(params);
  const db = await getDb();
  const repo: ProductivityRepository = createProductivityRepository(db);

  // Get existing goal
  const existingGoal = await repo.getGoal(validated.goal_id, context.userId);

  if (!existingGoal) {
    throw new AppError(
      `Goal with ID ${validated.goal_id} not found`,
      "GOAL_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Parse existing details
  const existingDetails = parseGoalDetails(existingGoal.details);

  // Create progress log entry
  const progressLog: ProgressHistoryEntry = {
    timestamp: new Date().toISOString(),
    value: validated.progress_value,
    ...(validated.notes !== undefined && { notes: validated.notes }),
  };

  // Get existing progress history or create new array
  const progressHistory = getProgressHistory(existingDetails);

  // Update goal details with new progress
  const updatedDetails = {
    ...existingDetails,
    currentProgress: validated.progress_value,
    lastProgressUpdate: new Date().toISOString(),
    progressHistory: [...progressHistory, progressLog],
  };

  // Update goal
  await repo.updateGoal(validated.goal_id, context.userId, {
    details: updatedDetails,
  });

  // Return updated goal
  const updatedGoal = await repo.getGoal(validated.goal_id, context.userId);

  if (!updatedGoal) {
    throw new AppError(
      "Goal not found after update",
      "GOAL_UPDATE_FAILED",
      "database",
      false,
      500,
    );
  }

  return updatedGoal;
};

// ============================================================================
// TOOL: analyze_goal_progress
// ============================================================================

const AnalyzeGoalProgressParamsSchema = z.object({
  goal_id: z.string().uuid(),
});

type AnalyzeGoalProgressParams = z.infer<typeof AnalyzeGoalProgressParamsSchema>;

interface GoalAnalysisResult {
  goalId: string;
  goalName: string;
  goalType: string;
  currentProgress: number;
  status: string;
  targetDate: string | null;
  analysis: {
    trajectory: "ahead" | "on_track" | "at_risk" | "behind";
    trajectoryReason: string;
    trend: "improving" | "stable" | "declining" | "insufficient_data";
    metrics: {
      daysElapsed: number;
      daysRemaining: number | null;
      progressRate: number;
      projectedCompletion: string | null;
    };
    insights: string[];
  };
  progressHistory: ProgressHistoryEntry[];
}

export const analyzeGoalProgressDefinition: ToolDefinition = {
  name: "analyze_goal_progress",
  category: "analytics",
  version: "1.0.0",
  description:
    "Analyze goal progress trajectory and provide insights. Calculates progress rate, time remaining, projected completion date, and identifies if goal is on track, at risk, or ahead of schedule.",
  useCases: [
    "When user asks 'am I on track to hit my Q1 revenue goal?'",
    "When user wants to 'analyze progress on weight loss goal'",
    "When preparing goal review meeting",
    "When identifying goals that need attention",
  ],
  exampleCalls: [
    'analyze_goal_progress({"goal_id": "123..."})',
    'When user says: "How am I doing on my meditation goal?"',
  ],
  parameters: {
    type: "object",
    properties: {
      goal_id: {
        type: "string",
        description: "UUID of goal to analyze",
      },
    },
    required: ["goal_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300, // 5 minutes
  deprecated: false,
  tags: ["goals", "analytics", "read", "insights"],
};

export const analyzeGoalProgressHandler: ToolHandler<AnalyzeGoalProgressParams> = async (
  params,
  context,
): Promise<GoalAnalysisResult> => {
  const validated = AnalyzeGoalProgressParamsSchema.parse(params);
  const db = await getDb();
  const repo: ProductivityRepository = createProductivityRepository(db);

  const goal = await repo.getGoal(validated.goal_id, context.userId);

  if (!goal) {
    throw new AppError(
      `Goal with ID ${validated.goal_id} not found`,
      "GOAL_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Parse goal details
  const details = parseGoalDetails(goal.details);

  const currentProgress = getCurrentProgress(details);
  const progressHistory = getProgressHistory(details);

  // Calculate time-based metrics
  const now = new Date();
  const created = goal.createdAt ? new Date(goal.createdAt) : now;
  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;

  const daysElapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = targetDate
    ? Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate progress rate (progress per day)
  const progressRate = daysElapsed > 0 ? currentProgress / daysElapsed : 0;

  // Calculate projected completion date
  const remainingProgress = 100 - currentProgress;
  const daysToComplete = progressRate > 0 ? remainingProgress / progressRate : null;
  const projectedCompletion =
    daysToComplete !== null
      ? new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000).toISOString().split("T")[0] ??
        null
      : null;

  // Determine trajectory
  let trajectory: "ahead" | "on_track" | "at_risk" | "behind" = "on_track";
  let trajectoryReason = "";

  if (targetDate && daysRemaining !== null) {
    const requiredRate = daysRemaining > 0 ? remainingProgress / daysRemaining : Infinity;

    if (currentProgress >= 100) {
      trajectory = "ahead";
      trajectoryReason = "Goal already achieved!";
    } else if (daysRemaining < 0) {
      trajectory = "behind";
      trajectoryReason = "Target date has passed";
    } else if (progressRate >= requiredRate * 1.2) {
      trajectory = "ahead";
      trajectoryReason = "Progress rate exceeds required rate by 20%+";
    } else if (progressRate < requiredRate * 0.8) {
      trajectory = "at_risk";
      trajectoryReason = "Progress rate is below required rate by 20%+";
    } else if (progressRate < requiredRate) {
      trajectory = "at_risk";
      trajectoryReason = "Progress rate is slightly below required rate";
    } else {
      trajectory = "on_track";
      trajectoryReason = "Progress rate matches required rate";
    }
  } else if (currentProgress >= 100) {
    trajectory = "ahead";
    trajectoryReason = "Goal already achieved!";
  } else if (progressRate > 0) {
    trajectory = "on_track";
    trajectoryReason = "Making consistent progress";
  } else {
    trajectory = "at_risk";
    trajectoryReason = "No progress recorded yet";
  }

  // Calculate trend from progress history
  let trend: "improving" | "stable" | "declining" | "insufficient_data" = "insufficient_data";

  if (progressHistory.length >= 3) {
    const recent = progressHistory.slice(-3);
    const older = progressHistory.slice(-6, -3);

    if (older.length > 0) {
      const recentAvg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
      const olderAvg = older.reduce((sum, p) => sum + p.value, 0) / older.length;

      if (recentAvg > olderAvg * 1.1) {
        trend = "improving";
      } else if (recentAvg < olderAvg * 0.9) {
        trend = "declining";
      } else {
        trend = "stable";
      }
    }
  }

  return {
    goalId: goal.id,
    goalName: goal.name,
    goalType: goal.goalType,
    currentProgress,
    status: goal.status,
    targetDate: goal.targetDate,
    analysis: {
      trajectory,
      trajectoryReason,
      trend,
      metrics: {
        daysElapsed,
        daysRemaining,
        progressRate: Math.round(progressRate * 100) / 100,
        projectedCompletion,
      },
      insights: [
        currentProgress >= 100
          ? "Goal achieved! Consider setting a new challenge."
          : currentProgress >= 75
            ? "Strong progress - you're in the home stretch!"
            : currentProgress >= 50
              ? "Halfway there! Keep up the momentum."
              : currentProgress >= 25
                ? "Good start - stay focused on your target."
                : "Early stages - establish consistent progress patterns.",
      ],
    },
    progressHistory: progressHistory.slice(-10), // Last 10 updates
  };
};

// ============================================================================
// HABITS TOOLS
// ============================================================================

// ============================================================================
// TOOL: log_habit
// ============================================================================

const LogHabitParamsSchema = z.object({
  habit_id: z.string().uuid(),
  completed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value_completed: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

type LogHabitParams = z.infer<typeof LogHabitParamsSchema>;

interface LogHabitResult {
  completion: {
    id: string;
    userId: string;
    habitId: string;
    completedDate: string;
    valueCompleted: number | null;
    notes: string | null;
    createdAt: Date | null;
  };
  habit: {
    id: string;
    name: string;
    habitType: string;
  };
  message: string;
}

export const logHabitDefinition: ToolDefinition = {
  name: "log_habit",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Log a habit completion for a specific date. Supports boolean habits (completed/not) and value-based habits (count, duration). Creates or updates completion record for the date.",
  useCases: [
    "When user says 'I completed my meditation today'",
    "When user reports 'log 8 glasses of water for today'",
    "When tracking daily habit completion",
    "When backfilling missed habit logs",
  ],
  exampleCalls: [
    'log_habit({"habit_id": "123...", "completed_date": "2025-01-15"})',
    'log_habit({"habit_id": "123...", "completed_date": "2025-01-15", "value_completed": 8, "notes": "Felt great!"})',
  ],
  parameters: {
    type: "object",
    properties: {
      habit_id: {
        type: "string",
        description: "UUID of habit to log",
      },
      completed_date: {
        type: "string",
        description: "Date in YYYY-MM-DD format",
      },
      value_completed: {
        type: "number",
        description: "Value completed (for count/minutes/hours habits)",
      },
      notes: {
        type: "string",
        description: "Optional notes about completion",
      },
    },
    required: ["habit_id", "completed_date"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  rateLimit: {
    maxCalls: 100,
    windowMs: 60000, // 100 logs per minute
  },
  tags: ["habits", "write", "wellness", "tracking"],
};

export const logHabitHandler: ToolHandler<LogHabitParams> = async (
  params,
  context,
): Promise<LogHabitResult> => {
  const validated = LogHabitParamsSchema.parse(params);
  const db = await getDb();
  const repo: HabitsRepository = createHabitsRepository(db);

  // Verify habit exists and belongs to user
  const habit = await repo.getHabit(validated.habit_id, context.userId);

  if (!habit) {
    throw new AppError(
      `Habit with ID ${validated.habit_id} not found`,
      "HABIT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Create or update completion
  const completion = await repo.createHabitCompletion(context.userId, {
    habitId: validated.habit_id,
    completedDate: validated.completed_date,
    valueCompleted: validated.value_completed ?? null,
    notes: validated.notes ?? null,
  });

  return {
    completion,
    habit: {
      id: habit.id,
      name: habit.name,
      habitType: habit.habitType,
    },
    message: `Habit "${habit.name}" logged for ${validated.completed_date}`,
  };
};

// ============================================================================
// TOOL: get_habit_streak
// ============================================================================

const GetHabitStreakParamsSchema = z.object({
  habit_id: z.string().uuid(),
});

type GetHabitStreakParams = z.infer<typeof GetHabitStreakParamsSchema>;

interface HabitStreakResult {
  habitId: string;
  habitName: string;
  streak: {
    current: number;
    longest: number;
    lastCompleted: string | null;
    isActiveToday: boolean;
    milestones: Array<{
      days: number;
      achievedAt: string | null;
    }>;
  };
  encouragement: string;
}

export const getHabitStreakDefinition: ToolDefinition = {
  name: "get_habit_streak",
  category: "data_access",
  version: "1.0.0",
  description:
    "Calculate current streak for a habit based on consecutive daily completions. Returns current streak, longest streak ever, last completion date, and milestone achievements (3, 7, 30, 90 days, etc.).",
  useCases: [
    "When user asks 'what\\'s my meditation streak?'",
    "When user wants to 'show my yoga streak'",
    "When tracking consistency on daily habits",
    "When celebrating milestone achievements",
  ],
  exampleCalls: [
    'get_habit_streak({"habit_id": "123..."})',
    'When user says: "How many days in a row have I meditated?"',
  ],
  parameters: {
    type: "object",
    properties: {
      habit_id: {
        type: "string",
        description: "UUID of habit to calculate streak for",
      },
    },
    required: ["habit_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300, // 5 minutes
  deprecated: false,
  tags: ["habits", "read", "streak", "analytics"],
};

export const getHabitStreakHandler: ToolHandler<GetHabitStreakParams> = async (
  params,
  context,
): Promise<HabitStreakResult> => {
  const validated = GetHabitStreakParamsSchema.parse(params);
  const db = await getDb();
  const repo: HabitsRepository = createHabitsRepository(db);

  // Verify habit exists
  const habit = await repo.getHabit(validated.habit_id, context.userId);

  if (!habit) {
    throw new AppError(
      `Habit with ID ${validated.habit_id} not found`,
      "HABIT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Calculate streak
  const streak = await repo.calculateStreak(validated.habit_id, context.userId);

  return {
    habitId: habit.id,
    habitName: habit.name,
    streak: {
      current: streak.currentStreak,
      longest: streak.longestStreak,
      lastCompleted: streak.lastCompletedDate,
      isActiveToday: streak.isActiveToday,
      milestones: streak.milestones,
    },
    encouragement:
      streak.currentStreak === 0
        ? "Start your streak today!"
        : streak.currentStreak >= 30
          ? `Amazing! ${streak.currentStreak} days strong!`
          : streak.currentStreak >= 7
            ? `Great job! You're building consistency!`
            : `Keep going! ${streak.currentStreak} days and counting!`,
  };
};

// ============================================================================
// TOOL: analyze_habit_patterns
// ============================================================================

const AnalyzeHabitPatternsParamsSchema = z.object({
  habit_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

type AnalyzeHabitPatternsParams = z.infer<typeof AnalyzeHabitPatternsParamsSchema>;

interface WeeklyPatternItem {
  dayOfWeek: number;
  dayName: string;
  completionRate: number;
  completions: number;
  opportunities: number;
}

interface HabitPatternsResult {
  habitId: string;
  habitName: string;
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
  patterns: {
    weeklyPattern: WeeklyPatternItem[];
    bestDay: WeeklyPatternItem | undefined;
    worstDay: WeeklyPatternItem | undefined;
  };
  metrics: {
    totalCompletions: number;
    completionRate: number;
    consistency: "high" | "medium" | "low";
  };
  insights: string[];
}

export const analyzeHabitPatternsDefinition: ToolDefinition = {
  name: "analyze_habit_patterns",
  category: "analytics",
  version: "1.0.0",
  description:
    "Analyze habit completion patterns over time. Identifies weekly patterns (best/worst days), completion rate trends, and provides insights about consistency. Defaults to last 90 days if no date range specified.",
  useCases: [
    "When user asks 'what are my meditation patterns?'",
    "When user wants to 'analyze when I complete my habits'",
    "When identifying best times for habit completion",
    "When understanding habit adherence patterns",
  ],
  exampleCalls: [
    'analyze_habit_patterns({"habit_id": "123..."})',
    'analyze_habit_patterns({"habit_id": "123...", "start_date": "2025-01-01", "end_date": "2025-01-31"})',
  ],
  parameters: {
    type: "object",
    properties: {
      habit_id: {
        type: "string",
        description: "UUID of habit to analyze",
      },
      start_date: {
        type: "string",
        description: "Start date in YYYY-MM-DD format (defaults to 90 days ago)",
      },
      end_date: {
        type: "string",
        description: "End date in YYYY-MM-DD format (defaults to today)",
      },
    },
    required: ["habit_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 600, // 10 minutes
  deprecated: false,
  tags: ["habits", "analytics", "patterns", "read"],
};

export const analyzeHabitPatternsHandler: ToolHandler<AnalyzeHabitPatternsParams> = async (
  params,
  context,
): Promise<HabitPatternsResult> => {
  const validated = AnalyzeHabitPatternsParamsSchema.parse(params);
  const db = await getDb();
  const repo: HabitsRepository = createHabitsRepository(db);

  // Verify habit exists
  const habit = await repo.getHabit(validated.habit_id, context.userId);

  if (!habit) {
    throw new AppError(
      `Habit with ID ${validated.habit_id} not found`,
      "HABIT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Set date range (default to last 90 days)
  const endDateString = validated.end_date || new Date().toISOString().split("T")[0];
  const startDateString =
    validated.start_date ||
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  if (!startDateString || !endDateString) {
    throw new AppError("Failed to format dates", "DATE_FORMAT_ERROR", "validation", true, 400);
  }

  // Get completions in range
  const completions = await repo.getHabitCompletions(context.userId, {
    habitId: validated.habit_id,
    startDate: startDateString,
    endDate: endDateString,
  });

  // Calculate day of week patterns
  const dayOfWeekCounts: Record<number, { completed: number; total: number }> = {};
  for (let i = 0; i < 7; i++) {
    dayOfWeekCounts[i] = { completed: 0, total: 0 };
  }

  const completionDates = new Set(completions.map((c: { completedDate: string }) => c.completedDate));

  // Iterate through all days in range
  const start = new Date(startDateString);
  const end = new Date(endDateString);
  let current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateString = current.toISOString().split("T")[0];

    if (dateString && dayOfWeekCounts[dayOfWeek]) {
      dayOfWeekCounts[dayOfWeek].total++;
      if (completionDates.has(dateString)) {
        dayOfWeekCounts[dayOfWeek].completed++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  // Calculate patterns
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weeklyPattern: WeeklyPatternItem[] = Object.entries(dayOfWeekCounts).map(([day, counts]) => ({
    dayOfWeek: parseInt(day),
    dayName: dayNames[parseInt(day)] || "Unknown",
    completionRate: counts.total > 0 ? counts.completed / counts.total : 0,
    completions: counts.completed,
    opportunities: counts.total,
  }));

  // Sort to find best/worst days
  const sortedByRate = [...weeklyPattern].sort((a, b) => b.completionRate - a.completionRate);
  const bestDay = sortedByRate[0];
  const worstDay = sortedByRate[sortedByRate.length - 1];

  // Calculate overall completion rate
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const completionRate = totalDays > 0 ? completions.length / totalDays : 0;

  // Identify insights
  const insights: string[] = [];

  if (completionRate >= 0.9) {
    insights.push("Excellent consistency! You're maintaining a very strong habit.");
  } else if (completionRate >= 0.7) {
    insights.push("Good consistency. A few missed days but overall strong adherence.");
  } else if (completionRate >= 0.5) {
    insights.push("Moderate consistency. Consider strategies to improve adherence.");
  } else {
    insights.push("Low consistency. This habit may need more focus or schedule adjustments.");
  }

  if (bestDay && worstDay && bestDay.dayName !== worstDay.dayName) {
    insights.push(
      `You're most consistent on ${bestDay.dayName}s (${Math.round(bestDay.completionRate * 100)}% completion).`,
    );
    insights.push(
      `You struggle most on ${worstDay.dayName}s (${Math.round(worstDay.completionRate * 100)}% completion).`,
    );
  }

  return {
    habitId: habit.id,
    habitName: habit.name,
    dateRange: {
      start: startDateString,
      end: endDateString,
      days: totalDays,
    },
    patterns: {
      weeklyPattern: weeklyPattern.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      bestDay,
      worstDay,
    },
    metrics: {
      totalCompletions: completions.length,
      completionRate: Math.round(completionRate * 100) / 100,
      consistency: completionRate >= 0.8 ? "high" : completionRate >= 0.6 ? "medium" : "low",
    },
    insights,
  };
};

// ============================================================================
// TOOL: get_habit_analytics
// ============================================================================

const GetHabitAnalyticsParamsSchema = z.object({
  habit_id: z.string().uuid(),
  period: z.enum(["week", "month", "year"]).default("month"),
});

type GetHabitAnalyticsParams = z.infer<typeof GetHabitAnalyticsParamsSchema>;

interface HabitAnalyticsResult {
  habitId: string;
  habitName: string;
  habitType: string;
  targetFrequency: string;
  period: "week" | "month" | "year";
  dateRange: {
    start: string;
    end: string;
  };
  stats: {
    totalCompletions: number;
    completionRate: number;
    averageValue: number | null;
    trend: "improving" | "stable" | "declining" | "insufficient_data";
  };
  streak: {
    current: number;
    longest: number;
    isActiveToday: boolean;
    recentMilestones: Array<{
      days: number;
      achievedAt: string | null;
    }>;
  };
  heatmap: Array<{
    date: string;
    value: number;
    completed: boolean;
  }>;
  insights: string[];
}

export const getHabitAnalyticsDefinition: ToolDefinition = {
  name: "get_habit_analytics",
  category: "analytics",
  version: "1.0.0",
  description:
    "Get comprehensive analytics for a habit including completion rate, trends, correlations, and visual heatmap data. Analyzes performance over week, month, or year period with detailed metrics and insights.",
  useCases: [
    "When user asks 'show me my meditation analytics'",
    "When user wants to 'analyze my habit performance this month'",
    "When preparing wellness review",
    "When tracking long-term habit adherence",
  ],
  exampleCalls: [
    'get_habit_analytics({"habit_id": "123...", "period": "month"})',
    'get_habit_analytics({"habit_id": "123...", "period": "year"})',
  ],
  parameters: {
    type: "object",
    properties: {
      habit_id: {
        type: "string",
        description: "UUID of habit to analyze",
      },
      period: {
        type: "string",
        description: "Analysis period (default: month)",
        enum: ["week", "month", "year"],
      },
    },
    required: ["habit_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 600, // 10 minutes
  deprecated: false,
  tags: ["habits", "analytics", "read", "insights"],
};

export const getHabitAnalyticsHandler: ToolHandler<GetHabitAnalyticsParams> = async (
  params,
  context,
): Promise<HabitAnalyticsResult> => {
  const validated = GetHabitAnalyticsParamsSchema.parse(params);
  const db = await getDb();
  const repo: HabitsRepository = createHabitsRepository(db);

  // Verify habit exists
  const habit = await repo.getHabit(validated.habit_id, context.userId);

  if (!habit) {
    throw new AppError(
      `Habit with ID ${validated.habit_id} not found`,
      "HABIT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Calculate date range based on period
  const endDate = new Date();
  const startDate = new Date();

  switch (validated.period) {
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "year":
      startDate.setDate(startDate.getDate() - 365);
      break;
  }

  const startDateString = startDate.toISOString().split("T")[0];
  const endDateString = endDate.toISOString().split("T")[0];

  if (!startDateString || !endDateString) {
    throw new AppError("Failed to format dates", "DATE_FORMAT_ERROR", "validation", true, 400);
  }

  // Get habit stats
  const stats = await repo.getHabitStats(
    validated.habit_id,
    context.userId,
    startDateString,
    endDateString,
  );

  // Get heatmap data
  const heatmapDays = validated.period === "week" ? 7 : validated.period === "month" ? 30 : 90;
  const heatmap = await repo.getHabitHeatmap(validated.habit_id, context.userId, heatmapDays);

  // Get streak
  const streak = await repo.calculateStreak(validated.habit_id, context.userId);

  return {
    habitId: habit.id,
    habitName: habit.name,
    habitType: habit.habitType,
    targetFrequency: habit.targetFrequency,
    period: validated.period,
    dateRange: {
      start: startDateString,
      end: endDateString,
    },
    stats: {
      totalCompletions: stats.totalCompletions,
      completionRate: Math.round(stats.completionRate * 100),
      averageValue: stats.averageValue,
      trend: stats.trend,
    },
    streak: {
      current: streak.currentStreak,
      longest: streak.longestStreak,
      isActiveToday: streak.isActiveToday,
      recentMilestones: streak.milestones
        .filter((m: { achievedAt: string | null }) => m.achievedAt !== null)
        .slice(-3),
    },
    heatmap: heatmap.slice(-heatmapDays),
    insights: [
      stats.completionRate >= 0.9
        ? "Outstanding consistency - you've mastered this habit!"
        : stats.completionRate >= 0.7
          ? "Strong performance - keep up the good work!"
          : stats.completionRate >= 0.5
            ? "Moderate adherence - consider what might help you stay more consistent."
            : "Room for improvement - small steps can lead to big changes.",
      stats.trend === "improving"
        ? "Trending up - you're building momentum!"
        : stats.trend === "declining"
          ? "Trending down - let's identify what changed."
          : stats.trend === "stable"
            ? "Stable performance - consistency is key."
            : "Still collecting data for trend analysis.",
      streak.currentStreak >= 7
        ? `You're on a ${streak.currentStreak}-day streak - don't break it now!`
        : streak.currentStreak > 0
          ? `${streak.currentStreak}-day streak - keep it going!`
          : "Start a new streak today!",
    ],
  };
};
