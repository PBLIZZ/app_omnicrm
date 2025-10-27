/**
 * Mood & Wellness Tracking Tools
 *
 * AI-callable tools for mood logging, wellness analytics, and habit-mood correlation.
 * Implements tracking and analysis for emotional wellness and daily pulse.
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { createProductivityRepository, createHabitsRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";

// ============================================================================
// TOOL: log_mood
// ============================================================================

const LogMoodParamsSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.string().min(1), // e.g., 'energized', 'happy', 'stressed', 'tired'
  energy_level: z.number().int().min(1).max(10),
  notes: z.string().optional(),
  additional_context: z.record(z.string(), z.unknown()).optional(),
});

type LogMoodParams = z.infer<typeof LogMoodParamsSchema>;

export const logMoodDefinition: ToolDefinition = {
  name: "log_mood",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Log daily mood and energy levels to track emotional wellness over time. Creates or updates a daily pulse log with mood state, energy level, and optional notes.",
  useCases: [
    "When user says 'log my mood as energized and happy today'",
    "When tracking daily emotional state for wellness monitoring",
    "When user wants to 'record how I'm feeling - stressed with energy level 6'",
    "When documenting emotional context for habit analysis",
  ],
  exampleCalls: [
    'log_mood({"log_date": "2025-01-15", "mood": "energized", "energy_level": 8, "notes": "Great morning yoga session"})',
    'log_mood({"log_date": "2025-01-15", "mood": "stressed", "energy_level": 4})',
    'When user says: "I\'m feeling happy and energized today with an 8/10 energy level"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      log_date: {
        type: "string",
        description: "Date for mood log in YYYY-MM-DD format (defaults to today if not provided)",
      },
      mood: {
        type: "string",
        description:
          "Mood state description (e.g., 'energized', 'happy', 'stressed', 'tired', 'anxious', 'calm')",
      },
      energy_level: {
        type: "number",
        description: "Energy level on a scale of 1-10 (1=exhausted, 10=highly energized)",
      },
      notes: {
        type: "string",
        description: "Optional notes about mood context, activities, or observations",
      },
      additional_context: {
        type: "object",
        description: "Optional structured data for mood context (weather, activities, etc.)",
      },
    },
    required: ["log_date", "mood", "energy_level"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true, // Safe to retry - will update existing log for date
  cacheable: false,
  rateLimit: {
    maxCalls: 50,
    windowMs: 60000, // 50 logs per minute
  },
  tags: ["wellness", "mood", "write", "daily-pulse"],
  deprecated: false,
};

export const logMoodHandler: ToolHandler<LogMoodParams> = async (params, context) => {
  const validated = LogMoodParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Check if pulse log exists for this date
    const existingLog = await repo.getDailyPulseLog(context.userId, new Date(validated.log_date));

    if (existingLog) {
      // Update existing log
      const updatedDetails = {
        ...(typeof existingLog.details === "object" && existingLog.details !== null
          ? existingLog.details
          : {}),
        mood: validated.mood,
        energyLevel: validated.energy_level,
        notes: validated.notes,
        additionalContext: validated.additional_context,
        updatedAt: new Date().toISOString(),
      };

      await repo.updateDailyPulseLog(existingLog.id, context.userId, {
        details: updatedDetails,
      });

      return {
        success: true,
        action: "updated",
        logId: existingLog.id,
        logDate: validated.log_date,
        mood: validated.mood,
        energyLevel: validated.energy_level,
      };
    } else {
      // Create new log
      const newLog = await repo.createDailyPulseLog(context.userId, {
        logDate: validated.log_date,
        details: {
          mood: validated.mood,
          energyLevel: validated.energy_level,
          notes: validated.notes,
          additionalContext: validated.additional_context,
          createdAt: new Date().toISOString(),
        },
      });

      return {
        success: true,
        action: "created",
        logId: newLog.id,
        logDate: validated.log_date,
        mood: validated.mood,
        energyLevel: validated.energy_level,
      };
    }
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to log mood",
      "LOG_MOOD_FAILED",
      "database",
      false,
      { operation: "log_mood" },
    );
  }
};

// ============================================================================
// TOOL: get_mood_trends
// ============================================================================

const GetMoodTrendsParamsSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  aggregation: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

type GetMoodTrendsParams = z.infer<typeof GetMoodTrendsParamsSchema>;

interface MoodDataPoint {
  date: string;
  mood: string | null;
  energyLevel: number | null;
}

export const getMoodTrendsDefinition: ToolDefinition = {
  name: "get_mood_trends",
  category: "analytics",
  version: "1.0.0",
  description:
    "Analyze mood and energy trends over a time period. Returns mood patterns, energy level averages, and trend analysis (improving/declining/stable).",
  useCases: [
    "When user asks 'how has my mood been this month?'",
    "When analyzing emotional wellness patterns",
    "When user wants to 'show me my energy trends for the last 2 weeks'",
    "When reviewing emotional health before a session",
  ],
  exampleCalls: [
    'get_mood_trends({"start_date": "2025-01-01", "end_date": "2025-01-31", "aggregation": "weekly"})',
    'get_mood_trends({"start_date": "2024-12-01", "end_date": "2025-01-15"})',
    'When user says: "Analyze my mood for the past month"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      start_date: {
        type: "string",
        description: "Start date for analysis in YYYY-MM-DD format",
      },
      end_date: {
        type: "string",
        description: "End date for analysis in YYYY-MM-DD format",
      },
      aggregation: {
        type: "string",
        description: "How to group the data: 'daily', 'weekly', or 'monthly'",
      },
    },
    required: ["start_date", "end_date"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300, // 5 minutes
  tags: ["wellness", "mood", "analytics", "read"],
  deprecated: false,
};

export const getMoodTrendsHandler: ToolHandler<GetMoodTrendsParams> = async (params, context) => {
  const validated = GetMoodTrendsParamsSchema.parse(params);
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    const logs = await repo.getPulseLogsForAnalytics(
      context.userId,
      validated.start_date,
      validated.end_date,
    );

    if (logs.length === 0) {
      return {
        totalLogs: 0,
        averageEnergyLevel: null,
        moodFrequency: {},
        trend: "insufficient_data",
        energyTrend: "insufficient_data",
        dataPoints: [],
      };
    }

    // Extract mood and energy data
    const dataPoints: MoodDataPoint[] = logs
      .map((log: { logDate: string; details: unknown }): MoodDataPoint => {
        const details =
          typeof log.details === "object" && log.details !== null ? log.details : {};
        const mood = "mood" in details && typeof details.mood === "string" ? details.mood : null;
        const energyLevel =
          "energyLevel" in details && typeof details.energyLevel === "number"
            ? details.energyLevel
            : null;

        return {
          date: log.logDate,
          mood,
          energyLevel,
        };
      })
      .filter((dp: MoodDataPoint): dp is MoodDataPoint => dp.mood !== null || dp.energyLevel !== null);

    // Calculate mood frequency
    const moodFrequency: Record<string, number> = {};
    dataPoints.forEach((dp) => {
      if (dp.mood) {
        moodFrequency[dp.mood] = (moodFrequency[dp.mood] || 0) + 1;
      }
    });

    // Calculate average energy level
    const energyLevels = dataPoints
      .map((dp) => dp.energyLevel)
      .filter((e): e is number => e !== null);
    const averageEnergyLevel =
      energyLevels.length > 0
        ? energyLevels.reduce((sum, e) => sum + e, 0) / energyLevels.length
        : null;

    // Determine energy trend (first half vs second half)
    let energyTrend: "improving" | "stable" | "declining" | "insufficient_data" =
      "insufficient_data";
    if (energyLevels.length >= 4) {
      const midpoint = Math.floor(energyLevels.length / 2);
      const firstHalf = energyLevels.slice(0, midpoint);
      const secondHalf = energyLevels.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, e) => sum + e, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, e) => sum + e, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.1) {
        energyTrend = "improving";
      } else if (secondAvg < firstAvg * 0.9) {
        energyTrend = "declining";
      } else {
        energyTrend = "stable";
      }
    }

    // Determine overall mood trend (based on most common moods)
    const sortedMoods = Object.entries(moodFrequency).sort((a, b) => b[1] - a[1]);
    const mostCommonMood = sortedMoods[0]?.[0] ?? null;

    // Aggregate data if requested
    let aggregatedData = dataPoints;
    if (validated.aggregation === "weekly" || validated.aggregation === "monthly") {
      // Group by week/month and calculate averages
      const groupedData = new Map<string, { energyLevels: number[]; moods: string[] }>();

      dataPoints.forEach((dp) => {
        const date = new Date(dp.date);
        let key: string;

        if (validated.aggregation === "weekly") {
          // Get week number
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0] ?? dp.date;
        } else {
          // Get month
          key = dp.date.substring(0, 7); // YYYY-MM
        }

        if (!groupedData.has(key)) {
          groupedData.set(key, { energyLevels: [], moods: [] });
        }

        const group = groupedData.get(key);
        if (group) {
          if (dp.energyLevel !== null) group.energyLevels.push(dp.energyLevel);
          if (dp.mood !== null) group.moods.push(dp.mood);
        }
      });

      aggregatedData = Array.from(groupedData.entries()).map(([date, data]) => ({
        date,
        mood:
          data.moods.length > 0
            ? data.moods.reduce((acc, m) => {
                const count = data.moods.filter((mood) => mood === m).length;
                return count > (acc.count || 0) ? { mood: m, count } : acc;
              }, {} as { mood: string; count: number }).mood
            : null,
        energyLevel:
          data.energyLevels.length > 0
            ? data.energyLevels.reduce((sum, e) => sum + e, 0) / data.energyLevels.length
            : null,
      }));
    }

    return {
      totalLogs: logs.length,
      averageEnergyLevel: averageEnergyLevel ? Math.round(averageEnergyLevel * 10) / 10 : null,
      moodFrequency,
      mostCommonMood,
      trend: energyTrend,
      energyTrend,
      dataPoints: aggregatedData,
      dateRange: {
        start: validated.start_date,
        end: validated.end_date,
      },
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get mood trends",
      "GET_MOOD_TRENDS_FAILED",
      "database",
      false,
      { operation: "get_mood_trends" },
    );
  }
};

// ============================================================================
// TOOL: correlate_mood_habits
// ============================================================================

const CorrelateMoodHabitsParamsSchema = z.object({
  habit_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type CorrelateMoodHabitsParams = z.infer<typeof CorrelateMoodHabitsParamsSchema>;

interface HabitCorrelation {
  habitId: string;
  habitName: string;
  daysCompleted: number;
  daysTracked: number;
  avgEnergyWithHabit: number | null;
  avgEnergyWithoutHabit: number | null;
  correlation: "positive" | "negative" | "neutral" | "insufficient_data";
  correlationStrength: number;
  insight: string;
}

export const correlateMoodHabitsDefinition: ToolDefinition = {
  name: "correlate_mood_habits",
  category: "analytics",
  version: "1.0.0",
  description:
    "Find correlations between mood/energy levels and habit completions. Analyzes whether specific habits (like yoga, meditation, exercise) correlate with better mood and energy.",
  useCases: [
    "When user asks 'is there a connection between my yoga and mood?'",
    "When analyzing which habits improve emotional wellness",
    "When user wants to 'see if meditation helps my stress levels'",
    "When identifying wellness patterns for better self-care",
  ],
  exampleCalls: [
    'correlate_mood_habits({"habit_id": "123e4567-e89b-12d3-a456-426614174000", "start_date": "2025-01-01", "end_date": "2025-01-31"})',
    'correlate_mood_habits({"start_date": "2024-12-01", "end_date": "2025-01-15"})',
    'When user says: "Does yoga improve my mood?"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      habit_id: {
        type: "string",
        description: "Optional: UUID of specific habit to analyze. If omitted, analyzes all habits",
      },
      start_date: {
        type: "string",
        description: "Start date for analysis in YYYY-MM-DD format",
      },
      end_date: {
        type: "string",
        description: "End date for analysis in YYYY-MM-DD format",
      },
    },
    required: ["start_date", "end_date"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300, // 5 minutes
  tags: ["wellness", "habits", "analytics", "correlation", "read"],
  deprecated: false,
};

export const correlateMoodHabitsHandler: ToolHandler<CorrelateMoodHabitsParams> = async (
  params,
  context,
) => {
  const validated = CorrelateMoodHabitsParamsSchema.parse(params);
  const db = await getDb();
  const productivityRepo = createProductivityRepository(db);
  const habitsRepo = createHabitsRepository(db);

  try {
    // Get mood logs
    const moodLogs = await productivityRepo.getPulseLogsForAnalytics(
      context.userId,
      validated.start_date,
      validated.end_date,
    );

    // Get habits to analyze
    let habitsToAnalyze;
    if (validated.habit_id) {
      const habit = await habitsRepo.getHabit(validated.habit_id, context.userId);
      if (!habit) {
        throw new AppError(
          "Habit not found",
          "HABIT_NOT_FOUND",
          "database",
          true,
          { habitId: validated.habit_id },
        );
      }
      habitsToAnalyze = [habit];
    } else {
      habitsToAnalyze = await habitsRepo.getHabits(context.userId, { isActive: true });
    }

    if (habitsToAnalyze.length === 0) {
      return {
        correlations: [],
        summary: "No active habits found for analysis",
      };
    }

    // Analyze each habit
    const correlations: HabitCorrelation[] = await Promise.all(
      habitsToAnalyze.map(async (habit: { id: string; name: string }): Promise<HabitCorrelation> => {
        const completions = await habitsRepo.getHabitCompletions(context.userId, {
          habitId: habit.id,
          startDate: validated.start_date,
          endDate: validated.end_date,
        });

        // Create map of completion dates
        const completionDates = new Set(completions.map((c: { completedDate: string }) => c.completedDate));

        // Group mood logs by whether habit was completed
        const energyWithHabit: number[] = [];
        const energyWithoutHabit: number[] = [];

        moodLogs.forEach((log: { logDate: string; details: unknown }) => {
          const details =
            typeof log.details === "object" && log.details !== null ? log.details : {};
          const energyLevel =
            "energyLevel" in details && typeof details.energyLevel === "number"
              ? details.energyLevel
              : null;

          if (energyLevel !== null) {
            if (completionDates.has(log.logDate)) {
              energyWithHabit.push(energyLevel);
            } else {
              energyWithoutHabit.push(energyLevel);
            }
          }
        });

        // Calculate averages
        const avgEnergyWithHabit =
          energyWithHabit.length > 0
            ? energyWithHabit.reduce((sum, e) => sum + e, 0) / energyWithHabit.length
            : null;

        const avgEnergyWithoutHabit =
          energyWithoutHabit.length > 0
            ? energyWithoutHabit.reduce((sum, e) => sum + e, 0) / energyWithoutHabit.length
            : null;

        // Calculate correlation strength
        let correlation: "positive" | "negative" | "neutral" | "insufficient_data" =
          "insufficient_data";
        let correlationStrength = 0;

        if (
          avgEnergyWithHabit !== null &&
          avgEnergyWithoutHabit !== null &&
          energyWithHabit.length >= 3 &&
          energyWithoutHabit.length >= 3
        ) {
          const diff = avgEnergyWithHabit - avgEnergyWithoutHabit;
          correlationStrength = Math.round(diff * 10) / 10;

          if (Math.abs(diff) < 0.5) {
            correlation = "neutral";
          } else if (diff > 0) {
            correlation = "positive";
          } else {
            correlation = "negative";
          }
        }

        return {
          habitId: habit.id,
          habitName: habit.name,
          daysCompleted: completions.length,
          daysTracked: moodLogs.length,
          avgEnergyWithHabit: avgEnergyWithHabit
            ? Math.round(avgEnergyWithHabit * 10) / 10
            : null,
          avgEnergyWithoutHabit: avgEnergyWithoutHabit
            ? Math.round(avgEnergyWithoutHabit * 10) / 10
            : null,
          correlation,
          correlationStrength,
          insight:
            correlation === "positive"
              ? `${habit.name} is associated with ${correlationStrength > 0 ? "+" : ""}${correlationStrength} higher energy levels`
              : correlation === "negative"
                ? `${habit.name} is associated with ${correlationStrength} lower energy levels`
                : correlation === "neutral"
                  ? `${habit.name} shows no significant correlation with energy levels`
                  : "Insufficient data to determine correlation",
        };
      }),
    );

    // Sort by correlation strength
    correlations.sort(
      (a: { correlationStrength: number }, b: { correlationStrength: number }) =>
        Math.abs(b.correlationStrength) - Math.abs(a.correlationStrength),
    );

    return {
      correlations,
      dateRange: {
        start: validated.start_date,
        end: validated.end_date,
      },
      summary:
        correlations.length > 0
          ? `Analyzed ${correlations.length} habit${correlations.length > 1 ? "s" : ""} for mood correlation`
          : "No habits to analyze",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to correlate mood and habits",
      "CORRELATE_MOOD_HABITS_FAILED",
      "database",
      false,
      { operation: "correlate_mood_habits" },
    );
  }
};

// ============================================================================
// TOOL: get_wellness_score
// ============================================================================

const GetWellnessScoreParamsSchema = z.object({
  period: z.enum(["week", "month", "quarter"]).default("month"),
});

type GetWellnessScoreParams = z.infer<typeof GetWellnessScoreParamsSchema>;

export const getWellnessScoreDefinition: ToolDefinition = {
  name: "get_wellness_score",
  category: "analytics",
  version: "1.0.0",
  description:
    "Calculate overall wellness composite score (0-100) based on mood consistency, habit completion rates, and energy levels. Provides breakdown by category.",
  useCases: [
    "When user asks 'how am I doing overall with my wellness?'",
    "When providing wellness dashboard summary",
    "When user wants to 'show me my wellness score for this month'",
    "When tracking progress toward wellness goals",
  ],
  exampleCalls: [
    'get_wellness_score({"period": "month"})',
    'get_wellness_score({"period": "week"})',
    'When user says: "Give me my overall wellness score"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      period: {
        type: "string",
        description: "Time period for score calculation: 'week', 'month', or 'quarter'",
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 600, // 10 minutes
  tags: ["wellness", "score", "analytics", "dashboard", "read"],
  deprecated: false,
};

export const getWellnessScoreHandler: ToolHandler<GetWellnessScoreParams> = async (
  params,
  context,
) => {
  const validated = GetWellnessScoreParamsSchema.parse(params);
  const db = await getDb();
  const productivityRepo = createProductivityRepository(db);
  const habitsRepo = createHabitsRepository(db);

  try {
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    if (validated.period === "week") {
      startDate.setDate(endDate.getDate() - 7);
    } else if (validated.period === "month") {
      startDate.setDate(endDate.getDate() - 30);
    } else {
      startDate.setDate(endDate.getDate() - 90);
    }

    const startDateString = startDate.toISOString().split("T")[0];
    const endDateString = endDate.toISOString().split("T")[0];

    if (!startDateString || !endDateString) {
      throw new AppError("Failed to format date strings", "DATE_FORMAT_ERROR", "validation", true);
    }

    // Get mood logs
    const moodLogs = await productivityRepo.getPulseLogsForAnalytics(
      context.userId,
      startDateString,
      endDateString,
    );

    // Get habits summary
    const habitsSummary = await habitsRepo.getHabitsSummary(context.userId);

    // Calculate mood score (0-35 points)
    let moodScore = 0;
    if (moodLogs.length > 0) {
      // Consistency (up to 15 points): percentage of days logged
      const daysInPeriod =
        validated.period === "week" ? 7 : validated.period === "month" ? 30 : 90;
      const consistencyScore = Math.min((moodLogs.length / daysInPeriod) * 15, 15);

      // Energy levels (up to 20 points): average energy / 10 * 20
      const energyLevels = moodLogs
        .map((log: { details: unknown }) => {
          const details =
            typeof log.details === "object" && log.details !== null ? log.details : {};
          return "energyLevel" in details && typeof details.energyLevel === "number"
            ? details.energyLevel
            : null;
        })
        .filter((e: number | null): e is number => e !== null);

      const avgEnergy =
        energyLevels.length > 0
          ? energyLevels.reduce((sum: number, e: number) => sum + e, 0) / energyLevels.length
          : 0;
      const energyScore = (avgEnergy / 10) * 20;

      moodScore = Math.round(consistencyScore + energyScore);
    }

    // Calculate habit score (0-40 points)
    let habitScore = 0;
    if (habitsSummary.activeHabits > 0) {
      // Completion rate (up to 25 points)
      const completionScore = habitsSummary.completionRate * 25;

      // Streaks (up to 15 points): longest active streak / 30 * 15
      const streakScore = Math.min((habitsSummary.longestActiveStreak / 30) * 15, 15);

      habitScore = Math.round(completionScore + streakScore);
    }

    // Calculate engagement score (0-25 points)
    let engagementScore = 0;
    // Days with activity (mood logging or habit completion)
    const uniqueDaysWithActivity = new Set([
      ...moodLogs.map((log: { logDate: string }) => log.logDate),
      // Note: habitsSummary doesn't include per-day completions, so we approximate
    ]).size;

    const daysInPeriod = validated.period === "week" ? 7 : validated.period === "month" ? 30 : 90;
    engagementScore = Math.round((uniqueDaysWithActivity / daysInPeriod) * 25);

    // Total score (0-100)
    const totalScore = Math.min(moodScore + habitScore + engagementScore, 100);

    // Determine overall assessment
    let assessment: string;
    if (totalScore >= 80) {
      assessment = "Excellent";
    } else if (totalScore >= 60) {
      assessment = "Good";
    } else if (totalScore >= 40) {
      assessment = "Fair";
    } else {
      assessment = "Needs Attention";
    }

    return {
      totalScore,
      assessment,
      period: validated.period,
      breakdown: {
        moodScore: {
          score: moodScore,
          maxScore: 35,
          percentage: Math.round((moodScore / 35) * 100),
          factors: {
            consistency: moodLogs.length,
            daysTracked: daysInPeriod,
          },
        },
        habitScore: {
          score: habitScore,
          maxScore: 40,
          percentage: Math.round((habitScore / 40) * 100),
          factors: {
            completionRate: Math.round(habitsSummary.completionRate * 100),
            longestStreak: habitsSummary.longestActiveStreak,
            activeHabits: habitsSummary.activeHabits,
          },
        },
        engagementScore: {
          score: engagementScore,
          maxScore: 25,
          percentage: Math.round((engagementScore / 25) * 100),
          factors: {
            daysActive: uniqueDaysWithActivity,
            daysInPeriod,
          },
        },
      },
      dateRange: {
        start: startDateString,
        end: endDateString,
      },
      recommendations:
        totalScore < 60
          ? [
              "Consider logging mood more consistently",
              "Focus on completing habits daily",
              "Track wellness activities regularly",
            ]
          : [
              "Keep up the great wellness tracking",
              "Continue maintaining your habits",
              "Monitor trends to sustain progress",
            ],
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to calculate wellness score",
      "GET_WELLNESS_SCORE_FAILED",
      "database",
      false,
      { operation: "get_wellness_score" },
    );
  }
};
