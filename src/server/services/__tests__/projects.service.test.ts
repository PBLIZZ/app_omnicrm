import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createProjectService,
  getProjectService,
  listProjectsService,
  updateProjectService,
  deleteProjectService,
} from "../projects.service";
import { createProductivityRepository } from "@repo";
import * as dbClient from "@/server/db/client";

vi.mock("@repo");
vi.mock("@/server/db/client");

describe("ProjectsService", () => {
  const userId = "user-1";
  const projectId = "project-1";
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      createProject: vi.fn(),
      getProject: vi.fn(),
      getProjects: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
    };
    vi.mocked(dbClient.getDb).mockResolvedValue({} as any);
    vi.mocked(createProductivityRepository).mockReturnValue(mockRepo);
  });

  it("createProjectService normalizes details and sets defaults", async () => {
    const created = { id: projectId, name: "P" } as any;
    mockRepo.createProject.mockResolvedValue(created);

    const result = await createProjectService(userId, { name: "P", details: "x" as any });

    expect(mockRepo.createProject).toHaveBeenCalledWith(userId, {
      name: "P",
      zoneId: null,
      dueDate: null,
      details: {},
      status: "active",
    });
    expect(result).toBe(created);
  });

  it("createProjectService respects provided fields", async () => {
    const created = { id: projectId, status: "completed" } as any;
    mockRepo.createProject.mockResolvedValue(created);

    const due = new Date("2024-02-01T00:00:00Z");
    const result = await createProjectService(userId, {
      name: "P",
      zoneId: 5,
      dueDate: due,
      details: { a: 1 },
      status: "completed",
    });

    expect(mockRepo.createProject).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        zoneId: 5,
        dueDate: due.toISOString(),
        details: { a: 1 },
        status: "completed",
      }),
    );
    expect(result).toBe(created);
  });

  it("getProjectService delegates", async () => {
    const proj = { id: projectId } as any;
    mockRepo.getProject.mockResolvedValue(proj);
    const result = await getProjectService(userId, projectId);
    expect(result).toBe(proj);
  });

  it("listProjectsService delegates with filters", async () => {
    const rows = [{ id: projectId }] as any;
    mockRepo.getProjects.mockResolvedValue(rows);
    const result = await listProjectsService(userId, { zoneId: 1, status: ["active"] });
    expect(mockRepo.getProjects).toHaveBeenCalledWith(userId, { zoneId: 1, status: ["active"] });
    expect(result).toBe(rows);
  });

  it("updateProjectService sanitizes details and filters undefined", async () => {
    mockRepo.updateProject.mockResolvedValue(undefined);
    mockRepo.getProject.mockResolvedValue({ id: projectId } as any);

    await updateProjectService(projectId, userId, {
      name: "N",
      details: { nested: { k: "v" } },
      status: undefined,
    });

    const call = vi.mocked(mockRepo.updateProject).mock.calls[0][2];
    expect(call.name).toBe("N");
    expect("status" in call).toBe(false);
    expect(call.details).toBeDefined();
  });

  it("deleteProjectService delegates", async () => {
    mockRepo.deleteProject.mockResolvedValue(undefined);
    await deleteProjectService(userId, projectId);
    expect(mockRepo.deleteProject).toHaveBeenCalledWith(projectId, userId);
  });
});