/**
 * Unit tests for MomentumRepository
 * Tests OmniMomentum features: Projects, Tasks, Goals, and Daily Pulse
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MomentumRepository } from "../momentum.repo";
import * as dbClient from "@/server/db/client";

// Mock the database client
vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

describe("MomentumRepository", () => {
  const mockUserId = "test-user-123";
  let repository: MomentumRepository;

  const createMockDb = () => ({
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn(),
    innerJoin: vi.fn().mockReturnThis(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new MomentumRepository();
  });

  describe("Projects", () => {
    const mockProject = {
      id: "project-123",
      userId: mockUserId,
      zoneId: 1,
      name: "Q1 Business Goals",
      status: "active" as const,
      dueDate: new Date("2025-03-31"),
      details: { priority: "high" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe("createProject", () => {
      it("should create a new project", async () => {
        const mockDb = createMockDb();
        mockDb.returning.mockResolvedValue([mockProject]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.createProject(mockUserId, {
          name: "Q1 Business Goals",
          status: "active",
          zoneId: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Q1 Business Goals");
          expect(result.data.userId).toBe(mockUserId);
        }
      });

      it("should handle null optional fields", async () => {
        const projectWithNulls = { ...mockProject, zoneId: null, dueDate: null };
        const mockDb = createMockDb();
        mockDb.returning.mockResolvedValue([projectWithNulls]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.createProject(mockUserId, {
          name: "Simple Project",
          status: "active",
        });

        expect(result.success).toBe(true);
      });

      it("should handle database errors", async () => {
        vi.mocked(dbClient.getDb).mockRejectedValue(new Error("DB Error"));

        const result = await repository.createProject(mockUserId, {
          name: "Test Project",
          status: "active",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe("DB_INSERT_FAILED");
        }
      });
    });

    describe("getProjects", () => {
      it("should retrieve all projects for a user", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockProject]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getProjects(mockUserId);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toHaveLength(1);
        }
      });

      it("should filter by zone ID", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockProject]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getProjects(mockUserId, { zoneId: 1 });

        expect(result.success).toBe(true);
      });

      it("should filter by status", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockProject]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getProjects(mockUserId, { status: ["active"] });

        expect(result.success).toBe(true);
      });
    });

    describe("updateProject", () => {
      it("should update a project", async () => {
        const mockDb = createMockDb();
        mockDb.set.mockResolvedValue(undefined);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.updateProject("project-123", mockUserId, {
          name: "Updated Project",
        });

        expect(result.success).toBe(true);
      });
    });

    describe("deleteProject", () => {
      it("should delete a project", async () => {
        const mockDb = createMockDb();
        mockDb.delete.mockResolvedValue([{ id: "project-123" }]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.deleteProject("project-123", mockUserId);

        expect(result.success).toBe(true);
      });
    });
  });

  describe("Tasks", () => {
    const mockTask = {
      id: "task-123",
      userId: mockUserId,
      projectId: "project-123",
      parentTaskId: null,
      name: "Complete quarterly review",
      status: "todo" as const,
      priority: "high" as const,
      dueDate: new Date("2025-03-31"),
      details: { notes: "Important task" },
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe("createTask", () => {
      it("should create a new task", async () => {
        const mockDb = createMockDb();
        mockDb.returning.mockResolvedValue([mockTask]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.createTask(mockUserId, {
          name: "Complete quarterly review",
          status: "todo",
          priority: "high",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Complete quarterly review");
        }
      });

      it("should create a subtask with parentTaskId", async () => {
        const subtask = { ...mockTask, parentTaskId: "parent-task-123" };
        const mockDb = createMockDb();
        mockDb.returning.mockResolvedValue([subtask]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.createTask(mockUserId, {
          name: "Subtask",
          status: "todo",
          priority: "medium",
          parentTaskId: "parent-task-123",
        });

        expect(result.success).toBe(true);
      });
    });

    describe("getTasks", () => {
      it("should retrieve all tasks for a user", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockTask]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getTasks(mockUserId);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toHaveLength(1);
        }
      });

      it("should filter by project ID", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockTask]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getTasks(mockUserId, { projectId: "project-123" });

        expect(result.success).toBe(true);
      });

      it("should filter by parent task ID", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getTasks(mockUserId, { parentTaskId: null });

        expect(result.success).toBe(true);
      });

      it("should filter by status", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockTask]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getTasks(mockUserId, { status: ["todo", "in_progress"] });

        expect(result.success).toBe(true);
      });

      it("should filter by priority", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockTask]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getTasks(mockUserId, { priority: ["high", "urgent"] });

        expect(result.success).toBe(true);
      });
    });

    describe("getSubtasks", () => {
      it("should retrieve subtasks for a parent task", async () => {
        const subtask = { ...mockTask, parentTaskId: "parent-123", id: "subtask-1" };
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([subtask]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getSubtasks("parent-123", mockUserId);

        expect(result).toHaveLength(1);
        expect(result[0]?.parentTaskId).toBe("parent-123");
      });
    });

    describe("updateTask", () => {
      it("should update a task", async () => {
        const mockDb = createMockDb();
        mockDb.set.mockResolvedValue(undefined);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        await repository.updateTask("task-123", mockUserId, { status: "done" });

        expect(mockDb.update).toHaveBeenCalled();
      });
    });

    describe("deleteTask", () => {
      it("should delete a task and its contact tags", async () => {
        const mockDb = createMockDb();
        mockDb.delete.mockResolvedValue([]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        await repository.deleteTask("task-123", mockUserId);

        expect(mockDb.delete).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Task Contact Tags", () => {
    describe("addTaskContactTags", () => {
      it("should add contact tags to a task", async () => {
        const mockDb = createMockDb();
        mockDb.values.mockResolvedValue(undefined);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        await repository.addTaskContactTags("task-123", ["contact-1", "contact-2"]);

        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("should handle empty contact IDs array", async () => {
        const mockDb = createMockDb();
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        await repository.addTaskContactTags("task-123", []);

        expect(mockDb.insert).not.toHaveBeenCalled();
      });
    });

    describe("removeTaskContactTags", () => {
      it("should remove specific contact tags", async () => {
        const mockDb = createMockDb();
        mockDb.delete.mockResolvedValue([]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        await repository.removeTaskContactTags("task-123", ["contact-1"]);

        expect(mockDb.delete).toHaveBeenCalled();
      });

      it("should remove all contact tags when no IDs specified", async () => {
        const mockDb = createMockDb();
        mockDb.delete.mockResolvedValue([]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        await repository.removeTaskContactTags("task-123");

        expect(mockDb.delete).toHaveBeenCalled();
      });
    });
  });

  describe("Goals", () => {
    const mockGoal = {
      id: "goal-123",
      userId: mockUserId,
      contactId: "contact-123",
      goalType: "client_wellness" as const,
      name: "Improve flexibility",
      status: "on_track" as const,
      targetDate: new Date("2025-06-30"),
      details: { milestones: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe("createGoal", () => {
      it("should create a new goal", async () => {
        const mockDb = createMockDb();
        mockDb.returning.mockResolvedValue([mockGoal]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.createGoal(mockUserId, {
          name: "Improve flexibility",
          goalType: "client_wellness",
          status: "on_track",
        });

        expect(result.name).toBe("Improve flexibility");
        expect(result.goalType).toBe("client_wellness");
      });
    });

    describe("getGoals", () => {
      it("should retrieve goals for a user", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockGoal]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getGoals(mockUserId);

        expect(result).toHaveLength(1);
      });

      it("should filter by contact ID", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockGoal]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getGoals(mockUserId, { contactId: "contact-123" });

        expect(result).toHaveLength(1);
      });

      it("should filter by goal type", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockGoal]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getGoals(mockUserId, { goalType: ["client_wellness"] });

        expect(result).toHaveLength(1);
      });
    });
  });

  describe("Daily Pulse Logs", () => {
    const mockLog = {
      id: "log-123",
      userId: mockUserId,
      logDate: "2025-01-15",
      details: { mood: "positive", energy: 8 },
      createdAt: new Date(),
    };

    describe("createDailyPulseLog", () => {
      it("should create a daily pulse log", async () => {
        const mockDb = createMockDb();
        mockDb.returning.mockResolvedValue([mockLog]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.createDailyPulseLog(mockUserId, {
          details: { mood: "positive", energy: 8 },
        });

        expect(result.userId).toBe(mockUserId);
      });
    });

    describe("getDailyPulseLogs", () => {
      it("should retrieve daily pulse logs", async () => {
        const mockDb = createMockDb();
        mockDb.limit.mockResolvedValue([mockLog]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getDailyPulseLogs(mockUserId, 30);

        expect(result).toHaveLength(1);
      });
    });
  });

  describe("Inbox Items", () => {
    const mockInboxItem = {
      id: "inbox-123",
      userId: mockUserId,
      rawText: "Quick note to follow up",
      status: "unprocessed" as const,
      createdTaskId: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe("createInboxItem", () => {
      it("should create an inbox item", async () => {
        const mockDb = createMockDb();
        mockDb.returning.mockResolvedValue([mockInboxItem]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.createInboxItem(mockUserId, {
          rawText: "Quick note to follow up",
        });

        expect(result.rawText).toBe("Quick note to follow up");
        expect(result.status).toBe("unprocessed");
      });
    });

    describe("getInboxItems", () => {
      it("should retrieve inbox items", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockInboxItem]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getInboxItems(mockUserId);

        expect(result).toHaveLength(1);
      });

      it("should filter by status", async () => {
        const mockDb = createMockDb();
        mockDb.orderBy.mockResolvedValue([mockInboxItem]);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getInboxItems(mockUserId, "unprocessed");

        expect(result).toHaveLength(1);
      });
    });
  });

  describe("Statistics", () => {
    describe("getTaskStats", () => {
      it("should return task statistics", async () => {
        const mockTasks = [
          { status: "todo" },
          { status: "todo" },
          { status: "in_progress" },
          { status: "done" },
        ];
        const mockDb = createMockDb();
        mockDb.select.mockResolvedValue(mockTasks);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getTaskStats(mockUserId);

        expect(result.total).toBe(4);
        expect(result.todo).toBe(2);
        expect(result.inProgress).toBe(1);
        expect(result.completed).toBe(1);
      });
    });

    describe("getProjectStats", () => {
      it("should return project statistics", async () => {
        const mockProjects = [
          { status: "active" },
          { status: "active" },
          { status: "completed" },
        ];
        const mockDb = createMockDb();
        mockDb.select.mockResolvedValue(mockProjects);
        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await repository.getProjectStats(mockUserId);

        expect(result.total).toBe(3);
        expect(result.active).toBe(2);
        expect(result.completed).toBe(1);
      });
    });
  });
});