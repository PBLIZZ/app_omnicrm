import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MomentumRepository } from "../momentum.repo";
import { getDb } from "@/server/db/client";
import { isOk, isErr } from "@/lib/utils/result";

vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

describe("MomentumRepository", () => {
  const mockUserId = "test-user-123";
  const mockProjectId = "project-456";
  const mockTaskId = "task-789";
  
  let mockDb: any;
  let repository: MomentumRepository;
  
  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
    
    vi.mocked(getDb).mockResolvedValue(mockDb);
    repository = new MomentumRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Projects", () => {
    describe("createProject", () => {
      it("should create a new project successfully", async () => {
        const projectData = {
          title: "Q4 Marketing Campaign",
          description: "Launch new product line",
          status: "active" as const,
        };

        const mockProject = {
          id: mockProjectId,
          userId: mockUserId,
          ...projectData,
          zoneId: null,
          dueDate: null,
          details: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockDb.insert.mockReturnValueOnce(mockDb);
        mockDb.values.mockReturnValueOnce(mockDb);
        mockDb.returning.mockResolvedValueOnce([mockProject]);

        const result = await repository.createProject(mockUserId, projectData);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data.title).toBe(projectData.title);
          expect(result.data.description).toBe(projectData.description);
        }
      });

      it("should handle database errors", async () => {
        const projectData = {
          title: "Test Project",
          status: "active" as const,
        };

        mockDb.insert.mockReturnValueOnce(mockDb);
        mockDb.values.mockReturnValueOnce(mockDb);
        mockDb.returning.mockRejectedValueOnce(new Error("DB error"));

        const result = await repository.createProject(mockUserId, projectData);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("DB_INSERT_FAILED");
        }
      });

      it("should return error when no data returned", async () => {
        const projectData = {
          title: "Test Project",
          status: "active" as const,
        };

        mockDb.insert.mockReturnValueOnce(mockDb);
        mockDb.values.mockReturnValueOnce(mockDb);
        mockDb.returning.mockResolvedValueOnce([]);

        const result = await repository.createProject(mockUserId, projectData);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("DB_INSERT_FAILED");
        }
      });
    });

    describe("getProjects", () => {
      it("should retrieve all projects for a user", async () => {
        const mockProjects = [
          {
            id: "project-1",
            userId: mockUserId,
            title: "Project 1",
            status: "active",
            zoneId: null,
            dueDate: null,
            details: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "project-2",
            userId: mockUserId,
            title: "Project 2",
            status: "completed",
            zoneId: null,
            dueDate: null,
            details: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.orderBy.mockResolvedValueOnce(mockProjects);

        const result = await repository.getProjects(mockUserId);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data).toHaveLength(2);
        }
      });

      it("should filter projects by status", async () => {
        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.orderBy.mockResolvedValueOnce([]);

        await repository.getProjects(mockUserId, { status: ["active"] });

        expect(mockDb.where).toHaveBeenCalled();
      });

      it("should filter projects by zoneId", async () => {
        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.orderBy.mockResolvedValueOnce([]);

        await repository.getProjects(mockUserId, { zoneId: 1 });

        expect(mockDb.where).toHaveBeenCalled();
      });
    });

    describe("getProjectById", () => {
      it("should retrieve a specific project", async () => {
        const mockProject = {
          id: mockProjectId,
          userId: mockUserId,
          title: "Test Project",
          status: "active",
          zoneId: null,
          dueDate: null,
          details: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.limit.mockResolvedValueOnce([mockProject]);

        const result = await repository.getProjectById(mockUserId, mockProjectId);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data?.id).toBe(mockProjectId);
        }
      });

      it("should return null when project not found", async () => {
        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.limit.mockResolvedValueOnce([]);

        const result = await repository.getProjectById(mockUserId, "non-existent");

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data).toBeNull();
        }
      });
    });

    describe("updateProject", () => {
      it("should update a project", async () => {
        const updates = {
          title: "Updated Title",
          status: "completed" as const,
        };

        const mockUpdated = {
          id: mockProjectId,
          userId: mockUserId,
          ...updates,
          zoneId: null,
          dueDate: null,
          details: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockDb.update.mockReturnValueOnce(mockDb);
        mockDb.set.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.returning.mockResolvedValueOnce([mockUpdated]);

        const result = await repository.updateProject(mockUserId, mockProjectId, updates);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data?.title).toBe(updates.title);
        }
      });
    });

    describe("deleteProject", () => {
      it("should delete a project", async () => {
        mockDb.delete.mockReturnValueOnce(mockDb);
        mockDb.where.mockResolvedValueOnce({ rowCount: 1 });

        const result = await repository.deleteProject(mockUserId, mockProjectId);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data).toBe(true);
        }
      });
    });
  });

  describe("Tasks", () => {
    describe("createTask", () => {
      it("should create a new task", async () => {
        const taskData = {
          title: "Review documentation",
          projectId: mockProjectId,
          status: "pending" as const,
          priority: "high" as const,
        };

        const mockTask = {
          id: mockTaskId,
          userId: mockUserId,
          ...taskData,
          description: null,
          parentTaskId: null,
          dueDate: null,
          completedAt: null,
          aiGenerated: false,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockDb.insert.mockReturnValueOnce(mockDb);
        mockDb.values.mockReturnValueOnce(mockDb);
        mockDb.returning.mockResolvedValueOnce([mockTask]);

        const result = await repository.createTask(mockUserId, taskData);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data.title).toBe(taskData.title);
          expect(result.data.priority).toBe(taskData.priority);
        }
      });

      it("should handle parent task references", async () => {
        const taskData = {
          title: "Subtask",
          projectId: mockProjectId,
          parentTaskId: "parent-task-id",
          status: "pending" as const,
        };

        mockDb.insert.mockReturnValueOnce(mockDb);
        mockDb.values.mockReturnValueOnce(mockDb);
        mockDb.returning.mockResolvedValueOnce([]);

        const result = await repository.createTask(mockUserId, taskData);

        expect(mockDb.values).toHaveBeenCalled();
      });
    });

    describe("getTasks", () => {
      it("should retrieve all tasks for a user", async () => {
        const mockTasks = [
          {
            id: "task-1",
            userId: mockUserId,
            projectId: mockProjectId,
            title: "Task 1",
            status: "pending",
            priority: "high",
            parentTaskId: null,
            dueDate: null,
            completedAt: null,
            aiGenerated: false,
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.orderBy.mockResolvedValueOnce(mockTasks);

        const result = await repository.getTasks(mockUserId);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data).toHaveLength(1);
        }
      });

      it("should filter tasks by project", async () => {
        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.orderBy.mockResolvedValueOnce([]);

        await repository.getTasks(mockUserId, { projectId: mockProjectId });

        expect(mockDb.where).toHaveBeenCalled();
      });

      it("should filter tasks by status", async () => {
        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.orderBy.mockResolvedValueOnce([]);

        await repository.getTasks(mockUserId, { status: ["pending", "in_progress"] });

        expect(mockDb.where).toHaveBeenCalled();
      });

      it("should filter tasks by priority", async () => {
        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.orderBy.mockResolvedValueOnce([]);

        await repository.getTasks(mockUserId, { priority: ["high", "urgent"] });

        expect(mockDb.where).toHaveBeenCalled();
      });
    });

    describe("getTaskById", () => {
      it("should retrieve a specific task", async () => {
        const mockTask = {
          id: mockTaskId,
          userId: mockUserId,
          projectId: mockProjectId,
          title: "Test Task",
          status: "pending",
          priority: "medium",
          parentTaskId: null,
          dueDate: null,
          completedAt: null,
          aiGenerated: true,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.limit.mockResolvedValueOnce([mockTask]);

        const result = await repository.getTaskById(mockUserId, mockTaskId);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data?.id).toBe(mockTaskId);
          expect(result.data?.aiGenerated).toBe(true);
        }
      });

      it("should return null when task not found", async () => {
        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.limit.mockResolvedValueOnce([]);

        const result = await repository.getTaskById(mockUserId, "non-existent");

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data).toBeNull();
        }
      });
    });

    describe("updateTask", () => {
      it("should update task status", async () => {
        const updates = {
          status: "completed" as const,
          completedAt: new Date(),
        };

        mockDb.update.mockReturnValueOnce(mockDb);
        mockDb.set.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.returning.mockResolvedValueOnce([{ ...updates, id: mockTaskId }]);

        const result = await repository.updateTask(mockUserId, mockTaskId, updates);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data?.status).toBe("completed");
        }
      });

      it("should update task priority", async () => {
        const updates = { priority: "urgent" as const };

        mockDb.update.mockReturnValueOnce(mockDb);
        mockDb.set.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.returning.mockResolvedValueOnce([]);

        await repository.updateTask(mockUserId, mockTaskId, updates);

        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining(updates));
      });
    });

    describe("deleteTask", () => {
      it("should delete a task", async () => {
        mockDb.delete.mockReturnValueOnce(mockDb);
        mockDb.where.mockResolvedValueOnce({ rowCount: 1 });

        const result = await repository.deleteTask(mockUserId, mockTaskId);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data).toBe(true);
        }
      });

      it("should return false when task not found", async () => {
        mockDb.delete.mockReturnValueOnce(mockDb);
        mockDb.where.mockResolvedValueOnce({ rowCount: 0 });

        const result = await repository.deleteTask(mockUserId, "non-existent");

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data).toBe(false);
        }
      });
    });
  });

  describe("Goals", () => {
    describe("createGoal", () => {
      it("should create a new goal", async () => {
        const goalData = {
          title: "Increase client retention",
          goalType: "business" as const,
          targetValue: 95,
          currentValue: 85,
          unit: "percentage",
          status: "active" as const,
        };

        const mockGoal = {
          id: "goal-123",
          userId: mockUserId,
          ...goalData,
          contactId: null,
          dueDate: null,
          completedAt: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockDb.insert.mockReturnValueOnce(mockDb);
        mockDb.values.mockReturnValueOnce(mockDb);
        mockDb.returning.mockResolvedValueOnce([mockGoal]);

        const result = await repository.createGoal(mockUserId, goalData);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data.title).toBe(goalData.title);
          expect(result.data.targetValue).toBe(goalData.targetValue);
        }
      });
    });

    describe("getGoals", () => {
      it("should retrieve all goals", async () => {
        const mockGoals = [
          {
            id: "goal-1",
            userId: mockUserId,
            title: "Goal 1",
            goalType: "business",
            status: "active",
            targetValue: 100,
            currentValue: 50,
            unit: "count",
            contactId: null,
            dueDate: null,
            completedAt: null,
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.orderBy.mockResolvedValueOnce(mockGoals);

        const result = await repository.getGoals(mockUserId);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data).toHaveLength(1);
        }
      });

      it("should filter goals by type", async () => {
        mockDb.select.mockReturnValueOnce(mockDb);
        mockDb.from.mockReturnValueOnce(mockDb);
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.orderBy.mockResolvedValueOnce([]);

        await repository.getGoals(mockUserId, { goalType: ["business", "personal"] });

        expect(mockDb.where).toHaveBeenCalled();
      });
    });
  });
});