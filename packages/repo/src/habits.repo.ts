/**
 * Habits Repository
 *
 * Repository layer for habit tracking with streak calculation and analytics.
 * Uses constructor injection pattern with DbClient.
 */

import type { DbClient } from "@/server/db/client";
import {
  habits,
  habitCompletions,
  type Habit,
  type HabitCompletion,
  type CreateHabit,
  type UpdateHabit,
  type CreateHabitCompletion,
} from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql, between } from "drizzle-orm";
import {
  STREAK_MILESTONES,
  type HabitFilters,
  type HabitCompletionFilters,
  type HabitStreak,
  type HabitStats,
  type HabitHeatmapDataPoint,
  type HabitsSummary,
} from "./types/habits.types";

export class HabitsRepository {
  constructor(private readonly db: DbClient) {}

  // ============================================================================
  // HABITS CRUD
  // ============================================================================

  async createHabit(userId: string, data: Omit<CreateHabit, "userId">): Promise<Habit> {
    const [habit] = await this.db
      .insert(habits)
      .values({
        userId,
        name: data.name,
        description: data.description ?? null,
        targetFrequency: data.targetFrequency ?? "daily",
        color: data.color ?? "#10B981",
        iconName: data.iconName ?? "check-circle",
        isActive: data.isActive ?? true,
      })
      .returning();

    if (!habit) {
      throw new Error("Insert returned no data");
    }

    return habit;
  }

  async getHabits(userId: string, filters?: HabitFilters): Promise<Habit[]> {
    const whereConditions = [eq(habits.userId, userId)];

    if (filters?.isActive !== undefined) {
      whereConditions.push(eq(habits.isActive, filters.isActive));
    }

    if (filters?.targetFrequency && filters.targetFrequency.length > 0) {
      whereConditions.push(
        sql`${habits.targetFrequency} = ANY(${sql.raw(
          `ARRAY[${filters.targetFrequency.map((f) => `'${f}'`).join(",")}]::text[]`,
        )})`,
      );
    }

    const rows = await this.db
      .select()
      .from(habits)
      .where(and(...whereConditions))
      .orderBy(desc(habits.updatedAt));

    return rows;
  }

  async getHabit(habitId: string, userId: string): Promise<Habit | null> {
    const rows = await this.db
      .select()
      .from(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
      .limit(1);

    return rows[0] ?? null;
  }

  async updateHabit(habitId: string, userId: string, data: UpdateHabit): Promise<Habit | null> {
    const [updated] = await this.db
      .update(habits)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
      .returning();

    return updated ?? null;
  }

  async deleteHabit(habitId: string, userId: string): Promise<void> {
    // Cascade delete is handled by DB (onDelete: cascade)
    await this.db.delete(habits).where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  }

  // ============================================================================
  // HABIT COMPLETIONS CRUD
  // ============================================================================

  async createHabitCompletion(
    userId: string,
    data: Omit<CreateHabitCompletion, "userId">,
  ): Promise<HabitCompletion> {
    // Check for existing completion on the same date
    const existing = await this.db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.userId, userId),
          eq(habitCompletions.habitId, data.habitId),
          eq(habitCompletions.completedDate, data.completedDate),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing completion instead of creating duplicate
      const [updated] = await this.db
        .update(habitCompletions)
        .set({
          notes: data.notes ?? existing[0]?.notes ?? null,
        })
        .where(eq(habitCompletions.id, existing[0]!.id))
        .returning();

      if (!updated) {
        throw new Error("Update returned no data");
      }

      return updated;
    }

    const [completion] = await this.db
      .insert(habitCompletions)
      .values({
        userId,
        habitId: data.habitId,
        completedDate: data.completedDate,
        notes: data.notes ?? null,
      })
      .returning();

    if (!completion) {
      throw new Error("Insert returned no data");
    }

