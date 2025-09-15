import { describe, it, expect, vi, beforeEach } from "vitest";
import { MomentumStorage, momentumStorage } from "./momentum.storage";
import type {
  MomentumWorkspace,
  NewMomentumWorkspace,
  MomentumProject,
  NewMomentumProject,
  Momentum,
  NewMomentum,
  MomentumAction,
  NewMomentumAction,
  Contact,
} from "@/server/db/schema";

// Mock the database client
vi.mock("@/server/db/client", () => {
  let mockWorkspaces: MomentumWorkspace[] = [];
  let mockProjects: MomentumProject[] = [];
  let mockMomentums: Momentum[] = [];
  let mockActions: MomentumAction[] = [];
  let mockContacts: Contact[] = [];

  const createMockInsertResponse = (data: any) => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [{ id: `${data.type || "item"}-${Date.now()}`, ...data }]),
    })),
  });

  const createMockSelectResponse = (dataType: string) => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(async () => {
          switch (dataType) {
            case "workspaces":
              return mockWorkspaces;
            case "projects":
              return mockProjects;
            case "momentums":
              return mockMomentums;
            case "actions":
              return mockActions;
            case "contacts":
              return mockContacts;
            default:
              return [];
          }
        }),
        limit: vi.fn(async () => {
          switch (dataType) {
            case "workspaces":
              return mockWorkspaces.slice(0, 1);
            case "projects":
              return mockProjects.slice(0, 1);
            case "momentums":
              return mockMomentums.slice(0, 1);
            case "contacts":
              return mockContacts.slice(0, 1);
            default:
              return [];
          }
        }),
      })),
      orderBy: vi.fn(() => ({
        limit: vi.fn(async () => {
          switch (dataType) {
            case "actions":
              return mockActions;
            default:
              return [];
          }
        }),
      })),
    })),
  });

  const mockDb = {
    insert: vi.fn((table) => {
      const tableName = table._.name;
      return createMockInsertResponse({ type: tableName });
    }),
    select: vi.fn(() => createMockSelectResponse("workspaces")), // Default to workspaces
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => {}),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async () => {}),
    })),
  };

  return {
    getDb: vi.fn(async () => mockDb),
    __setMockWorkspaces: (workspaces: MomentumWorkspace[]) => {
      mockWorkspaces = workspaces;
    },
    __setMockProjects: (projects: MomentumProject[]) => {
      mockProjects = projects;
    },
    __setMockMomentums: (momentums: Momentum[]) => {
      mockMomentums = momentums;
    },
    __setMockActions: (actions: MomentumAction[]) => {
      mockActions = actions;
    },
    __setMockContacts: (contacts: Contact[]) => {
      mockContacts = contacts;
    },
    __clearMockData: () => {
      mockWorkspaces = [];
      mockProjects = [];
      mockMomentums = [];
      mockActions = [];
      mockContacts = [];
    },
  };
});

