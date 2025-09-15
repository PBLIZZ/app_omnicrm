import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

// Mock dependencies
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("user-123"),
}));

vi.mock("@/server/storage/momentum.storage", () => ({
  momentumStorage: {
    getMomentums: vi.fn().mockResolvedValue([]),
    getMomentumsWithContacts: vi.fn().mockResolvedValue([]),
    createMomentum: vi.fn().mockResolvedValue({
      id: "momentum-123",
      title: "Test Momentum",
      status: "todo",
      createdAt: new Date(),
    }),
  },
}));

vi.mock("@/server/db/client", () => ({
  getDb: vi.fn().mockResolvedValue({
    query: {
      momentumWorkspaces: {
        findFirst: vi.fn().mockResolvedValue({
          id: "workspace-123",
          name: "Default Workspace",
          isDefault: true,
        }),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "new-workspace-123",
            name: "Default Workspace",
            isDefault: true,
          },
        ]),
      }),
    }),
  }),
}));

// Mock logger
vi.mock("@/lib/observability/unified-logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("/api/omni-momentum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns list of momentums", async () => {
      const mockMomentums = [
        {
          id: "momentum-1",
          title: "First Momentum",
          status: "todo",
          priority: "medium",
          createdAt: new Date("2025-01-01"),
        },
        {
          id: "momentum-2",
          title: "Second Momentum",
          status: "in_progress",
          priority: "high",
          createdAt: new Date("2025-01-02"),
        },
      ];

      require("@/server/storage/momentum.storage").momentumStorage.getMomentums.mockResolvedValueOnce(
        mockMomentums,
      );

      const url = new URL("http://localhost:3000/api/omni-momentum");
      const request = new NextRequest(url);

      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.momentums).toHaveLength(2);
      expect(data.data.momentums[0].title).toBe("First Momentum");
    });

    it("filters momentums by workspace", async () => {
      const url = new URL("http://localhost:3000/api/omni-momentum?workspaceId=workspace-123");
      const request = new NextRequest(url);

      await GET(request, {});

      expect(
        require("@/server/storage/momentum.storage").momentumStorage.getMomentums,
      ).toHaveBeenCalledWith("user-123", {
        workspaceId: "workspace-123",
      });
    });

    it("filters momentums by multiple parameters", async () => {
      const url = new URL(
        "http://localhost:3000/api/omni-momentum?status=in_progress&assignee=user&priority=high",
      );
      const request = new NextRequest(url);

      await GET(request, {});

      expect(
        require("@/server/storage/momentum.storage").momentumStorage.getMomentums,
      ).toHaveBeenCalledWith("user-123", {
        status: "in_progress",
        assignee: "user",
      });
    });

    it("filters momentums by projectId", async () => {
      const url = new URL("http://localhost:3000/api/omni-momentum?projectId=project-123");
      const request = new NextRequest(url);

      await GET(request, {});

      expect(
        require("@/server/storage/momentum.storage").momentumStorage.getMomentums,
      ).toHaveBeenCalledWith("user-123", {
        projectId: "project-123",
      });
    });

    it("filters by parentMomentumId including null values", async () => {
      const url = new URL("http://localhost:3000/api/omni-momentum?parentMomentumId=");
      const request = new NextRequest(url);

      await GET(request, {});

      expect(
        require("@/server/storage/momentum.storage").momentumStorage.getMomentums,
      ).toHaveBeenCalledWith("user-123", {
        parentMomentumId: null,
      });
    });

    it("returns momentums with contacts when requested", async () => {
      const mockMomentumsWithContacts = [
        {
          id: "momentum-1",
          title: "First Momentum",
          contacts: [{ id: "contact-1", displayName: "John Doe" }],
        },
      ];

      require("@/server/storage/momentum.storage").momentumStorage.getMomentumsWithContacts.mockResolvedValueOnce(
        mockMomentumsWithContacts,
      );

      const url = new URL("http://localhost:3000/api/omni-momentum?withContacts=true");
      const request = new NextRequest(url);

      const response = await GET(request, {});
      const data = await response.json();

      expect(
        require("@/server/storage/momentum.storage").momentumStorage.getMomentumsWithContacts,
      ).toHaveBeenCalledWith("user-123");
      expect(data.data.momentums[0].contacts).toHaveLength(1);
    });

    it("returns 401 when user not authenticated", async () => {
      vi.mocked(require("@/server/auth/user").getServerUserId).mockRejectedValueOnce(
        new Error("No session"),
      );

      const url = new URL("http://localhost:3000/api/omni-momentum");
      const request = new NextRequest(url);

      const response = await GET(request, {});

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("handles storage errors gracefully", async () => {
      require("@/server/storage/momentum.storage").momentumStorage.getMomentums.mockRejectedValueOnce(
        new Error("Storage error"),
      );

      const url = new URL("http://localhost:3000/api/omni-momentum");
      const request = new NextRequest(url);

      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("POST", () => {
    it("creates momentum successfully with all fields", async () => {
      const mockMomentum = {
        id: "momentum-123",
        title: "New Momentum",
        description: "A test momentum",
        status: "todo",
        priority: "high",
        assignee: "user",
        source: "user",
        approvalStatus: "approved",
        estimatedMinutes: 120,
        createdAt: new Date(),
      };

      require("@/server/storage/momentum.storage").momentumStorage.createMomentum.mockResolvedValueOnce(
        mockMomentum,
      );

      const momentumData = {
        title: "New Momentum",
        description: "A test momentum",
        status: "todo",
        priority: "high",
        assignee: "user",
        source: "user",
        approvalStatus: "approved",
        estimatedMinutes: 120,
        taggedContacts: ["contact-1", "contact-2"],
        dueDate: "2025-12-31T23:59:59Z",
        aiContext: { confidence: 0.9 },
      };

      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify(momentumData),
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.momentum.id).toBe("momentum-123");
      expect(data.data.momentum.title).toBe("New Momentum");
    });

    it("creates momentum with minimal required fields", async () => {
      const momentumData = {
        title: "Minimal Momentum",
      };

      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify(momentumData),
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(
        require("@/server/storage/momentum.storage").momentumStorage.createMomentum,
      ).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          title: "Minimal Momentum",
          status: "todo",
          priority: "medium",
          assignee: "user",
          source: "user",
          approvalStatus: "approved",
        }),
      );
    });

    it("uses existing default workspace", async () => {
      const mockDb = {
        query: {
          momentumWorkspaces: {
            findFirst: vi.fn().mockResolvedValue({
              id: "existing-workspace-123",
              name: "Default Workspace",
              isDefault: true,
            }),
          },
        },
      };

      vi.mocked(require("@/server/db/client").getDb).mockResolvedValueOnce(mockDb);

      const momentumData = {
        title: "New Momentum",
      };

      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify(momentumData),
      });

      await POST(request, {});

      expect(
        require("@/server/storage/momentum.storage").momentumStorage.createMomentum,
      ).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          momentumWorkspaceId: "existing-workspace-123",
        }),
      );
    });

    it("creates default workspace when none exists", async () => {
      const mockDb = {
        query: {
          momentumWorkspaces: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: "new-workspace-123",
                name: "Default Workspace",
                isDefault: true,
              },
            ]),
          }),
        }),
      };

      vi.mocked(require("@/server/db/client").getDb).mockResolvedValueOnce(mockDb);

      const momentumData = {
        title: "New Momentum",
      };

      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify(momentumData),
      });

      await POST(request, {});

      expect(mockDb.insert).toHaveBeenCalled();
      expect(
        require("@/server/storage/momentum.storage").momentumStorage.createMomentum,
      ).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          momentumWorkspaceId: "new-workspace-123",
        }),
      );
    });

    it("uses provided workspaceId", async () => {
      const momentumData = {
        title: "New Momentum",
        workspaceId: "custom-workspace-123",
      };

      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify(momentumData),
      });

      await POST(request, {});

      expect(
        require("@/server/storage/momentum.storage").momentumStorage.createMomentum,
      ).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          momentumWorkspaceId: "custom-workspace-123",
        }),
      );
    });

    it("validates required title field", async () => {
      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request, {});

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("validates empty title", async () => {
      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify({ title: "" }),
      });

      const response = await POST(request, {});

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("validates enum values", async () => {
      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify({
          title: "Test Momentum",
          status: "invalid_status",
          priority: "invalid_priority",
        }),
      });

      const response = await POST(request, {});

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("validates UUID fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify({
          title: "Test Momentum",
          projectId: "invalid-uuid",
          workspaceId: "invalid-uuid",
        }),
      });

      const response = await POST(request, {});

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("validates datetime format", async () => {
      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify({
          title: "Test Momentum",
          dueDate: "invalid-date",
        }),
      });

      const response = await POST(request, {});

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 401 when user not authenticated", async () => {
      vi.mocked(require("@/server/auth/user").getServerUserId).mockRejectedValueOnce(
        new Error("No session"),
      );

      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify({ title: "Test" }),
      });

      const response = await POST(request, {});

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("handles invalid JSON in request body", async () => {
      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: "invalid json",
      });

      const response = await POST(request, {});

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("handles storage creation errors", async () => {
      require("@/server/storage/momentum.storage").momentumStorage.createMomentum.mockRejectedValueOnce(
        new Error("Storage error"),
      );

      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify({ title: "Test Momentum" }),
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });

    it("handles database errors when creating workspace", async () => {
      const mockDb = {
        query: {
          momentumWorkspaces: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error("Database error")),
          }),
        }),
      };

      vi.mocked(require("@/server/db/client").getDb).mockResolvedValueOnce(mockDb);

      const request = new NextRequest("http://localhost:3000/api/omni-momentum", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "test-token",
        },
        body: JSON.stringify({ title: "Test Momentum" }),
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
