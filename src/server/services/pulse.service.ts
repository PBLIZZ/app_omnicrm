/**
 * Pulse Service
 *
 * Business logic for daily pulse logging with analytics and correlation analysis.
 * Follows functional service pattern with getDb() and AppError wrapping.
 */

import { getDb } from "@/server/db/client";
import { createProductivityRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";
import type { CreateDailyPulseLogInput } from "@/server/db/business-schemas/productivity";
import type {
  DailyPulseLog,
  CreateDailyPulseLog,
  PulseSummary,
  PulseAnalytics,
  PulseCorrelation,
  PulseTimePattern,
} from "@repo";

// ============================================================================
// PULSE LOGS CRUD
// ============================================================================

/**
 * Create a daily pulse log
 */
export async function createPulseLogService(
  userId: string,
  data: CreateDailyPulseLogInput,
): Promise<DailyPulseLog> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Pass Zod input directly to repository (logDate is optional, repo handles default)
    return await repo.createDailyPulseLog(userId, data);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create pulse log",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Get pulse logs for a user
 */
export async function getPulseLogsService(
  userId: string,
  limit: number = 30,
): Promise<DailyPulseLog[]> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    return await repo.getDailyPulseLogs(userId, limit);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get pulse logs",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Get a single pulse log by date
 */
export async function getPulseLogByDateService(
  userId: string,
  logDate: Date,
): Promise<DailyPulseLog | null> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    return await repo.getDailyPulseLog(userId, logDate);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get pulse log",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Update a pulse log
 */
export async function updatePulseLogService(
  userId: string,
  logId: string,
  data: Partial<CreateDailyPulseLog>,
): Promise<void> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    await repo.updateDailyPulseLog(logId, userId, data);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update pulse log",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Delete a pulse log
 */
export async function deletePulseLogService(
  userId: string,
  logId: string,
): Promise<void> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    await repo.deleteDailyPulseLog(logId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete pulse log",
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

interface ParsedPulseLog {
  id: string;
  userId: string;
  logDate: string;
  createdAt: Date | null;
  details: {
    time?: number;
    energy?: number;
    mood?: number;
    notes?: string;
    tasksCompleted?: number;
    contactsEngaged?: number;
    habitsCompleted?: number;
  };
}

/**
 * Get pulse analytics for a time period
 */
export async function getPulseAnalyticsService(
  userId: string,
  period: "week" | "month" | "quarter" = "month",
): Promise<PulseAnalytics> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    if (period === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      startDate.setDate(startDate.getDate() - 90);
    }

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

    // Get pulse logs
    const logs = await repo.getPulseLogsForAnalytics(userId, startDateString, endDateString);

    // Parse details from each log
    const parsedLogs: ParsedPulseLog[] = logs.map((log): ParsedPulseLog => ({
      ...log,
      details: typeof log.details === "object" && log.details !== null
        ? (log.details as ParsedPulseLog["details"])
        : {},
    }));

    // Calculate summary
    const summary = calculatePulseSummary(parsedLogs, period, startDateString, endDateString);

    // Get task completions for correlation
    const taskCompletions = await repo.getTaskCompletionsByDateRange(
      userId,
      startDateString,
      endDateString,
    );

    // Calculate correlations
    const correlations = calculateCorrelations(parsedLogs, taskCompletions);

    // Calculate time patterns
    const timePatterns = calculateTimePatterns();

    // Create weekly heatmap
    const weeklyHeatmap = createWeeklyHeatmap(parsedLogs);

    return {
      summary,
      correlations,
      timePatterns,
      weeklyHeatmap,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get pulse analytics",
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

function calculatePulseSummary(
  logs: ParsedPulseLog[],
  period: string,
  startDate: string,
  endDate: string,
): PulseSummary {
  if (logs.length === 0) {
    return {
      period: period as "week" | "month" | "quarter",
      startDate,
      endDate,
      averages: { time: 0, energy: 0, mood: 0 },
      trends: { time: "stable", energy: "stable", mood: "stable" },
      bestDay: null,
      worstDay: null,
      totalLogs: 0,
      completionRate: 0,
    };
  }

  // Calculate averages
  const totals = logs.reduce(
    (acc, log) => {
      const details = log.details;
      return {
        time: acc.time + (details.time ?? 0),
        energy: acc.energy + (details.energy ?? 0),
        mood: acc.mood + (details.mood ?? 0),
      };
    },
    { time: 0, energy: 0, mood: 0 },
  );

  const averages = {
    time: totals.time / logs.length,
    energy: totals.energy / logs.length,
    mood: totals.mood / logs.length,
  };

  // Calculate trends (first half vs second half)
  const midPoint = Math.floor(logs.length / 2);
  const firstHalf = logs.slice(0, midPoint);
  const secondHalf = logs.slice(midPoint);

  const firstHalfAvg = calculateAverages(firstHalf);
  const secondHalfAvg = calculateAverages(secondHalf);

  const trends = {
    time: getTrend(firstHalfAvg.time, secondHalfAvg.time),
    energy: getTrend(firstHalfAvg.energy, secondHalfAvg.energy),
    mood: getTrend(firstHalfAvg.mood, secondHalfAvg.mood),
  };

  // Find best and worst days
  const scoredLogs = logs.map(log => {
    const details = log.details;
    const overallScore = ((details.time ?? 0) + (details.energy ?? 0) + (details.mood ?? 0)) / 3;
    return { date: log.logDate, overallScore };
  });

  const bestDay = scoredLogs.reduce((best, current) =>
    current.overallScore > best.overallScore ? current : best,
  );
  const worstDay = scoredLogs.reduce((worst, current) =>
    current.overallScore < worst.overallScore ? current : worst,
  );

  // Calculate completion rate
  const daysDiff = Math.floor(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  ) + 1;
  const completionRate = logs.length / daysDiff;

  return {
    period: period as "week" | "month" | "quarter",
    startDate,
    endDate,
    averages,
    trends,
    bestDay,
    worstDay,
    totalLogs: logs.length,
    completionRate,
  };
}

function calculateAverages(logs: ParsedPulseLog[]): { time: number; energy: number; mood: number } {
  if (logs.length === 0) return { time: 0, energy: 0, mood: 0 };

  const totals = logs.reduce(
    (acc, log) => {
      const details = log.details;
      return {
        time: acc.time + (details.time ?? 0),
        energy: acc.energy + (details.energy ?? 0),
        mood: acc.mood + (details.mood ?? 0),
      };
    },
    { time: 0, energy: 0, mood: 0 },
  );

  return {
    time: totals.time / logs.length,
    energy: totals.energy / logs.length,
    mood: totals.mood / logs.length,
  };
}

function getTrend(firstValue: number, secondValue: number): "up" | "down" | "stable" {
  const threshold = 0.2; // 20% change threshold
  const change = (secondValue - firstValue) / (firstValue || 1);

  if (change > threshold) return "up";
  if (change < -threshold) return "down";
  return "stable";
}

function calculateCorrelations(
  pulseLogs: ParsedPulseLog[],
  taskCompletions: Array<{ date: string; count: number }>
): PulseCorrelation[] {
  // Simple correlation: check if higher energy correlates with more tasks
  // This is a placeholder - full Pearson correlation would be more accurate

  if (pulseLogs.length < 5) {
    return []; // Insufficient data
  }

  const correlations: PulseCorrelation[] = [];

  // Task correlation
  const taskMap = new Map(taskCompletions.map(t => [t.date, t.count]));
  const pairs = pulseLogs
    .map(log => ({
      energy: log.details.energy ?? 0,
      tasks: taskMap.get(log.logDate) ?? 0,
    }))
    .filter(p => p.tasks > 0); // Only days with tasks

  if (pairs.length >= 3) {
    const avgEnergy = pairs.reduce((sum, p) => sum + p.energy, 0) / pairs.length;
    const avgTasks = pairs.reduce((sum, p) => sum + p.tasks, 0) / pairs.length;

    const highEnergyHighTasks = pairs.filter(p => p.energy > avgEnergy && p.tasks > avgTasks).length;
    const correlation = (highEnergyHighTasks / pairs.length) * 2 - 1; // Scale to -1 to 1

    const significance =
      Math.abs(correlation) > 0.5 ? "strong" :
      Math.abs(correlation) > 0.3 ? "moderate" :
      Math.abs(correlation) > 0.1 ? "weak" : "none";

    const insights: string[] = [];
    if (correlation > 0.3) {
      insights.push("Higher energy levels correlate with more task completions");
    } else if (correlation < -0.3) {
      insights.push("Task completion may be energy-depleting");
    }

    correlations.push({
      metric: "tasks",
      correlation,
      significance: significance as "strong" | "moderate" | "weak" | "none",
      insights,
    });
  }

  return correlations;
}

function calculateTimePatterns(): PulseTimePattern[] {
  // Future enhancement: Group by hour if time data is available
  // Would need actual time-of-day data in pulse log details
  return [];
}

function createWeeklyHeatmap(logs: ParsedPulseLog[]): Array<{
  date: string;
  overallScore: number;
  time: number;
  energy: number;
  mood: number;
}> {
  return logs.map(log => ({
    date: log.logDate,
    overallScore: ((log.details.time ?? 0) + (log.details.energy ?? 0) + (log.details.mood ?? 0)) / 3,
    time: log.details.time ?? 0,
    energy: log.details.energy ?? 0,
    mood: log.details.mood ?? 0,
  }));
}
