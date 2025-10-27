/**
 * Habit Types
 *
 * Type definitions for habit tracking with enhanced features:
 * - Different habit types (boolean, duration, count, time)
 * - Streak calculation
 * - Analytics and completion rates
 *
 * Note: Base types (Habit, HabitCompletion, CreateHabit, etc.) are imported
 * from @/server/db/schema which is the single source of truth.
 */

import type {
  Habit,
  HabitCompletion,
  CreateHabit,
  UpdateHabit,
  CreateHabitCompletion,
  UpdateHabitCompletion,
} from "@/server/db/schema";

// Re-export base types for convenience
export type {
  Habit,
  HabitCompletion,
  CreateHabit,
  UpdateHabit,
  CreateHabitCompletion,
  UpdateHabitCompletion,
};

// ============================================================================
// HABIT DETAILS JSONB STRUCTURE
// ============================================================================

/**
 * Habit Types - stored in habit.details.type
 */
export type HabitType = "boolean" | "duration" | "count" | "time";

/**
 * Habit Details Schema - stored in habit.details jsonb field
 */
export type HabitDetails = {
  type?: HabitType;
  // For duration type: minutes, hours
  durationUnit?: "minutes" | "hours";
  // For count type: target count
  targetCount?: number;
  countUnit?: string; // e.g., "reps", "sessions", "glasses"
  // For time type: target time of day
  targetTime?: string; // HH:MM format
  // Additional metadata
  reminder?: boolean;
  reminderTime?: string; // HH:MM format
  notes?: string;
};

/**
 * Completion Value - stored in habit_completions.notes as structured data
 * For backward compatibility, we store as JSON string in notes field
 */
export type CompletionValue = {
  type: HabitType;
  // For boolean: true/false (default)
  completed?: boolean;
  // For duration: number of minutes/hours
  duration?: number;
  durationUnit?: "minutes" | "hours";
  // For count: number achieved
  count?: number;
  countUnit?: string;
  // For time: actual time completed
  time?: string; // HH:MM format
  // User notes (plain text)
  notes?: string;
};

// ============================================================================
// EXTENDED TYPES
// ============================================================================

/**
 * Habit with parsed details
 */
export type HabitWithDetails = Habit & {
  details: HabitDetails;
};

/**
 * Habit completion with parsed value
 */
export type HabitCompletionWithValue = HabitCompletion & {
  value: CompletionValue;
};

/**
 * Streak information for a habit
 */
export type HabitStreak = {
  habitId: string;
  currentStreak: number; // consecutive days
  longestStreak: number; // all-time best
  lastCompletedDate: string | null; // YYYY-MM-DD
  isActiveToday: boolean;
  milestones: Array<{
    days: number;
    achievedAt: string | null; // YYYY-MM-DD or null if not achieved
  }>;
};

/**
 * Habit with completions and streak info
 */
export type HabitWithCompletions = Habit & {
  details: HabitDetails;
  completions: HabitCompletionWithValue[];
  streak: HabitStreak;
};

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Habit completion statistics
 */
export type HabitStats = {
  habitId: string;
  totalCompletions: number;
  completionRate: number; // 0-1 (percentage)
  averageValue: number | null; // for duration/count types
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  trend: "improving" | "stable" | "declining" | "insufficient_data";
};

/**
 * Calendar heatmap data point
 */
export type HabitHeatmapDataPoint = {
  date: string; // YYYY-MM-DD
  value: number; // completion count or value
  completed: boolean;
};

/**
 * Habit analytics response
 */
export type HabitAnalytics = {
  habitId: string;
  stats: HabitStats;
  heatmap: HabitHeatmapDataPoint[]; // 90 days
  weeklyPattern: Array<{
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    completionRate: number;
  }>;
  bestTimeOfDay: string | null; // HH:00 format
};

/**
 * Overall habits summary
 */
export type HabitsSummary = {
  totalHabits: number;
  activeHabits: number;
  completedToday: number;
  completionRate: number; // overall completion rate
  totalStreakDays: number; // sum of all current streaks
  longestActiveStreak: number;
  trends: {
    weekOverWeek: number; // percentage change
    monthOverMonth: number; // percentage change
  };
};

// ============================================================================
// QUERY FILTER TYPES
// ============================================================================

export type HabitFilters = {
  isActive?: boolean;
  targetFrequency?: string[]; // "daily" | "weekly" | "monthly" validated at API layer
  habitType?: HabitType[];
  hasCompletionsAfter?: Date;
  hasCompletionsBefore?: Date;
};

export type HabitCompletionFilters = {
  habitId?: string | undefined;
  startDate?: string | undefined; // YYYY-MM-DD
  endDate?: string | undefined; // YYYY-MM-DD
  limit?: number | undefined;
};

// ============================================================================
// STREAK MILESTONES CONSTANTS
// ============================================================================

export const STREAK_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 60, 90, 180, 365] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];
