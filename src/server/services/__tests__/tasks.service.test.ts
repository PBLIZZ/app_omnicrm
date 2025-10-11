import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTaskService,
  getTaskService,
  listTasksService,
  updateTaskService,
  deleteTaskService,
  getTaskStatsService,
  getPendingApprovalTasksService,
  approveTaskService,
  rejectTaskService,
  getProjectTasksService,
  getSubtasksService,
} from "../tasks.service";
import { createProductivityRepository } from "@repo";
import * as dbClient from "@/server/db/client";

vi.mock("@repo");
vi.mock("@/server/db/client");

describe("TasksService", () => {
  const userId = "user-1";
  const taskId = "task-1";
  const projectId = "project-1";
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      getTask: vi.fn(),
      getTasks: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      getProject: vi.fn(),
      getTaskStats: vi.fn(),
    };
    vi.mocked(dbClient.getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo);
  });

  describe("createTaskService", () => {
    it("creates a task with normalized details and default fields", async () => {
      const created = {
        id: taskId,
        userId,
        name: "Test",
        projectId: null,
        parentTaskId: null,
        priority: "medium",
        status: "todo",
        dueDate: null,
        details: {},
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.getTask.mockResolvedValue({ id: "parent", userId } as any); // not used unless parentTaskId provided
      mockRepo.createTask.mockResolvedValue(created);

      const result = await createTaskService(userId, { name: "Test", details: "ignored" as any });

      expect(mockRepo.createTask).toHaveBeenCalledWith(userId, {
        name: "Test",
        projectId: null,
        parentTaskId: null,
        priority: "medium",
        status: "todo",
        dueDate: null,
        details: {},
        completedAt: null,
      });
      expect(result).toEqual(created);
    });

    it("validates parent task existence", async () => {
      mockRepo.getTask.mockResolvedValue(null);

      await expect(
        createTaskService(userId, { name: "Child", parentTaskId: "missing" }),
      ).rejects.toThrow(/Parent task not found/);
      expect(mockRepo.createTask).not.toHaveBeenCalled();
    });

    it("passes through provided fields and formats dueDate", async () => {
      const created = { id: taskId } as any;
      mockRepo.getTask.mockResolvedValue({ id: "parent", userId } as any);
      mockRepo.createTask.mockResolvedValue(created);

      const due = new Date("2024-01-02T10:00:00Z");
      await createTaskService(userId, {
        name: "Child",
        parentTaskId: "parent",
        projectId: projectId,
        priority: "high",
        status: "in_progress",
        dueDate: due,
        details: { k: "v" },
      });

      expect(mockRepo.createTask).toHaveBeenCalledWith(userId, expect.objectContaining({
        projectId,
        parentTaskId: "parent",
        priority: "high",
        status: "in_progress",
        dueDate: "2024-01-02", // dateToString helper trims time
        details: { k: "v" },
      }));
    });
  });

  describe("getTaskService", () => {
    it("delegates to repo.getTask", async () => {
      const task = { id: taskId } as any;
      mockRepo.getTask.mockResolvedValue(task);

      const result = await getTaskService(userId, taskId);
      expect(mockRepo.getTask).toHaveBeenCalledWith(taskId, userId);
      expect(result).toBe(task);
    });
  });

  describe("listTasksService", () => {
    it("delegates to repo.getTasks with filters", async () => {
      const tasks = [{ id: "t1" }] as any;
      mockRepo.getTasks.mockResolvedValue(tasks);

      const filters = { projectId, status: ["todo"], priority: ["high"] };
      const result = await listTasksService(userId, filters);

      expect(mockRepo.getTasks).toHaveBeenCalledWith(userId, filters);
      expect(result).toBe(tasks);
    });
  });

  describe("updateTaskService", () => {
    it("sanitizes details via sanitizeJsonb and returns updated entity", async () => {
      const updated = { id: taskId, details: { safe: true } } as any;
      mockRepo.updateTask.mockResolvedValue(undefined);
      mockRepo.getTask.mockResolvedValue(updated);

      const result = await updateTaskService(userId, taskId, { details: { nested: { a: 1 } } });

      expect(mockRepo.updateTask).toHaveBeenCalledWith(
        taskId,
        userId,
        expect.objectContaining({ details: expect.any(Object) }),
      );
      expect(result).toEqual(updated);
    });

    it("filters out undefined fields", async () => {
      mockRepo.updateTask.mockResolvedValue(undefined);
      mockRepo.getTask.mockResolvedValue({ id: taskId } as any);

      await updateTaskService(userId, taskId, { name: "X", status: undefined });

      const call = vi.mocked(mockRepo.updateTask).mock.calls[0][2];
      expect("status" in call).toBe(false);
      expect(call.name).toBe("X");
    });
  });

  describe("deleteTaskService", () => {
    it("delegates to repo.deleteTask", async () => {
      mockRepo.deleteTask.mockResolvedValue(undefined);
      await expect(deleteTaskService(userId, taskId)).resolves.toBeUndefined();
      expect(mockRepo.deleteTask).toHaveBeenCalledWith(taskId, userId);
    });
  });

  describe("getTaskStatsService", () => {
    it("returns repo.getTaskStats response", async () => {
      mockRepo.getTaskStats.mockResolvedValue({ total: 5 });
      const result = await getTaskStatsService(userId);
      expect(result).toEqual({ total: 5 });
    });
  });

  describe("approval workflow", () => {
    it("getPendingApprovalTasksService filters by status", async () => {
      mockRepo.getTasks.mockResolvedValue([{ id: "p" }] as any);
      const result = await getPendingApprovalTasksService(userId);
      expect(mockRepo.getTasks).toHaveBeenCalledWith(userId, { status: ["pending_approval"] });
      expect(result).toEqual({ tasks: [{ id: "p" }], total: 1 });
    });

    it("approveTaskService sets status to todo", async () => {
      mockRepo.updateTask.mockResolvedValue(undefined);
      mockRepo.getTask.mockResolvedValue({ id: taskId, status: "todo" } as any);
      const result = await approveTaskService(userId, taskId);
      expect(mockRepo.updateTask).toHaveBeenCalledWith(taskId, userId, { status: "todo" });
      expect(result?.status).toBe("todo");
    });

    it("rejectTaskService sets status to canceled", async () => {
      mockRepo.updateTask.mockResolvedValue(undefined);
      mockRepo.getTask.mockResolvedValue({ id: taskId, status: "canceled" } as any);
      const result = await rejectTaskService(userId, taskId);
      expect(mockRepo.updateTask).toHaveBeenCalledWith(taskId, userId, { status: "canceled" });
      expect(result?.status).toBe("canceled");
    });
  });

  describe("project tasks and subtasks", () => {
    it("getProjectTasksService validates project and lists tasks", async () => {
      mockRepo.getProject.mockResolvedValue({ id: projectId } as any);
      mockRepo.getTasks.mockResolvedValue([{ id: "p1" }] as any);
      const result = await getProjectTasksService(projectId, userId);
      expect(result).toEqual([{ id: "p1" }]);
    });

    it("getProjectTasksService throws when project is missing", async () => {
      mockRepo.getProject.mockResolvedValue(null);
      await expect(getProjectTasksService(projectId, userId)).rejects.toThrow(/Project not found/);
    });

    it("getSubtasksService validates parent and returns subtasks", async () => {
      mockRepo.getTask.mockResolvedValue({ id: "parent" } as any);
      mockRepo.getTasks.mockResolvedValue([{ id: "child" }] as any);
      const result = await getSubtasksService(userId, "parent");
      expect(result).toEqual({ parentTask: { id: "parent" }, subtasks: [{ id: "child" }] as any });
    });

    it("getSubtasksService throws when parent is missing", async () => {
      mockRepo.getTask.mockResolvedValue(null);
      await expect(getSubtasksService(userId, "missing")).rejects.toThrow(/Parent task not found|TASK_NOT_FOUND/);
    });
  });
});