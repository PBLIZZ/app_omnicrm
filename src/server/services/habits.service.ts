/**
 * Habits Service
 *
 * Business logic for habit tracking with streak calculation and analytics.
 * Follows functional service pattern with getDb() and AppError wrapping.
 */

import { getDb } from "@/server/db/client";
import { createHabitsRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";
import type { UpdateHabitInput } from "@/server/db/business-schemas/productivity";
import type {
  Habit,
  HabitCompletion,
  HabitStreak,
  HabitAnalytics,
  HabitsSummary,
  UpdateHabit,
  CreateHabitCompletion,
  HabitFilters,
  HabitCompletionFilters,
} from "@repo";

// ============================================================================
// HABITS CRUD
// ============================================================================

/**
 * Create a new habit
 */
export async function createHabitService(
  userId: string,
  data: {
    name: string;
    description?: string | undefined;
    targetFrequency?: "daily" | "weekly" | "monthly" | undefined;
    color?: string | undefined;
    iconName?: string | undefined;
    isActive?: boolean | undefined;
  },
): Promise<Habit> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    return await repo.createHabit(userId, data);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create habit",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Get habits for a user
 */
export async function getHabitsService(
  userId: string,
  filters?: HabitFilters,
): Promise<Habit[]> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    return await repo.getHabits(userId, filters);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get habits",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Get a single habit by ID
 */
export async function getHabitService(
  userId: string,
  habitId: string,
): Promise<Habit> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    const habit = await repo.getHabit(habitId, userId);

    if (!habit) {
      throw new AppError(
        "Habit not found",
        "NOT_FOUND",
        "validation",
        false,
        404,
      );
    }

    return habit;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get habit",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Update an existing habit
 */
export async function updateHabitService(
  userId: string,
  habitId: string,
  data: UpdateHabitInput,
): Promise<Habit> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    // Convert Zod input to database type
    const updateData: UpdateHabit = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.targetFrequency !== undefined) updateData.targetFrequency = data.targetFrequency;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.iconName !== undefined) updateData.iconName = data.iconName;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await repo.updateHabit(habitId, userId, updateData);

    if (!updated) {
      throw new AppError(
        "Habit not found",
        "NOT_FOUND",
        "validation",
        false,
        404,
      );
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update habit",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Delete a habit
 */
export async function deleteHabitService(
  userId: string,
  habitId: string,
): Promise<void> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    // Verify habit exists
    const existing = await repo.getHabit(habitId, userId);
    if (!existing) {
      throw new AppError(
        "Habit not found",
        "NOT_FOUND",
        "validation",
        false,
        404,
      );
    }

    await repo.deleteHabit(habitId, userId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete habit",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

// ============================================================================
// HABIT COMPLETIONS
// ============================================================================

/**
 * Create a habit completion
 */
export async function createHabitCompletionService(
  userId: string,
  data: Omit<CreateHabitCompletion, "userId">,
): Promise<HabitCompletion> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    // Verify habit exists and belongs to user
    const habit = await repo.getHabit(data.habitId, userId);
    if (!habit) {
      throw new AppError(
        "Habit not found",
        "NOT_FOUND",
        "validation",
        false,
        404,
      );
    }

    return await repo.createHabitCompletion(userId, data);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create habit completion",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Get habit completions
 */
export async function getHabitCompletionsService(
  userId: string,
  filters: HabitCompletionFilters,
): Promise<HabitCompletion[]> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    // If habitId provided, verify it exists and belongs to user
    if (filters.habitId) {
      const habit = await repo.getHabit(filters.habitId, userId);
      if (!habit) {
        throw new AppError(
          "Habit not found",
          "NOT_FOUND",
          "validation",
          false,
          404,
        );
      }
    }

    return await repo.getHabitCompletions(userId, filters);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get habit completions",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Delete a habit completion
 */
export async function deleteHabitCompletionService(
  userId: string,
  completionId: string,
): Promise<void> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    await repo.deleteHabitCompletion(completionId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete habit completion",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

// ============================================================================
// STREAK CALCULATION
// ============================================================================

/**
 * Get streak information for a habit
 */
export async function getHabitStreakService(
  userId: string,
  habitId: string,
): Promise<HabitStreak> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    // Verify habit exists
    const habit = await repo.getHabit(habitId, userId);
    if (!habit) {
      throw new AppError(
        "Habit not found",
        "NOT_FOUND",
        "validation",
        false,
        404,
      );
    }

    return await repo.calculateStreak(habitId, userId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to calculate streak",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get full analytics for a habit
 */
export async function getHabitAnalyticsService(
  userId: string,
  habitId: string,
  days: number = 90,
): Promise<HabitAnalytics> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    // Verify habit exists
    const habit = await repo.getHabit(habitId, userId);
    if (!habit) {
      throw new AppError(
        "Habit not found",
        "NOT_FOUND",
        "validation",
        false,
        404,
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateString = startDate.toISOString().split("T")[0];
    const endDateString = endDate.toISOString().split("T")[0];

    if (!startDateString || !endDateString) {
      throw new AppError(
        "Failed to format date range",
        "INTERNAL_ERROR",
        "database",
        false,
        500,
      );
    }

    // Gather all analytics data
    const [stats, heatmap, completions] = await Promise.all([
      repo.getHabitStats(habitId, userId, startDateString, endDateString),
      repo.getHabitHeatmap(habitId, userId, days),
      repo.getHabitCompletions(userId, {
        habitId,
        startDate: startDateString,
        endDate: endDateString
      }),
    ]);

    // Calculate weekly pattern (day of week completion rates)
    const weeklyPattern = calculateWeeklyPattern(completions);

    // Calculate best time of day (if time-based habit)
    const bestTimeOfDay = calculateBestTimeOfDay();

    return {
      habitId,
      stats,
      heatmap,
      weeklyPattern,
      bestTimeOfDay,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get habit analytics",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Get summary statistics across all habits for a user
 */
export async function getHabitsSummaryService(
  userId: string,
): Promise<HabitsSummary> {
  const db = await getDb();
  const repo = createHabitsRepository(db);

  try {
    return await repo.getHabitsSummary(userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get habits summary",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateWeeklyPattern(
  completions: HabitCompletion[]
): Array<{ dayOfWeek: number; completionRate: number }> {
  const dayCountsCompleted = new Array(7).fill(0) as number[];
  const dayCountsTotal = new Array(7).fill(0) as number[];

  // Count completions by day of week
  for (const completion of completions) {
    const date = new Date(completion.completedDate);
    const dayOfWeek = date.getDay(); // 0-6 (Sunday-Saturday)
    const currentCount = dayCountsCompleted[dayOfWeek];
    if (currentCount !== undefined) {
      dayCountsCompleted[dayOfWeek] = currentCount + 1;
    }
  }

  // Calculate total occurrences of each day in the period
  // (simplified: assume equal distribution)
  const totalWeeks = Math.floor(completions.length / 7) || 1;
  for (let i = 0; i < 7; i++) {
    dayCountsTotal[i] = totalWeeks;
  }

  return dayCountsCompleted.map((completed, dayOfWeek) => {
    const total = dayCountsTotal[dayOfWeek] ?? 1;
    return {
      dayOfWeek,
      completionRate: total > 0 ? completed / total : 0,
    };
  });
}

function calculateBestTimeOfDay(): string | null {
  // Future enhancement: Parse completion values to extract time information
  // Would analyze notes JSON to determine optimal completion time
  return null;
}
