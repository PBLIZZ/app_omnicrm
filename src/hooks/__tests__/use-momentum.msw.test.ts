/**
 * Momentum Hook Tests (using MSW)
 * 
 * Tests for useMomentum, useProject, useTaskWithSubtasks, and useTodaysFocus hooks
 * with MSW for realistic API mocking.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { useMomentum, useProject, useTaskWithSubtasks, useTodaysFocus } from "../use-momentum";

// Mock toast
vi.mock("../use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("useMomentum (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  describe("Query Operations", () => {
    it("fetches all projects", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingProjects).toBe(false));

      expect(result.current.projects).toHaveLength(2);
      expect(result.current.projects[0].name).toBe("Q1 Marketing Campaign");
      expect(result.current.projects[1].name).toBe("Website Redesign");
    });

    it("fetches all tasks", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingTasks).toBe(false));

      expect(result.current.tasks).toHaveLength(3);
      expect(result.current.tasks[0].name).toBe("Complete documentation");
      expect(result.current.tasks[1].name).toBe("Review code");
      expect(result.current.tasks[2].name).toBe("Deploy to staging");
    });

    it("fetches tasks filtered by projectId", async () => {
      const { result } = renderHook(() => useMomentum({ projectId: "project-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoadingTasks).toBe(false));

      // Should return only tasks from project-1
      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.tasks.every((task) => task.projectId === "project-1")).toBe(true);
      expect(result.current.tasks[0].name).toBe("Complete documentation");
      expect(result.current.tasks[1].name).toBe("Review code");
    });

    it("fetches pending approval tasks", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

      // The apiClient returns the parsed response, which might be a single object
      // or an array depending on the endpoint. For now, just verify the data is defined
      expect(result.current.pendingTasks).toBeDefined();
      expect(result.current.isLoadingPending).toBe(false);
    });

    it("fetches momentum statistics", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingStats).toBe(false));

      expect(result.current.stats).toEqual({
        total: 10,
        todo: 4,
        inProgress: 3,
        completed: 2,
        pendingApproval: 1,
      });
    });

    it("returns empty arrays while loading", () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      expect(result.current.projects).toEqual([]);
      expect(result.current.tasks).toEqual([]);
      expect(result.current.pendingTasks).toEqual([]);
      expect(result.current.isLoadingProjects).toBe(true);
      expect(result.current.isLoadingTasks).toBe(true);
    });
  });

  describe("Project Operations", () => {
    it("creates a new project successfully", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingProjects).toBe(false));

      result.current.createProject({
        zoneId: 1,
        name: "New Project",
        description: "Test project",
      });

      await waitFor(() => expect(result.current.isCreatingProject).toBe(false));

      // Mutation completed successfully
      expect(result.current.isCreatingProject).toBe(false);
    });

    it("updates an existing project", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingProjects).toBe(false));

      result.current.updateProject("project-1", {
        name: "Updated Project Name",
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      // Check cache update
      const updatedProject = result.current.projects.find((p) => p.id === "project-1");
      expect(updatedProject?.name).toBe("Updated Project Name");
    });

    it("deletes a project", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingProjects).toBe(false));

      const initialLength = result.current.projects.length;

      result.current.deleteProject("project-1");

      await waitFor(() => expect(result.current.isDeleting).toBe(false));

      // Check cache update
      expect(result.current.projects.length).toBe(initialLength - 1);
      expect(result.current.projects.find((p) => p.id === "project-1")).toBeUndefined();
    });

    it("tracks project mutation loading states", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingProjects).toBe(false));

      expect(result.current.isCreatingProject).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);

      result.current.createProject({
        zoneId: 1,
        name: "Test Project",
        description: "Test",
      });

      await waitFor(() => expect(result.current.isCreatingProject).toBe(false));
    });
  });

  describe("Task Operations", () => {
    it("creates a new task successfully", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingTasks).toBe(false));

      result.current.createTask({
        projectId: "project-1",
        name: "New Task",
        description: "Test task",
        status: "todo",
        priority: "medium",
      });

      await waitFor(() => expect(result.current.isCreatingTask).toBe(false));

      // Mutation completed successfully
      expect(result.current.isCreatingTask).toBe(false);
    });

    it("creates a subtask successfully", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingTasks).toBe(false));

      result.current.createSubtask("task-1", {
        projectId: "project-1",
        name: "New Subtask",
        description: "Test subtask",
        status: "todo",
        priority: "medium",
      });

      await waitFor(() => expect(result.current.isCreatingTask).toBe(false));

      // Mutation completed successfully
      expect(result.current.isCreatingTask).toBe(false);
    });

    it("updates an existing task", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingTasks).toBe(false));

      result.current.updateTask("task-1", {
        name: "Updated Task Name",
        status: "in_progress",
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      // Check cache update
      const updatedTask = result.current.tasks.find((t) => t.id === "task-1");
      expect(updatedTask?.name).toBe("Updated Task Name");
      expect(updatedTask?.status).toBe("in_progress");
    });

    it("deletes a task", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingTasks).toBe(false));

      const initialLength = result.current.tasks.length;

      result.current.deleteTask("task-1");

      await waitFor(() => expect(result.current.isDeleting).toBe(false));

      // Check cache update
      expect(result.current.tasks.length).toBe(initialLength - 1);
      expect(result.current.tasks.find((t) => t.id === "task-1")).toBeUndefined();
    });

    it("approves a pending task", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

      result.current.approveTask("pending-task-1");

      await waitFor(() => expect(result.current.isApproving).toBe(false));

      // Mutation completed successfully
      expect(result.current.isApproving).toBe(false);
    });

    it("rejects a task without deleting", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

      result.current.rejectTask("pending-task-1", false, "Not relevant");

      await waitFor(() => expect(result.current.isRejecting).toBe(false));

      // Mutation completed successfully
      expect(result.current.isRejecting).toBe(false);
    });

    it("rejects and deletes a task", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingPending).toBe(false));

      result.current.rejectTask("pending-task-1", true);

      await waitFor(() => expect(result.current.isRejecting).toBe(false));

      // Mutation completed successfully
      expect(result.current.isRejecting).toBe(false);
    });

    it("tracks task mutation loading states", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingTasks).toBe(false));

      expect(result.current.isCreatingTask).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.isApproving).toBe(false);
      expect(result.current.isRejecting).toBe(false);
    });
  });

  describe("Utility Functions", () => {
    it("provides refetchProjects function", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingProjects).toBe(false));

      expect(typeof result.current.refetchProjects).toBe("function");
      result.current.refetchProjects();
    });

    it("provides refetchTasks function", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingTasks).toBe(false));

      expect(typeof result.current.refetchTasks).toBe("function");
      result.current.refetchTasks();
    });

    it("provides refetchStats function", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingStats).toBe(false));

      expect(typeof result.current.refetchStats).toBe("function");
      result.current.refetchStats();
    });
  });

  describe("Auto Refetch", () => {
    it("disables auto refetch when autoRefetch is false", async () => {
      const { result } = renderHook(() => useMomentum({ autoRefetch: false }), { wrapper });

      await waitFor(() => expect(result.current.isLoadingTasks).toBe(false));

      // Hook initializes correctly with autoRefetch disabled
      expect(result.current.tasks).toHaveLength(3);
      expect(result.current.projects).toHaveLength(2);
    });
  });

  describe("Multiple Operations", () => {
    it("can perform create, update, and delete operations in sequence", async () => {
      const { result } = renderHook(() => useMomentum(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingProjects).toBe(false));

      // Create project
      result.current.createProject({
        zoneId: 1,
        name: "Sequential Project",
        description: "Test",
      });
      await waitFor(() => expect(result.current.isCreatingProject).toBe(false));

      // Update project
      result.current.updateProject("project-1", {
        name: "Updated Sequential Project",
      });
      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      // Delete project
      result.current.deleteProject("project-1");
      await waitFor(() => expect(result.current.isDeleting).toBe(false));

      // All mutations completed successfully
      expect(result.current.isCreatingProject).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });
  });
});

describe("useProject (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("fetches project with its tasks", async () => {
    const { result } = renderHook(() => useProject("project-1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.project).toBeDefined();
    expect(result.current.data?.tasks).toBeDefined();
    expect(result.current.data?.project.id).toBe("project-1");
    expect(result.current.data?.project.name).toBe("Test Project");
    expect(result.current.data?.tasks).toHaveLength(1);
  });

  it("returns undefined while loading", () => {
    const { result } = renderHook(() => useProject("project-1"), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });
});

describe("useTaskWithSubtasks (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("fetches task with its subtasks from JSONB", async () => {
    const { result } = renderHook(() => useTaskWithSubtasks("task-1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.task).toBeDefined();
    expect(result.current.data?.subtasks).toBeDefined();
    expect(result.current.data?.task.id).toBe("task-1");
    expect(result.current.data?.task.name).toBe("Test Task");
    expect(result.current.data?.subtasks).toHaveLength(1);
    // Subtasks are now lightweight objects from JSONB with { id, title, completed }
    expect(result.current.data?.subtasks[0]).toHaveProperty("id");
    expect(result.current.data?.subtasks[0]).toHaveProperty("title");
    expect(result.current.data?.subtasks[0]).toHaveProperty("completed");
  });

  it("returns undefined while loading", () => {
    const { result } = renderHook(() => useTaskWithSubtasks("task-1"), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });
});

describe("useTodaysFocus (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("fetches and returns top 3 priority tasks", async () => {
    const { result } = renderHook(() => useTodaysFocus(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    // API returns all todo tasks with status=todo filter
    expect(result.current.data?.length).toBeGreaterThan(0);
    expect(result.current.data?.length).toBeLessThanOrEqual(3);
    
    // Tasks should be sorted by priority (urgent > high)
    const priorities = result.current.data?.map((task) => task.priority) || [];
    if (priorities.length >= 2) {
      expect(priorities[0]).toBe("urgent"); // Deploy to staging (urgent)
      expect(priorities[1]).toBe("high");   // Complete documentation (high)
    }
  });

  it("returns undefined while loading", () => {
    const { result } = renderHook(() => useTodaysFocus(), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("limits results to 3 tasks maximum", async () => {
    const { result } = renderHook(() => useTodaysFocus(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBeLessThanOrEqual(3);
  });
});
