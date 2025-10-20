import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductivityRepository } from "../productivity.repo";
import { createMockDbClient, type MockDbClient } from "@packages/testing";
import type { Project, Task } from "@/server/db/schema";

describe("ProductivityRepository", () => {
  let mockDb: MockDbClient;
  let repo: ProductivityRepository;
  const mockUserId = "user-123";
  const mockProjectId = "project-456";
  const mockTaskId = "task-789";

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = new ProductivityRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("createProject", () => {
    it("should create a new project", async () => {
      const projectData = {
        name: "Test Project",
        description: "A test project",
        status: "active" as const,
        color: "#3b82f6",
        zoneId: 1,
        dueDate: "2024-12-31",
        details: { priority: "high" },
      };

      const mockCreatedProject = {
        id: mockProjectId,
        userId: mockUserId,
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([mockCreatedProject]);

      const result = await repo.createProject(mockUserId, projectData);

      expect(result).toEqual(mockCreatedProject);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith({ ...projectData, userId: mockUserId });
    });

    it("should throw error when insert returns no data", async () => {
      const projectData = {
        name: "Test Project",
        status: "active" as const,
        details: null,
        dueDate: null,
        zoneId: null,
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      await expect(repo.createProject(mockUserId, projectData)).rejects.toThrow(
        "Insert returned no data",
      );
    });
  });

  describe("getProjects", () => {
    it("should return projects with default filters", async () => {
      const mockProjects = [
        {
          id: mockProjectId,
          userId: mockUserId,
          name: "Test Project",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockProjects);

      const result = await repo.getProjects(mockUserId);

      expect(result).toEqual(mockProjects);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });

    it("should filter projects by zoneId", async () => {
      const mockProjects: Project[] = [];
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockProjects);

      const result = await repo.getProjects(mockUserId, { zoneId: 1 });

      expect(result).toEqual(mockProjects);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should filter projects by status", async () => {
      const mockProjects: Project[] = [];
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockProjects);

      const result = await repo.getProjects(mockUserId, { status: ["active", "completed"] });

      expect(result).toEqual(mockProjects);
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("getProject", () => {
    it("should return project when found", async () => {
      const mockProject = {
        id: mockProjectId,
        userId: mockUserId,
        name: "Test Project",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockProject]);

      const result = await repo.getProject(mockUserId, mockProjectId);

      expect(result).toEqual(mockProject);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should return null when project not found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const result = await repo.getProject(mockUserId, "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateProject", () => {
    it("should update an existing project", async () => {
      const updateData = {
        name: "Updated Project",
        status: "completed" as const,
      };

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();

      await repo.updateProject(mockProjectId, mockUserId, updateData);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should not throw when project not found for update", async () => {
      const updateData = { name: "Updated Project" };

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();

      await expect(
        repo.updateProject("non-existent", mockUserId, updateData),
      ).resolves.not.toThrow();
    });
  });

  describe("deleteProject", () => {
    it("should delete an existing project", async () => {
      mockDb.delete.mockReturnThis();
      mockDb.where.mockReturnThis();

      await repo.deleteProject(mockProjectId, mockUserId);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should not throw when project not found for deletion", async () => {
      mockDb.delete.mockReturnThis();
      mockDb.where.mockReturnThis();

      await expect(repo.deleteProject("non-existent", mockUserId)).resolves.not.toThrow();
    });
  });

  describe("createTask", () => {
    it("should create a new task", async () => {
      const taskData = {
        name: "Test Task",
        projectId: mockProjectId,
        priority: "medium" as const,
        status: "todo" as const,
        dueDate: "2024-12-31",
        details: { description: "Task description" },
        parentTaskId: null,
        completedAt: null,
      };

      const mockCreatedTask = {
        id: mockTaskId,
        userId: mockUserId,
        ...taskData,
        parentTaskId: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([mockCreatedTask]);

      const result = await repo.createTask(mockUserId, taskData);

      expect(result).toEqual(mockCreatedTask);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith({ ...taskData, userId: mockUserId });
    });

    it("should throw error when insert returns no data", async () => {
      const taskData = {
        name: "Test Task",
        priority: "medium" as const,
        status: "todo" as const,
        details: null,
        dueDate: null,
        projectId: null,
        parentTaskId: null,
        completedAt: null,
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      await expect(repo.createTask(mockUserId, taskData)).rejects.toThrow(
        "Insert returned no data",
      );
    });
  });

  describe("getTasks", () => {
    it("should return tasks with default filters", async () => {
      const mockTasks = [
        {
          id: mockTaskId,
          userId: mockUserId,
          name: "Test Task",
          status: "todo",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockTasks);

      const result = await repo.getTasks(mockUserId);

      expect(result).toEqual(mockTasks);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });

    it("should filter tasks by projectId", async () => {
      const mockTasks: Task[] = [];
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockTasks);

      const result = await repo.getTasks(mockUserId, { projectId: mockProjectId });

      expect(result).toEqual(mockTasks);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should filter tasks by status", async () => {
      const mockTasks: Task[] = [];
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockTasks);

      const result = await repo.getTasks(mockUserId, { status: ["todo", "in_progress"] });

      expect(result).toEqual(mockTasks);
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("getTask", () => {
    it("should return task when found", async () => {
      const mockTask = {
        id: mockTaskId,
        userId: mockUserId,
        name: "Test Task",
        status: "todo",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTask]);

      const result = await repo.getTask(mockUserId, mockTaskId);

      expect(result).toEqual(mockTask);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should return null when task not found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const result = await repo.getTask(mockUserId, "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateTask", () => {
    it("should update an existing task", async () => {
      const updateData = {
        name: "Updated Task",
        status: "completed" as const,
      };

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();

      await repo.updateTask(mockTaskId, mockUserId, updateData);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should not throw when task not found for update", async () => {
      const updateData = { name: "Updated Task" };

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();

      await expect(repo.updateTask("non-existent", mockUserId, updateData)).resolves.not.toThrow();
    });
  });

  describe("deleteTask", () => {
    it("should delete an existing task", async () => {
      mockDb.delete.mockReturnThis();
      mockDb.where.mockReturnThis();

      await repo.deleteTask(mockTaskId, mockUserId);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should not throw when task not found for deletion", async () => {
      mockDb.delete.mockReturnThis();
      mockDb.where.mockReturnThis();

      await expect(repo.deleteTask("non-existent", mockUserId)).resolves.not.toThrow();
    });
  });
});