    return completion;
  }

  async getHabitCompletions(
    userId: string,
    filters?: HabitCompletionFilters,
  ): Promise<HabitCompletion[]> {
    const whereConditions = [eq(habitCompletions.userId, userId)];

    if (filters?.habitId) {
      whereConditions.push(eq(habitCompletions.habitId, filters.habitId));
    }

    if (filters?.startDate) {
      whereConditions.push(gte(habitCompletions.completedDate, filters.startDate));
    }

    if (filters?.endDate) {
      whereConditions.push(lte(habitCompletions.completedDate, filters.endDate));
    }

    const query = this.db
      .select()
      .from(habitCompletions)
      .where(and(...whereConditions))
      .orderBy(desc(habitCompletions.completedDate));

    if (filters?.limit) {
      query.limit(filters.limit);
    }

    const rows = await query;
    return rows;
  }

  async deleteHabitCompletion(completionId: string, userId: string): Promise<void> {
    await this.db
      .delete(habitCompletions)
      .where(and(eq(habitCompletions.id, completionId), eq(habitCompletions.userId, userId)));
  }

  // ============================================================================
  // STREAK CALCULATION
  // ============================================================================

  /**
   * Calculate current streak for a habit
   * Works backward from today to find consecutive completions
   */
  async calculateStreak(habitId: string, userId: string): Promise<HabitStreak> {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    if (!todayString) {
      throw new Error("Failed to format today's date");
    }

    // Get all completions for this habit, ordered by date descending
    const completions = await this.db
      .select({ completedDate: habitCompletions.completedDate })
      .from(habitCompletions)
      .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.userId, userId)))
      .orderBy(desc(habitCompletions.completedDate));

    if (completions.length === 0) {
      return {
        habitId,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
        isActiveToday: false,
        milestones: [...STREAK_MILESTONES].map((days) => ({
          days,
          achievedAt: null,
        })),
      };
    }

    const completedDates = new Set(completions.map((c) => c.completedDate));
    const lastCompletedDate = completions[0]?.completedDate ?? null;
    const isActiveToday = completedDates.has(todayString);

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date(today);

    // If not completed today, start from yesterday
    if (!isActiveToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const checkDateString = checkDate.toISOString().split("T")[0];
      if (!checkDateString) break;

      if (completedDates.has(checkDateString)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }

      // Safety: Don't go back more than 365 days
      if (currentStreak > 365) break;
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let previousDate: Date | null = null;

    for (const completion of completions) {
      const currentDate = new Date(completion.completedDate);

      if (previousDate === null) {
        tempStreak = 1;
      } else {
        const daysDiff = Math.floor(
          (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }

      previousDate = currentDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate milestone achievements
    const milestones = [...STREAK_MILESTONES].map((days) => {
      // Find the first date where the streak reached this milestone
      let streakCount = 0;
      let achievedAt: string | null = null;
      let prevDate: Date | null = null;

      for (const completion of [...completions].reverse()) {
        const currDate = new Date(completion.completedDate);

        if (prevDate === null) {
          streakCount = 1;
        } else {
          const daysDiff = Math.floor(
            (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysDiff === 1) {
            streakCount++;
          } else {
            streakCount = 1;
          }
        }

        if (streakCount >= days && achievedAt === null) {
          achievedAt = completion.completedDate;
        }

        prevDate = currDate;
      }

      return {
        days,
        achievedAt,
      };
    });

    return {
      habitId,
      currentStreak,
      longestStreak,
      lastCompletedDate,
      isActiveToday,
      milestones,
    };
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get habit statistics for a time period
   */
  async getHabitStats(
    habitId: string,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<HabitStats> {
    const habit = await this.getHabit(habitId, userId);
    if (!habit) {
      throw new Error("Habit not found");
    }

    // Get completions in date range
    const completions = await this.db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.habitId, habitId),
          eq(habitCompletions.userId, userId),
          between(habitCompletions.completedDate, startDate, endDate),
        ),
      );

    const totalCompletions = completions.length;

    // Calculate expected completions based on target frequency
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let expectedCompletions = daysDiff;
    if (habit.targetFrequency === "weekly") {
      expectedCompletions = Math.floor(daysDiff / 7);
    } else if (habit.targetFrequency === "monthly") {
      expectedCompletions = Math.floor(daysDiff / 30);
    }

    const completionRate = expectedCompletions > 0 ? totalCompletions / expectedCompletions : 0;

    // Calculate streak
    const streak = await this.calculateStreak(habitId, userId);

    // Determine trend (simple: compare first half vs second half)
    const midDate = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    const midDateString = midDate.toISOString().split("T")[0];
    if (!midDateString) {
      throw new Error("Failed to format mid date");
    }

    const firstHalf = completions.filter((c) => c.completedDate < midDateString).length;
    const secondHalf = completions.filter((c) => c.completedDate >= midDateString).length;

    let trend: "improving" | "stable" | "declining" | "insufficient_data" = "insufficient_data";
    if (totalCompletions >= 5) {
      if (secondHalf > firstHalf * 1.2) {
        trend = "improving";
      } else if (secondHalf < firstHalf * 0.8) {
        trend = "declining";
      } else {
        trend = "stable";
      }
    }

    return {
      habitId,
      totalCompletions,
      completionRate: Math.min(completionRate, 1), // cap at 100%
      averageValue: null, // TODO: Parse completion values from notes
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedDate: streak.lastCompletedDate,
      trend,
    };
  }

  /**
   * Get heatmap data for calendar visualization
   */
  async getHabitHeatmap(
    habitId: string,
    userId: string,
    days: number = 90,
  ): Promise<HabitHeatmapDataPoint[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateString = startDate.toISOString().split("T")[0];
    const endDateString = endDate.toISOString().split("T")[0];

    if (!startDateString || !endDateString) {
      throw new Error("Failed to format date strings");
    }

    const completions = await this.db
      .select({ completedDate: habitCompletions.completedDate })
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.habitId, habitId),
          eq(habitCompletions.userId, userId),
          between(habitCompletions.completedDate, startDateString, endDateString),
        ),
      );

    const completedDates = new Set(completions.map((c) => c.completedDate));

    // Generate heatmap for all days in range
    const heatmap: HabitHeatmapDataPoint[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateString = current.toISOString().split("T")[0];
      if (!dateString) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      const completed = completedDates.has(dateString);
      heatmap.push({
        date: dateString,
        value: completed ? 1 : 0,
        completed,
      });

      current.setDate(current.getDate() + 1);
    }

    return heatmap;
  }

  /**
   * Get summary statistics across all habits for a user
   */
  async getHabitsSummary(userId: string): Promise<HabitsSummary> {
    const allHabits = await this.getHabits(userId);
    const activeHabits = allHabits.filter((h) => h.isActive);

    const today = new Date().toISOString().split("T")[0];
    if (!today) {
      throw new Error("Failed to format today's date");
    }

    // Get today's completions
    const todayCompletions = await this.db
      .select()
      .from(habitCompletions)
      .where(and(eq(habitCompletions.userId, userId), eq(habitCompletions.completedDate, today)));

    // Calculate overall completion rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split("T")[0];
    if (!thirtyDaysAgoString) {
      throw new Error("Failed to format date");
    }

    const recentCompletions = await this.db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.userId, userId),
          gte(habitCompletions.completedDate, thirtyDaysAgoString),
        ),
      );

    const expectedCompletions = activeHabits.length * 30; // daily habits
    const completionRate =
      expectedCompletions > 0 ? recentCompletions.length / expectedCompletions : 0;

    // Calculate total streaks
    let totalStreakDays = 0;
    let longestActiveStreak = 0;

    for (const habit of activeHabits) {
      const streak = await this.calculateStreak(habit.id, userId);
      totalStreakDays += streak.currentStreak;
      longestActiveStreak = Math.max(longestActiveStreak, streak.currentStreak);
    }

    // Calculate trends (week over week, month over month)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const oneWeekAgoString = oneWeekAgo.toISOString().split("T")[0];
    const twoWeeksAgoString = twoWeeksAgo.toISOString().split("T")[0];

    if (!oneWeekAgoString || !twoWeeksAgoString) {
      throw new Error("Failed to format date strings");
    }

    const lastWeekCompletions = await this.db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.userId, userId),
          between(habitCompletions.completedDate, oneWeekAgoString, today),
        ),
      );

    const previousWeekCompletions = await this.db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.userId, userId),
          between(habitCompletions.completedDate, twoWeeksAgoString, oneWeekAgoString),
        ),
      );

    const weekOverWeek =
      previousWeekCompletions.length > 0
        ? ((lastWeekCompletions.length - previousWeekCompletions.length) /
            previousWeekCompletions.length) *
          100
        : 0;

    // Month over month (simplified: use 30-day periods)
    const monthOverMonth = 0; // TODO: Implement full month calculation

    return {
      totalHabits: allHabits.length,
      activeHabits: activeHabits.length,
      completedToday: todayCompletions.length,
      completionRate: Math.min(completionRate, 1),
      totalStreakDays,
      longestActiveStreak,
      trends: {
        weekOverWeek: Math.round(weekOverWeek),
        monthOverMonth: Math.round(monthOverMonth),
      },
    };
  }
}

export function createHabitsRepository(db: DbClient): HabitsRepository {
  return new HabitsRepository(db);
}
