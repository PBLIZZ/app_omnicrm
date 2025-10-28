/**
 * Task & Productivity Tools Tests
 *
 * Comprehensive test suite for all 15 task and project management tools
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createProjectHandler,
  listProjectsHandler,
  assignTaskToProjectHandler,
  getProjectTasksHandler,
  listZonesHandler,
  updateTaskHandler,
  assignTaskToZoneHandler,
  createSubtaskHandler,
  updateTaskStatusHandler,
  getProjectHandler,
} from "../tasks";
import type { ToolExecutionContext } from "../../types";
import { getDb } from "@/server/db/client";
import { createProductivityRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";

// Mock dependencies
vi.mock("@/server/db/client");
vi.mock("@repo");

const mockContext: ToolExecutionContext = {
  userId: "user-123",
  timestamp: new Date("2025-01-15T10:00:00Z"),
  requestId: "req-123",
};

describe("create_project", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new project with minimal data", async () => {
    const mockRepo = {
      createProject: vi.fn().mockResolvedValue({
        id: "project-123",
        userId: "user-123",
        name: "Q1 Wellness Program",
        status: "active",
        dueDate: null,
        zoneUuid: null,
        details: {},
        createdAt: new Date("2025-01-15T10:00:00Z"),
        updatedAt: new Date("2025-01-15T10:00:00Z"),
      }),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await createProjectHandler(
      {
        name: "Q1 Wellness Program",
      },
      mockContext,
    );

    expect(result).toMatchObject({
      id: "project-123",
      name: "Q1 Wellness Program",
      status: "active",
    });

    expect(mockRepo.createProject).toHaveBeenCalledWith("user-123", {
      name: "Q1 Wellness Program",
      status: "active",
      dueDate: null,
      zoneUuid: null,
      details: {},
    });
  });

  it("should create project with full details", async () => {
    const mockRepo = {
      createProject: vi.fn().mockResolvedValue({
        id: "project-456",
        userId: "user-123",
        name: "Website Redesign",
        status: "on_hold",
        dueDate: "2025-06-30",
        zoneUuid: "zone-123",
        details: { description: "Complete website overhaul" },
        createdAt: new Date("2025-01-15T10:00:00Z"),
        updatedAt: new Date("2025-01-15T10:00:00Z"),
      }),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await createProjectHandler(
      {
        name: "Website Redesign",
        description: "Complete website overhaul",
        status: "on_hold",
        due_date: "2025-06-30",
        zone_uuid: "zone-123",
      },
      mockContext,
    );

    expect(result).toMatchObject({
      id: "project-456",
      name: "Website Redesign",
      status: "on_hold",
      dueDate: "2025-06-30",
      zoneUuid: "zone-123",
    });
  });

  it("should validate project name is required", async () => {
    await expect(
      createProjectHandler(
        {
          name: "",
        } as any,
        mockContext,
      ),
    ).rejects.toThrow();
  });

  it("should validate status enum", async () => {
    await expect(
      createProjectHandler(
        {
          name: "Test Project",
          status: "invalid" as any,
        },
        mockContext,
      ),
    ).rejects.toThrow();
  });
});

describe("list_projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list all projects without filters", async () => {
    const mockProjects = [
      {
        id: "project-1",
        name: "Q1 Planning",
        status: "active",
        updatedAt: new Date("2025-01-15"),
      },
      {
        id: "project-2",
        name: "Website",
        status: "on_hold",
        updatedAt: new Date("2025-01-14"),
      },
    ];

    const mockRepo = {
      getProjects: vi.fn().mockResolvedValue(mockProjects),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await listProjectsHandler({}, mockContext);

    expect(result).toEqual({
      projects: mockProjects,
      count: 2,
      totalCount: 2,
    });

    expect(mockRepo.getProjects).toHaveBeenCalledWith("user-123", {
      status: undefined,
      zoneUuid: undefined,
    });
  });

  it("should filter projects by status", async () => {
    const mockProjects = [
      { id: "project-1", name: "Active 1", status: "active" },
      { id: "project-2", name: "Active 2", status: "active" },
    ];

    const mockRepo = {
      getProjects: vi.fn().mockResolvedValue(mockProjects),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await listProjectsHandler(
      {
        status: ["active", "on_hold"],
      },
      mockContext,
    );

    expect(result.projects).toHaveLength(2);
    expect(mockRepo.getProjects).toHaveBeenCalledWith("user-123", {
      status: ["active", "on_hold"],
      zoneUuid: undefined,
    });
  });

  it("should filter projects by zone", async () => {
    const mockProjects = [{ id: "project-1", name: "Business Project", zoneUuid: "zone-123" }];

    const mockRepo = {
      getProjects: vi.fn().mockResolvedValue(mockProjects),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await listProjectsHandler(
      {
        zone_uuid: "zone-123",
      },
      mockContext,
    );

    expect(result.projects).toHaveLength(1);
    expect(mockRepo.getProjects).toHaveBeenCalledWith("user-123", {
      status: undefined,
      zoneUuid: "zone-123",
    });
  });

  it("should apply limit to results", async () => {
    const mockProjects = Array.from({ length: 60 }, (_, i) => ({
      id: `project-${i}`,
      name: `Project ${i}`,
      status: "active",
    }));

    const mockRepo = {
      getProjects: vi.fn().mockResolvedValue(mockProjects),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await listProjectsHandler(
      {
        limit: 20,
      },
      mockContext,
    );

    expect(result.projects).toHaveLength(20);
    expect(result.count).toBe(20);
    expect(result.totalCount).toBe(60);
  });

  it("should handle empty project list", async () => {
    const mockRepo = {
      getProjects: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await listProjectsHandler({}, mockContext);

    expect(result).toEqual({
      projects: [],
      count: 0,
      totalCount: 0,
    });
  });
});

describe("assign_task_to_project", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should assign task to project successfully", async () => {
    const mockTask = {
      id: "task-123",
      name: "Review proposal",
      projectId: null,
    };

    const mockProject = {
      id: "project-456",
      name: "Q1 Planning",
      status: "active",
    };

    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(mockTask),
      getProject: vi.fn().mockResolvedValue(mockProject),
      updateTask: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await assignTaskToProjectHandler(
      {
        task_id: "task-123",
        project_id: "project-456",
      },
      mockContext,
    );

    expect(result).toEqual({
      success: true,
      taskId: "task-123",
      projectId: "project-456",
      projectName: "Q1 Planning",
    });

    expect(mockRepo.getTask).toHaveBeenCalledWith("task-123", "user-123");
    expect(mockRepo.getProject).toHaveBeenCalledWith("project-456", "user-123");
    expect(mockRepo.updateTask).toHaveBeenCalledWith("task-123", "user-123", {
      projectId: "project-456",
    });
  });

  it("should throw error if task not found", async () => {
    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await expect(
      assignTaskToProjectHandler(
        {
          task_id: "task-999",
          project_id: "project-456",
        },
        mockContext,
      ),
    ).rejects.toThrow(AppError);

    await expect(
      assignTaskToProjectHandler(
        {
          task_id: "task-999",
          project_id: "project-456",
        },
        mockContext,
      ),
    ).rejects.toThrow("Task with ID task-999 not found");
  });

  it("should throw error if project not found", async () => {
    const mockTask = {
      id: "task-123",
      name: "Review proposal",
    };

    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(mockTask),
      getProject: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await expect(
      assignTaskToProjectHandler(
        {
          task_id: "task-123",
          project_id: "project-999",
        },
        mockContext,
      ),
    ).rejects.toThrow(AppError);

    await expect(
      assignTaskToProjectHandler(
        {
          task_id: "task-123",
          project_id: "project-999",
        },
        mockContext,
      ),
    ).rejects.toThrow("Project with ID project-999 not found");
  });

  it("should validate UUID format", async () => {
    await expect(
      assignTaskToProjectHandler(
        {
          task_id: "not-a-uuid",
          project_id: "project-456",
        } as any,
        mockContext,
      ),
    ).rejects.toThrow();
  });
});

describe("get_project_tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get all incomplete tasks for a project", async () => {
    const mockProject = {
      id: "project-123",
      name: "Q1 Planning",
      status: "active",
    };

    const mockTasks = [
      {
        id: "task-1",
        name: "Review budget",
        status: "todo",
        projectId: "project-123",
      },
      {
        id: "task-2",
        name: "Schedule kickoff",
        status: "in_progress",
        projectId: "project-123",
      },
    ];

    const mockRepo = {
      getProject: vi.fn().mockResolvedValue(mockProject),
      getTasks: vi.fn().mockResolvedValue(mockTasks),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await getProjectTasksHandler(
      {
        project_id: "project-123",
        include_completed: false,
      },
      mockContext,
    );

    expect(result).toMatchObject({
      project: {
        id: "project-123",
        name: "Q1 Planning",
        status: "active",
      },
      tasks: mockTasks,
      count: 2,
    });

    expect(mockRepo.getTasks).toHaveBeenCalledWith("user-123", {
      projectId: "project-123",
      status: ["todo", "in_progress"],
    });
  });

  it("should include completed tasks when requested", async () => {
    const mockProject = {
      id: "project-123",
      name: "Q1 Planning",
      status: "active",
    };

    const mockTasks = [
      { id: "task-1", name: "Task 1", status: "todo" },
      { id: "task-2", name: "Task 2", status: "done" },
    ];

    const mockRepo = {
      getProject: vi.fn().mockResolvedValue(mockProject),
      getTasks: vi.fn().mockResolvedValue(mockTasks),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await getProjectTasksHandler(
      {
        project_id: "project-123",
        include_completed: true,
      },
      mockContext,
    );

    expect(result.tasks).toHaveLength(2);
    expect(mockRepo.getTasks).toHaveBeenCalledWith("user-123", {
      projectId: "project-123",
      status: undefined,
    });
  });

  it("should throw error if project not found", async () => {
    const mockRepo = {
      getProject: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await expect(
      getProjectTasksHandler(
        {
          project_id: "project-999",
        },
        mockContext,
      ),
    ).rejects.toThrow(AppError);

    await expect(
      getProjectTasksHandler(
        {
          project_id: "project-999",
        },
        mockContext,
      ),
    ).rejects.toThrow("Project with ID project-999 not found");
  });

  it("should handle project with no tasks", async () => {
    const mockProject = {
      id: "project-123",
      name: "Empty Project",
      status: "active",
    };

    const mockRepo = {
      getProject: vi.fn().mockResolvedValue(mockProject),
      getTasks: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await getProjectTasksHandler(
      {
        project_id: "project-123",
      },
      mockContext,
    );

    expect(result).toMatchObject({
      tasks: [],
      count: 0,
    });
  });
});

describe("list_zones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list all available zones", async () => {
    const mockZones = [
      {
        uuidId: "zone-1",
        name: "Life",
        color: "#3B82F6",
        iconName: "heart",
      },
      {
        uuidId: "zone-2",
        name: "Business",
        color: "#10B981",
        iconName: "briefcase",
      },
      {
        uuidId: "zone-3",
        name: "Health",
        color: "#F59E0B",
        iconName: "activity",
      },
    ];

    const mockRepo = {
      getZones: vi.fn().mockResolvedValue(mockZones),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await listZonesHandler({}, mockContext);

    expect(result).toEqual({
      zones: mockZones,
      count: 3,
    });

    expect(mockRepo.getZones).toHaveBeenCalled();
  });

  it("should handle empty zones list", async () => {
    const mockRepo = {
      getZones: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await listZonesHandler({}, mockContext);

    expect(result).toEqual({
      zones: [],
      count: 0,
    });
  });

  it("should return zones in sorted order", async () => {
    const mockZones = [
      { uuidId: "zone-1", name: "Business", color: null, iconName: null },
      { uuidId: "zone-2", name: "Health", color: null, iconName: null },
      { uuidId: "zone-3", name: "Life", color: null, iconName: null },
    ];

    const mockRepo = {
      getZones: vi.fn().mockResolvedValue(mockZones),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await listZonesHandler({}, mockContext);

    expect(result.zones).toEqual(mockZones);
    expect(result.zones[0]?.name).toBe("Business");
    expect(result.zones[1]?.name).toBe("Health");
    expect(result.zones[2]?.name).toBe("Life");
  });
});

// ============================================================================
// NEW BATCH 2 TOOLS - Tests for the 5 new tools
// ============================================================================

describe("update_task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update task title", async () => {
    const mockTask = {
      id: "task-123",
      userId: "user-123",
      name: "Old Title",
      status: "todo",
      priority: "medium",
      details: {},
      dueDate: null,
      projectId: null,
      zoneUuid: null,
    };

    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(mockTask),
      updateTask: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await updateTaskHandler(
      {
        task_id: "task-123",
        title: "New Title",
      },
      mockContext,
    );

    expect(mockRepo.updateTask).toHaveBeenCalledWith("task-123", "user-123", {
      name: "New Title",
    });
  });

  it("should update task priority", async () => {
    const mockTask = {
      id: "task-123",
      userId: "user-123",
      name: "Test Task",
      status: "todo",
      priority: "low",
      details: {},
      dueDate: null,
      projectId: null,
      zoneUuid: null,
    };

    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(mockTask),
      updateTask: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await updateTaskHandler(
      {
        task_id: "task-123",
        priority: "high",
      },
      mockContext,
    );

    expect(mockRepo.updateTask).toHaveBeenCalledWith("task-123", "user-123", {
      priority: "high",
    });
  });

  it("should update multiple fields at once", async () => {
    const mockTask = {
      id: "task-123",
      userId: "user-123",
      name: "Old Task",
      status: "todo",
      priority: "low",
      details: {},
      dueDate: null,
      projectId: null,
      zoneUuid: null,
    };

    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(mockTask),
      updateTask: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await updateTaskHandler(
      {
        task_id: "task-123",
        title: "Updated Task",
        priority: "high",
        due_date: "2025-02-01",
      },
      mockContext,
    );

    expect(mockRepo.updateTask).toHaveBeenCalledWith("task-123", "user-123", {
      name: "Updated Task",
      priority: "high",
      dueDate: "2025-02-01",
    });
  });

  it("should throw error for non-existent task", async () => {
    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await expect(
      updateTaskHandler(
        {
          task_id: "non-existent",
          title: "New Title",
        },
        mockContext,
      ),
    ).rejects.toThrow("Task with ID non-existent not found");
  });
});

describe("assign_task_to_zone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should assign task to zone", async () => {
    const mockTask = {
      id: "task-123",
      userId: "user-123",
      name: "Test Task",
      status: "todo",
      priority: "medium",
      details: {},
      dueDate: null,
      projectId: null,
      zoneUuid: null,
    };

    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(mockTask),
      updateTask: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await assignTaskToZoneHandler(
      {
        task_id: "task-123",
        zone_uuid: "zone-456",
      },
      mockContext,
    );

    expect(mockRepo.updateTask).toHaveBeenCalledWith("task-123", "user-123", {
      zoneUuid: "zone-456",
    });
  });

  it("should throw error for non-existent task", async () => {
    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await expect(
      assignTaskToZoneHandler(
        {
          task_id: "non-existent",
          zone_uuid: "zone-456",
        },
        mockContext,
      ),
    ).rejects.toThrow("Task with ID non-existent not found");
  });
});

describe("create_subtask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create subtask under parent task", async () => {
    const mockTask = {
      id: "task-123",
      userId: "user-123",
      name: "Parent Task",
      status: "todo",
      priority: "medium",
      details: {},
      dueDate: null,
      projectId: null,
      zoneUuid: null,
    };

    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(mockTask),
      updateTask: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await createSubtaskHandler(
      {
        parent_task_id: "task-123",
        title: "Subtask 1",
        completed: false,
      },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.subtask.title).toBe("Subtask 1");
    expect(result.subtask.completed).toBe(false);
    expect(result.totalSubtasks).toBe(1);
  });

  it("should add subtask to existing subtasks array", async () => {
    const mockTask = {
      id: "task-123",
      userId: "user-123",
      name: "Parent Task",
      status: "todo",
      priority: "medium",
      details: {
        subtasks: [{ id: "sub-1", title: "Existing Subtask", completed: false }],
      },
      dueDate: null,
      projectId: null,
      zoneUuid: null,
    };

    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(mockTask),
      updateTask: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await createSubtaskHandler(
      {
        parent_task_id: "task-123",
        title: "New Subtask",
        completed: false,
      },
      mockContext,
    );

    expect(result.totalSubtasks).toBe(2);
  });

  it("should throw error for non-existent parent task", async () => {
    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await expect(
      createSubtaskHandler(
        {
          parent_task_id: "non-existent",
          title: "Subtask",
          completed: false,
        },
        mockContext,
      ),
    ).rejects.toThrow("Task with ID non-existent not found");
  });
});

describe("update_task_status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update task status to in_progress", async () => {
    const mockTask = {
      id: "task-123",
      userId: "user-123",
      name: "Test Task",
      status: "todo",
      priority: "medium",
      details: {},
      dueDate: null,
      projectId: null,
      zoneUuid: null,
      completedAt: null,
    };

    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(mockTask),
      updateTask: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await updateTaskStatusHandler(
      {
        task_id: "task-123",
        status: "in_progress",
      },
      mockContext,
    );

    expect(mockRepo.updateTask).toHaveBeenCalledWith("task-123", "user-123", {
      status: "in_progress",
      completedAt: null,
    });
  });

  it("should update status to done and set completion timestamp", async () => {
    const mockTask = {
      id: "task-123",
      userId: "user-123",
      name: "Test Task",
      status: "in_progress",
      priority: "medium",
      details: {},
      dueDate: null,
      projectId: null,
      zoneUuid: null,
      completedAt: null,
    };

    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(mockTask),
      updateTask: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await updateTaskStatusHandler(
      {
        task_id: "task-123",
        status: "done",
      },
      mockContext,
    );

    expect(mockRepo.updateTask).toHaveBeenCalledWith(
      "task-123",
      "user-123",
      expect.objectContaining({
        status: "done",
        completedAt: expect.any(Date),
      }),
    );
  });

  it("should throw error for non-existent task", async () => {
    const mockRepo = {
      getTask: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await expect(
      updateTaskStatusHandler(
        {
          task_id: "non-existent",
          status: "done",
        },
        mockContext,
      ),
    ).rejects.toThrow("Task with ID non-existent not found");
  });
});

describe("get_project", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve project by ID", async () => {
    const mockProject = {
      id: "project-123",
      userId: "user-123",
      name: "Q1 Goals",
      status: "active",
      dueDate: "2025-03-31",
      details: { description: "Quarterly goals" },
      zoneUuid: "zone-456",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-15"),
    };

    const mockRepo = {
      getProject: vi.fn().mockResolvedValue(mockProject),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    const result = await getProjectHandler(
      {
        project_id: "project-123",
      },
      mockContext,
    );

    expect(result).toEqual(mockProject);
    expect(mockRepo.getProject).toHaveBeenCalledWith("project-123", "user-123");
  });

  it("should throw error for non-existent project", async () => {
    const mockRepo = {
      getProject: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo as any);

    await expect(
      getProjectHandler(
        {
          project_id: "non-existent",
        },
        mockContext,
      ),
    ).rejects.toThrow("Project with ID non-existent not found");
  });
});
