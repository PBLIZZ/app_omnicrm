/**
 * Goals & Habits Tools Tests
 *
 * Comprehensive test suite for goal tracking and habit logging tools.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGoalHandler,
  listGoalsHandler,
  updateGoalProgressHandler,
  analyzeGoalProgressHandler,
  logHabitHandler,
  getHabitStreakHandler,
  analyzeHabitPatternsHandler,
  getHabitAnalyticsHandler,
} from "../goals-habits";
import type { ToolExecutionContext } from "../../types";
import { getDb } from "@/server/db/client";
import { createProductivityRepository } from "@repo";
import { createHabitsRepository } from "@repo";

// Mock dependencies
vi.mock("@/server/db/client");
vi.mock("@repo/productivity.repo");
vi.mock("@repo/habits.repo");

const mockContext: ToolExecutionContext = {
  userId: "user-123",
  timestamp: new Date("2025-01-15T10:00:00Z"),
  requestId: "req-123",
};

const mockGoal = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "user-123",
  contactId: null,
  name: "Increase Q1 Revenue",
  goalType: "practitioner_business" as const,
  status: "on_track" as const,
  targetDate: "2025-03-31",
  details: {
    currentProgress: 60,
    lastProgressUpdate: "2025-01-10T00:00:00Z",
    progressHistory: [
      { timestamp: "2025-01-05T00:00:00Z", value: 40, notes: "Good start" },
      { timestamp: "2025-01-10T00:00:00Z", value: 60, notes: "Ahead of schedule" },
    ],
  },
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-10T00:00:00Z"),
};

const mockHabit = {
  id: "650e8400-e29b-41d4-a716-446655440001",
  userId: "user-123",
  name: "Daily Meditation",
  description: "20 minutes of mindfulness",
  habitType: "boolean",
  targetValue: null,
  targetUnit: null,
  targetFrequency: "daily",
  color: "#10B981",
  iconName: "check-circle",
  isActive: true,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
};

describe("Goals Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("get_goal", () => {
    it("should retrieve a goal by ID", async () => {
      const mockRepo = {
        getGoal: vi.fn().mockResolvedValue(mockGoal),
      };

      vi.mocked(getDb).mockResolvedValue({} as any);
      vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

      const result = await getGoalHandler({ goal_id: mockGoal.id }, mockContext);

      expect(result).toEqual(mockGoal);
      expect(mockRepo.getGoal).toHaveBeenCalledWith(mockGoal.id, "user-123");
    });

    it("should validate UUID format", async () => {
      await expect(getGoalHandler({ goal_id: "invalid-uuid" }, mockContext)).rejects.toThrow();
    });
  });

  describe("list_goals", () => {
    it("should list goals without filters", async () => {
      const mockGoals = [mockGoal];
      const mockRepo = {
        getGoals: vi.fn().mockResolvedValue(mockGoals),
      };

      vi.mocked(getDb).mockResolvedValue({} as any);
      vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

      const result = await listGoalsHandler({}, mockContext);

      expect(result.goals).toEqual(mockGoals);
      expect(result.count).toBe(1);
    });

    it("should filter goals by type", async () => {
      const mockRepo = {
        getGoals: vi.fn().mockResolvedValue([mockGoal]),
      };

      vi.mocked(getDb).mockResolvedValue({} as any);
      vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

      await listGoalsHandler({ goal_type: "practitioner_business" }, mockContext);

      expect(mockRepo.getGoals).toHaveBeenCalledWith("user-123", {
        goalType: ["practitioner_business"],
      });
    });
  });

  describe("update_goal_progress", () => {
    it("should update goal progress", async () => {
      const updatedGoal = {
        ...mockGoal,
        details: {
          ...mockGoal.details,
          currentProgress: 75,
        },
      };

      const mockRepo = {
        getGoal: vi.fn().mockResolvedValueOnce(mockGoal).mockResolvedValueOnce(updatedGoal),
        updateGoal: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(getDb).mockResolvedValue({} as any);
      vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

      const result = await updateGoalProgressHandler(
        {
          goal_id: mockGoal.id,
          progress_value: 75,
          notes: "Great progress!",
        },
        mockContext,
      );

      expect(mockRepo.updateGoal).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should validate progress value range", async () => {
      await expect(
        updateGoalProgressHandler({ goal_id: mockGoal.id, progress_value: 150 }, mockContext),
      ).rejects.toThrow();
    });
  });

  describe("analyze_goal_progress", () => {
    it("should analyze goal progress trajectory", async () => {
      const mockRepo = {
        getGoal: vi.fn().mockResolvedValue(mockGoal),
      };

      vi.mocked(getDb).mockResolvedValue({} as any);
      vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

      const result = await analyzeGoalProgressHandler({ goal_id: mockGoal.id }, mockContext);

      expect(result.goalId).toBe(mockGoal.id);
      expect(result.goalName).toBe(mockGoal.name);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.trajectory).toBeDefined();
    });
  });
});

describe("Habits Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("log_habit", () => {
    it("should log habit completion", async () => {
      const mockCompletion = {
        id: "750e8400-e29b-41d4-a716-446655440002",
        userId: "user-123",
        habitId: mockHabit.id,
        completedDate: "2025-01-15",
        valueCompleted: null,
        notes: null,
        createdAt: new Date("2025-01-15T10:00:00Z"),
      };

      const mockRepo = {
        getHabit: vi.fn().mockResolvedValue(mockHabit),
        createHabitCompletion: vi.fn().mockResolvedValue(mockCompletion),
      };

      vi.mocked(getDb).mockResolvedValue({} as any);
      vi.mocked(createHabitsRepository).mockReturnValue(mockRepo as any);

      const result = await logHabitHandler(
        {
          habit_id: mockHabit.id,
          completed_date: "2025-01-15",
        },
        mockContext,
      );

      expect(result.completion).toEqual(mockCompletion);
      expect(result.habit.name).toBe("Daily Meditation");
      expect(mockRepo.createHabitCompletion).toHaveBeenCalled();
    });

    it("should validate date format", async () => {
      await expect(
        logHabitHandler(
          {
            habit_id: mockHabit.id,
            completed_date: "01/15/2025", // Invalid format
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });
  });

  describe("get_habit_streak", () => {
    it("should calculate habit streak", async () => {
      const mockStreak = {
        habitId: mockHabit.id,
        currentStreak: 5,
        longestStreak: 10,
        lastCompletedDate: "2025-01-15",
        isActiveToday: true,
        milestones: [
          { days: 3, achievedAt: "2025-01-13" },
          { days: 5, achievedAt: "2025-01-15" },
          { days: 7, achievedAt: null },
        ],
      };

      const mockRepo = {
        getHabit: vi.fn().mockResolvedValue(mockHabit),
        calculateStreak: vi.fn().mockResolvedValue(mockStreak),
      };

      vi.mocked(getDb).mockResolvedValue({} as any);
      vi.mocked(createHabitsRepository).mockReturnValue(mockRepo as any);

      const result = await getHabitStreakHandler({ habit_id: mockHabit.id }, mockContext);

      expect(result.habitName).toBe("Daily Meditation");
      expect(result.streak.current).toBe(5);
      expect(result.streak.longest).toBe(10);
      expect(result.encouragement).toBeDefined();
    });
  });

  describe("analyze_habit_patterns", () => {
    it("should analyze habit patterns", async () => {
      const mockCompletions = [
        {
          id: "c1",
          userId: "user-123",
          habitId: mockHabit.id,
          completedDate: "2025-01-13",
          valueCompleted: null,
          notes: null,
          createdAt: new Date(),
        },
        {
          id: "c2",
          userId: "user-123",
          habitId: mockHabit.id,
          completedDate: "2025-01-14",
          valueCompleted: null,
          notes: null,
          createdAt: new Date(),
        },
        {
          id: "c3",
          userId: "user-123",
          habitId: mockHabit.id,
          completedDate: "2025-01-15",
          valueCompleted: null,
          notes: null,
          createdAt: new Date(),
        },
      ];

      const mockRepo = {
        getHabit: vi.fn().mockResolvedValue(mockHabit),
        getHabitCompletions: vi.fn().mockResolvedValue(mockCompletions),
      };

      vi.mocked(getDb).mockResolvedValue({} as any);
      vi.mocked(createHabitsRepository).mockReturnValue(mockRepo as any);

      const result = await analyzeHabitPatternsHandler({ habit_id: mockHabit.id }, mockContext);

      expect(result.habitName).toBe("Daily Meditation");
      expect(result.patterns.weeklyPattern).toBeDefined();
      expect(result.patterns.weeklyPattern.length).toBe(7);
      expect(result.metrics.totalCompletions).toBe(3);
    });
  });

  describe("get_habit_analytics", () => {
    it("should get comprehensive habit analytics", async () => {
      const mockStats = {
        habitId: mockHabit.id,
        totalCompletions: 25,
        completionRate: 0.83,
        averageValue: null,
        currentStreak: 5,
        longestStreak: 10,
        lastCompletedDate: "2025-01-15",
        trend: "improving" as const,
      };

      const mockStreak = {
        habitId: mockHabit.id,
        currentStreak: 5,
        longestStreak: 10,
        lastCompletedDate: "2025-01-15",
        isActiveToday: true,
        milestones: [{ days: 3, achievedAt: "2025-01-13" }],
      };

      const mockHeatmap = [
        { date: "2025-01-14", value: 1, completed: true },
        { date: "2025-01-15", value: 1, completed: true },
      ];

      const mockRepo = {
        getHabit: vi.fn().mockResolvedValue(mockHabit),
        getHabitStats: vi.fn().mockResolvedValue(mockStats),
        getHabitHeatmap: vi.fn().mockResolvedValue(mockHeatmap),
        calculateStreak: vi.fn().mockResolvedValue(mockStreak),
      };

      vi.mocked(getDb).mockResolvedValue({} as any);
      vi.mocked(createHabitsRepository).mockReturnValue(mockRepo as any);

      const result = await getHabitAnalyticsHandler(
        { habit_id: mockHabit.id, period: "month" },
        mockContext,
      );

      expect(result.habitName).toBe("Daily Meditation");
      expect(result.stats.totalCompletions).toBe(25);
      expect(result.stats.completionRate).toBe(83);
      expect(result.streak.current).toBe(5);
      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });
});
