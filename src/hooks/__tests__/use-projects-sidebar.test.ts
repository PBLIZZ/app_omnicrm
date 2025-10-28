import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectsSidebar, useProjectStats, useTaskStats, useZoneInfo } from "../use-projects-sidebar";

// Mock momentum & zones hooks
vi.mock("@/hooks/use-momentum", () => ({
  useMomentum: () => ({
    projects: [
      { id: "p1", userId: "u1", name: "Proj", status: "active", createdAt: new Date(), updatedAt: new Date(), color: null, zoneId: null, dueDate: null, details: null },
    ],
    tasks: [
      { id: "t1", userId: "u1", name: "Task 1", status: "todo", priority: "high", description: null, dueDate: null, zoneUuid: null, projectId: "p1", parentTaskId: null, details: { subtasks: [{ id: "s1", status: "done" }, { id: "s2", status: "todo" }]}, createdAt: new Date(), updatedAt: new Date() },
      { id: "t2", userId: "u1", name: "Task 2", status: "done", priority: "low", description: null, dueDate: null, zoneUuid: null, projectId: "p1", parentTaskId: null, details: {}, createdAt: new Date(), updatedAt: new Date() },
    ],
  }),
}));
vi.mock("@/hooks/use-zones", () => ({
  useZones: () => ({
    zones: [{ uuidId: "z1", id: 1, userId: "u1", name: "Client Care", color: "#06B6D4", iconName: "users", createdAt: new Date(), updatedAt: new Date() }],
  }),
}));

// jsdom localStorage polyfill behavior is provided
describe("useProjectsSidebar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("computes project aggregates and persists expand state", () => {
    const { result } = renderHook(() => useProjectsSidebar());

    // Data
    expect(result.current.projectsWithTasks[0].taskCount).toBe(3); // 2 tasks + 1 subtask
    expect(result.current.projectsWithTasks[0].completedTaskCount).toBe(1);

    // Actions
    act(() => result.current.toggleProjectExpanded("p1"));
    expect(result.current.expandedProjects.has("p1")).toBe(true);
    // LocalStorage persisted
    const persisted = JSON.parse(localStorage.getItem("omnimomentum-expanded-projects")!);
    expect(persisted).toContain("p1");

    // Utilities
    expect(result.current.getProjectTasks("p1").length).toBe(2);
    expect(result.current.getTaskSubtasks("t1").length).toBe(2);
    expect(result.current.getProjectProgress("p1")).toBeGreaterThan(0);
    expect(result.current.getTaskProgress("t1")).toBeCloseTo(50);
  });

  it("utility hooks provide stats and zone info", () => {
    const { result: sidebar } = renderHook(() => useProjectsSidebar());
    const { result: projStats } = renderHook(() => useProjectStats("p1"));
    const { result: taskStats } = renderHook(() => useTaskStats("t1"));
    const { result: zoneInfo } = renderHook(() => useZoneInfo("z1"));

    expect(projStats.current.taskCount).toBeGreaterThan(0);
    expect(taskStats.current.subtaskCount).toBe(2);
    expect(zoneInfo.current.zoneName).toBe("Client Care");
  });
});