describe("MomentumStorage", () => {
  const userId = "user-123";
  let storage: MomentumStorage;

  const {
    __setMockWorkspaces,
    __setMockProjects,
    __setMockMomentums,
    __setMockActions,
    __setMockContacts,
    __clearMockData,
  } = require("@/server/db/client");

  beforeEach(() => {
    vi.clearAllMocks();
    __clearMockData();
    storage = new MomentumStorage();
  });

  describe("Momentum Workspaces", () => {
    it("creates a momentum workspace successfully", async () => {
      const workspaceData: Omit<NewMomentumWorkspace, "userId"> = {
        name: "Test Workspace",
        description: "A workspace for testing",
        color: "#6366f1",
        isDefault: true,
      };

      const result = await storage.createMomentumWorkspace(userId, workspaceData);

      expect(result).toBeDefined();
      expect(result.name).toBe("Test Workspace");
      expect(result.description).toBe("A workspace for testing");
      expect(result.color).toBe("#6366f1");
      expect(result.isDefault).toBe(true);
    });

    it("gets all momentum workspaces for user", async () => {
      const mockWorkspaces: MomentumWorkspace[] = [
        {
          id: "workspace-1",
          userId,
          name: "Personal",
          description: "Personal tasks",
          color: "#6366f1",
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "workspace-2",
          userId,
          name: "Work",
          description: "Work tasks",
          color: "#10b981",
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      __setMockWorkspaces(mockWorkspaces);

      const result = await storage.getMomentumWorkspaces(userId);

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Personal");
      expect(result[1]?.name).toBe("Work");
    });

    it("gets a specific momentum workspace", async () => {
      const mockWorkspace: MomentumWorkspace = {
        id: "workspace-123",
        userId,
        name: "Test Workspace",
        description: "Test description",
        color: "#6366f1",
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      __setMockWorkspaces([mockWorkspace]);

      const result = await storage.getMomentumWorkspace("workspace-123", userId);

      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Workspace");
    });

    it("returns null when workspace not found", async () => {
      __setMockWorkspaces([]);

      const result = await storage.getMomentumWorkspace("non-existent", userId);

      expect(result).toBeNull();
    });

    it("updates a momentum workspace", async () => {
      const updateData = {
        name: "Updated Workspace",
        description: "Updated description",
      };

      await expect(
        storage.updateMomentumWorkspace("workspace-123", userId, updateData),
      ).resolves.not.toThrow();
    });

    it("deletes a momentum workspace", async () => {
      await expect(storage.deleteMomentumWorkspace("workspace-123", userId)).resolves.not.toThrow();
    });
  });

  describe("Momentum Projects", () => {
    it("creates a momentum project successfully", async () => {
      const projectData: Omit<NewMomentumProject, "userId"> = {
        momentumWorkspaceId: "workspace-123",
        name: "Test Project",
        description: "A project for testing",
        color: "#10b981",
        status: "active",
        dueDate: new Date("2024-12-31"),
      };

      const result = await storage.createMomentumProject(userId, projectData);

      expect(result).toBeDefined();
      expect(result.name).toBe("Test Project");
      expect(result.status).toBe("active");
    });

    it("gets all momentum projects for user", async () => {
      const mockProjects: MomentumProject[] = [
        {
          id: "project-1",
          userId,
          momentumWorkspaceId: "workspace-123",
          name: "Project 1",
          description: "First project",
          color: "#10b981",
          status: "active",
          dueDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      __setMockProjects(mockProjects);

      const result = await storage.getMomentumProjects(userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Project 1");
    });

    it("gets projects filtered by workspace", async () => {
      const mockProjects: MomentumProject[] = [
        {
          id: "project-1",
          userId,
          momentumWorkspaceId: "workspace-123",
          name: "Workspace Project",
          description: "Project in specific workspace",
          color: "#10b981",
          status: "active",
          dueDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      __setMockProjects(mockProjects);

      const result = await storage.getMomentumProjects(userId, "workspace-123");

      expect(result).toHaveLength(1);
      expect(result[0]?.momentumWorkspaceId).toBe("workspace-123");
    });

    it("gets a specific momentum project", async () => {
      const mockProject: MomentumProject = {
        id: "project-123",
        userId,
        momentumWorkspaceId: "workspace-123",
        name: "Test Project",
        description: "Test description",
        color: "#10b981",
        status: "active",
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      __setMockProjects([mockProject]);

      const result = await storage.getMomentumProject("project-123", userId);

      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Project");
    });

    it("updates a momentum project", async () => {
      const updateData = {
        name: "Updated Project",
        status: "completed" as const,
      };

      await expect(
        storage.updateMomentumProject("project-123", userId, updateData),
      ).resolves.not.toThrow();
    });

    it("deletes a momentum project", async () => {
      await expect(storage.deleteMomentumProject("project-123", userId)).resolves.not.toThrow();
    });
  });

  describe("Momentums", () => {
    it("creates a momentum successfully", async () => {
      const momentumData: Omit<NewMomentum, "userId"> = {
        momentumWorkspaceId: "workspace-123",
        momentumProjectId: "project-123",
        title: "Test Momentum",
        description: "A momentum for testing",
        status: "todo",
        priority: "medium",
        assignee: "user",
        source: "user",
        approvalStatus: "approved",
        taggedContacts: ["contact-1", "contact-2"],
        dueDate: new Date("2024-06-30"),
        estimatedMinutes: 120,
      };

      const result = await storage.createMomentum(userId, momentumData);

      expect(result).toBeDefined();
      expect(result.title).toBe("Test Momentum");
      expect(result.status).toBe("todo");
      expect(result.priority).toBe("medium");
    });

    it("gets all momentums for user", async () => {
      const mockMomentums: Momentum[] = [
        {
          id: "momentum-1",
          userId,
          momentumWorkspaceId: "workspace-123",
          momentumProjectId: "project-123",
          parentMomentumId: null,
          title: "First Momentum",
          description: "First test momentum",
          status: "todo",
          priority: "medium",
          assignee: "user",
          source: "user",
          approvalStatus: "approved",
          taggedContacts: null,
          dueDate: null,
          completedAt: null,
          estimatedMinutes: null,
          actualMinutes: null,
          aiContext: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      __setMockMomentums(mockMomentums);

      const result = await storage.getMomentums(userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("First Momentum");
    });

    it("gets momentums with filters", async () => {
      const filters = {
        workspaceId: "workspace-123",
        status: "todo",
        assignee: "user",
        approvalStatus: "approved",
      };

      const result = await storage.getMomentums(userId, filters);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("gets momentums with parent filter", async () => {
      // Test filtering by parent momentum ID
      const filters = {
        parentMomentumId: "parent-123",
      };

      const result = await storage.getMomentums(userId, filters);

      expect(result).toBeDefined();
    });

    it("gets momentums with null parent filter", async () => {
      // Test filtering by null parent (top-level momentums)
      const filters = {
        parentMomentumId: null,
      };

      const result = await storage.getMomentums(userId, filters);

      expect(result).toBeDefined();
    });

    it("gets a specific momentum", async () => {
      const mockMomentum: Momentum = {
        id: "momentum-123",
        userId,
        momentumWorkspaceId: "workspace-123",
        momentumProjectId: null,
        parentMomentumId: null,
        title: "Test Momentum",
        description: "Test description",
        status: "todo",
        priority: "high",
        assignee: "user",
        source: "user",
        approvalStatus: "approved",
        taggedContacts: null,
        dueDate: null,
        completedAt: null,
        estimatedMinutes: 60,
        actualMinutes: null,
        aiContext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      __setMockMomentums([mockMomentum]);

      const result = await storage.getMomentum("momentum-123", userId);

      expect(result).toBeDefined();
      expect(result?.title).toBe("Test Momentum");
    });

    it("updates a momentum", async () => {
      const updateData = {
        status: "in_progress" as const,
        actualMinutes: 45,
      };

      await expect(
        storage.updateMomentum("momentum-123", userId, updateData),
      ).resolves.not.toThrow();
    });

    it("deletes a momentum", async () => {
      await expect(storage.deleteMomentum("momentum-123", userId)).resolves.not.toThrow();
    });

    it("gets sub-momentums", async () => {
      const mockSubMomentums: Momentum[] = [
        {
          id: "sub-momentum-1",
          userId,
          momentumWorkspaceId: "workspace-123",
          momentumProjectId: null,
          parentMomentumId: "parent-123",
          title: "Sub Momentum 1",
          description: "First sub momentum",
          status: "todo",
          priority: "low",
          assignee: "user",
          source: "user",
          approvalStatus: "approved",
          taggedContacts: null,
          dueDate: null,
          completedAt: null,
          estimatedMinutes: null,
          actualMinutes: null,
          aiContext: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      __setMockMomentums(mockSubMomentums);

      const result = await storage.getSubMomentums("parent-123", userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.parentMomentumId).toBe("parent-123");
    });

    it("gets pending approval momentums", async () => {
      const mockPendingMomentums: Momentum[] = [
        {
          id: "pending-momentum-1",
          userId,
          momentumWorkspaceId: "workspace-123",
          momentumProjectId: null,
          parentMomentumId: null,
          title: "Pending Momentum",
          description: "AI generated momentum awaiting approval",
          status: "todo",
          priority: "medium",
          assignee: "ai",
          source: "ai_generated",
          approvalStatus: "pending_approval",
          taggedContacts: null,
          dueDate: null,
          completedAt: null,
          estimatedMinutes: null,
          actualMinutes: null,
          aiContext: { reasoning: "Generated based on contact interaction patterns" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      __setMockMomentums(mockPendingMomentums);

      const result = await storage.getPendingApprovalMomentums(userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.approvalStatus).toBe("pending_approval");
    });

    it("gets momentums with tagged contacts", async () => {
      const mockMomentums: Momentum[] = [
        {
          id: "momentum-with-contacts",
          userId,
          momentumWorkspaceId: "workspace-123",
          momentumProjectId: null,
          parentMomentumId: null,
          title: "Momentum with Contacts",
          description: "Has tagged contacts",
          status: "todo",
          priority: "medium",
          assignee: "user",
          source: "user",
          approvalStatus: "approved",
          taggedContacts: ["contact-1", "contact-2"],
          dueDate: null,
          completedAt: null,
          estimatedMinutes: null,
          actualMinutes: null,
          aiContext: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockContacts: Contact[] = [
        {
          id: "contact-1",
          userId,
          displayName: "John Doe",
          primaryEmail: "john@example.com",
          primaryPhone: null,
          source: "manual",
          stage: "New Client",
          tags: null,
          confidenceScore: null,
          slug: "john-doe",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "contact-2",
          userId,
          displayName: "Jane Smith",
          primaryEmail: "jane@example.com",
          primaryPhone: null,
          source: "manual",
          stage: "Core Client",
          tags: null,
          confidenceScore: null,
          slug: "jane-smith",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      __setMockMomentums(mockMomentums);
      __setMockContacts(mockContacts);

      const result = await storage.getMomentumsWithContacts(userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.taggedContactsData).toBeDefined();
    });

    it("handles momentums with no tagged contacts", async () => {
      const mockMomentums: Momentum[] = [
        {
          id: "momentum-no-contacts",
          userId,
          momentumWorkspaceId: "workspace-123",
          momentumProjectId: null,
          parentMomentumId: null,
          title: "Momentum without Contacts",
          description: "No tagged contacts",
          status: "todo",
          priority: "medium",
          assignee: "user",
          source: "user",
          approvalStatus: "approved",
          taggedContacts: null,
          dueDate: null,
          completedAt: null,
          estimatedMinutes: null,
          actualMinutes: null,
          aiContext: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      __setMockMomentums(mockMomentums);

      const result = await storage.getMomentumsWithContacts(userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.taggedContactsData).toEqual([]);
    });
  });

  describe("Momentum Actions", () => {
    it("creates a momentum action successfully", async () => {
      const actionData: Omit<NewMomentumAction, "userId"> = {
        momentumId: "momentum-123",
        action: "approved",
        previousData: { approvalStatus: "pending_approval" },
        newData: { approvalStatus: "approved" },
        notes: "Looks good to proceed",
      };

      const result = await storage.createMomentumAction(userId, actionData);

      expect(result).toBeDefined();
      expect(result.action).toBe("approved");
      expect(result.notes).toBe("Looks good to proceed");
    });

    it("gets momentum actions for a specific momentum", async () => {
      const mockActions: MomentumAction[] = [
        {
          id: "action-1",
          userId,
          momentumId: "momentum-123",
          action: "approved",
          previousData: { approvalStatus: "pending_approval" },
          newData: { approvalStatus: "approved" },
          notes: "Approved by user",
          createdAt: new Date(),
        },
      ];

      __setMockActions(mockActions);

      const result = await storage.getMomentumActions("momentum-123", userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.action).toBe("approved");
    });

    it("gets user momentum actions with limit", async () => {
      const mockActions: MomentumAction[] = [
        {
          id: "action-1",
          userId,
          momentumId: "momentum-123",
          action: "approved",
          previousData: null,
          newData: null,
          notes: null,
          createdAt: new Date(),
        },
      ];

      __setMockActions(mockActions);

      const result = await storage.getUserMomentumActions(userId, 10);

      expect(result).toHaveLength(1);
    });

    it("gets all user momentum actions without limit", async () => {
      const mockActions: MomentumAction[] = [
        {
          id: "action-1",
          userId,
          momentumId: "momentum-123",
          action: "approved",
          previousData: null,
          newData: null,
          notes: null,
          createdAt: new Date(),
        },
      ];

      __setMockActions(mockActions);

      const result = await storage.getUserMomentumActions(userId);

      expect(result).toHaveLength(1);
    });
  });

  describe("Bulk Operations", () => {
    it("approves a momentum and creates action record", async () => {
      const mockMomentum: Momentum = {
        id: "momentum-123",
        userId,
        momentumWorkspaceId: "workspace-123",
        momentumProjectId: null,
        parentMomentumId: null,
        title: "Test Momentum",
        description: "Test description",
        status: "todo",
        priority: "medium",
        assignee: "ai",
        source: "ai_generated",
        approvalStatus: "pending_approval",
        taggedContacts: null,
        dueDate: null,
        completedAt: null,
        estimatedMinutes: null,
        actualMinutes: null,
        aiContext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      __setMockMomentums([mockMomentum]);

      await expect(
        storage.approveMomentum("momentum-123", userId, "Approved via test"),
      ).resolves.not.toThrow();
    });

    it("rejects a momentum and creates action record", async () => {
      const mockMomentum: Momentum = {
        id: "momentum-123",
        userId,
        momentumWorkspaceId: "workspace-123",
        momentumProjectId: null,
        parentMomentumId: null,
        title: "Test Momentum",
        description: "Test description",
        status: "todo",
        priority: "medium",
        assignee: "ai",
        source: "ai_generated",
        approvalStatus: "pending_approval",
        taggedContacts: null,
        dueDate: null,
        completedAt: null,
        estimatedMinutes: null,
        actualMinutes: null,
        aiContext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      __setMockMomentums([mockMomentum]);

      await expect(
        storage.rejectMomentum("momentum-123", userId, "Not relevant"),
      ).resolves.not.toThrow();
    });

    it("bulk approves multiple momentums", async () => {
      const momentumIds = ["momentum-1", "momentum-2", "momentum-3"];

      // Mock getMomentum to return a momentum for each ID
      const mockMomentum: Momentum = {
        id: "momentum-123",
        userId,
        momentumWorkspaceId: "workspace-123",
        momentumProjectId: null,
        parentMomentumId: null,
        title: "Test Momentum",
        description: "Test description",
        status: "todo",
        priority: "medium",
        assignee: "ai",
        source: "ai_generated",
        approvalStatus: "pending_approval",
        taggedContacts: null,
        dueDate: null,
        completedAt: null,
        estimatedMinutes: null,
        actualMinutes: null,
        aiContext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      __setMockMomentums([mockMomentum]);

      await expect(storage.bulkApproveMomentums(momentumIds, userId)).resolves.not.toThrow();
    });

    it("bulk rejects multiple momentums", async () => {
      const momentumIds = ["momentum-1", "momentum-2", "momentum-3"];

      const mockMomentum: Momentum = {
        id: "momentum-123",
        userId,
        momentumWorkspaceId: "workspace-123",
        momentumProjectId: null,
        parentMomentumId: null,
        title: "Test Momentum",
        description: "Test description",
        status: "todo",
        priority: "medium",
        assignee: "ai",
        source: "ai_generated",
        approvalStatus: "pending_approval",
        taggedContacts: null,
        dueDate: null,
        completedAt: null,
        estimatedMinutes: null,
        actualMinutes: null,
        aiContext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      __setMockMomentums([mockMomentum]);

      await expect(storage.bulkRejectMomentums(momentumIds, userId)).resolves.not.toThrow();
    });

    it("handles approval when momentum not found", async () => {
      __setMockMomentums([]); // No momentum found

      await expect(storage.approveMomentum("non-existent", userId)).resolves.not.toThrow();
    });

    it("handles rejection when momentum not found", async () => {
      __setMockMomentums([]); // No momentum found

      await expect(storage.rejectMomentum("non-existent", userId)).resolves.not.toThrow();
    });
  });

  describe("Legacy Compatibility Methods", () => {
    it("createWorkspace calls createMomentumWorkspace", async () => {
      const workspaceData: Omit<NewMomentumWorkspace, "userId"> = {
        name: "Legacy Workspace",
        description: "Testing legacy compatibility",
      };

      const result = await storage.createWorkspace(userId, workspaceData);

      expect(result).toBeDefined();
      expect(result.name).toBe("Legacy Workspace");
    });

    it("createTask calls createMomentum", async () => {
      const taskData: Omit<NewMomentum, "userId"> = {
        title: "Legacy Task",
        description: "Testing legacy compatibility",
        status: "todo",
        priority: "medium",
        assignee: "user",
        source: "user",
        approvalStatus: "approved",
      };

      const result = await storage.createTask(userId, taskData);

      expect(result).toBeDefined();
      expect(result.title).toBe("Legacy Task");
    });

    it("getTasks with parentTaskId filter", async () => {
      const filters = {
        parentTaskId: "parent-123",
      };

      const result = await storage.getTasks(userId, filters);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("createTaskAction with taskId mapping", async () => {
      const actionData = {
        taskId: "task-123", // Legacy field name
        action: "completed",
        notes: "Task completed successfully",
      } as any;

      const result = await storage.createTaskAction(userId, actionData);

      expect(result).toBeDefined();
      expect(result.action).toBe("completed");
    });

    it("supports all legacy method aliases", async () => {
      // Test that all legacy methods exist and are callable
      expect(typeof storage.getWorkspaces).toBe("function");
      expect(typeof storage.getProjects).toBe("function");
      expect(typeof storage.getTasks).toBe("function");
      expect(typeof storage.approveTask).toBe("function");
      expect(typeof storage.rejectTask).toBe("function");
      expect(typeof storage.bulkApprove).toBe("function");
      expect(typeof storage.bulkReject).toBe("function");
    });
  });

  describe("Error Handling", () => {
    it("handles database errors gracefully", async () => {
      const { getDb } = require("@/server/db/client");
      getDb.mockRejectedValueOnce(new Error("Database connection failed"));

      await expect(storage.getMomentumWorkspaces(userId)).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("handles insert failures", async () => {
      const mockDb = await require("@/server/db/client").getDb();
      mockDb.insert.mockImplementationOnce(() => ({
        values: () => ({
          returning: vi.fn().mockRejectedValueOnce(new Error("Insert failed")),
        }),
      }));

      const workspaceData: Omit<NewMomentumWorkspace, "userId"> = {
        name: "Test Workspace",
      };

      await expect(storage.createMomentumWorkspace(userId, workspaceData)).rejects.toThrow(
        "Insert failed",
      );
    });

    it("throws error when creation returns no result", async () => {
      const mockDb = await require("@/server/db/client").getDb();
      mockDb.insert.mockImplementationOnce(() => ({
        values: () => ({
          returning: vi.fn().mockResolvedValueOnce([]), // Empty result
        }),
      }));

      const workspaceData: Omit<NewMomentumWorkspace, "userId"> = {
        name: "Test Workspace",
      };

      await expect(storage.createMomentumWorkspace(userId, workspaceData)).rejects.toThrow(
        "Failed to create momentum workspace",
      );
    });
  });
});

describe("Singleton Instance", () => {
  it("exports a singleton instance", () => {
    expect(momentumStorage).toBeInstanceOf(MomentumStorage);
  });

  it("exports legacy alias", () => {
    const { tasksStorage } = require("./momentum.storage");
    expect(tasksStorage).toBe(momentumStorage);
  });
});
