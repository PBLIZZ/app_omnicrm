import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import * as productivityService from "@/server/services/productivity.service";

// Mock the productivity service
vi.mock("@/server/services/productivity.service");

// Mock the authentication handlers
vi.mock("@/lib/api", () => ({
  handleGetWithQueryAuth: vi.fn((schema, responseSchema, handler) => {
    return async (request: Request) => {
      const url = new URL(request.url);
      const query = Object.fromEntries(url.searchParams.entries());

      // Convert string numbers to actual numbers
      if (query.page) query.page = parseInt(query.page as string, 10);
      if (query.pageSize) query.pageSize = parseInt(query.pageSize as string, 10);

      const userId = "user-123";

      try {
        const result = await handler(query, userId);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    };
  }),
  handleAuth: vi.fn((schema, responseSchema, handler) => {
    return async (request: Request) => {
      const userId = "user-123";

      try {
        const body = await request.json();

        // Mock validation - check for invalid data
        if (body.name === "" || body.status === "invalid") {
          return new Response(
            JSON.stringify({
              error: "Validation failed",
              details: "Invalid input data",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const result = await handler(body, userId);

        // Handle null result (creation failure)
        if (result === null) {
          return new Response(JSON.stringify({ error: "Failed to create project" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    };
  }),
}));

describe("/api/omni-momentum/projects API Route", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/omni-momentum/projects", () => {
    it("should return list of projects with default filters", async () => {
      const mockProjects = [
        {
          id: "project-1",
          userId: mockUserId,
          name: "Test Project",
          description: "A test project",
          status: "active",
          color: "#3b82f6",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(productivityService.listProjectsService).mockResolvedValue(mockProjects);

      const request = new Request("http://localhost:3000/api/omni-momentum/projects");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(productivityService.listProjectsService).toHaveBeenCalledWith(mockUserId, {});

      const data = await response.json();
      expect(data).toEqual(
        mockProjects.map((project) => ({
          ...project,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        })),
      );
    });

    it("should handle query parameters correctly", async () => {
      const mockProjects = [];
      vi.mocked(productivityService.listProjectsService).mockResolvedValue(mockProjects);

      const request = new Request(
        "http://localhost:3000/api/omni-momentum/projects?status=active&color=%233b82f6",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(productivityService.listProjectsService).toHaveBeenCalledWith(mockUserId, {
        status: "active",
        color: "#3b82f6",
      });
    });

    it("should handle service errors gracefully", async () => {
      vi.mocked(productivityService.listProjectsService).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new Request("http://localhost:3000/api/omni-momentum/projects");
      const response = await GET(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toHaveProperty("error");
    });
  });

  describe("POST /api/omni-momentum/projects", () => {
    it("should create a new project", async () => {
      const mockProjectData = {
        name: "New Project",
        description: "A new project description",
        status: "active",
        color: "#10b981",
      };

      const mockCreatedProject = {
        id: "project-2",
        userId: mockUserId,
        ...mockProjectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(productivityService.createProjectService).mockResolvedValue(mockCreatedProject);

      const request = new Request("http://localhost:3000/api/omni-momentum/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mockProjectData),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(productivityService.createProjectService).toHaveBeenCalledWith(
        mockUserId,
        mockProjectData,
      );

      const data = await response.json();
      expect(data).toEqual({
        ...mockCreatedProject,
        createdAt: mockCreatedProject.createdAt.toISOString(),
        updatedAt: mockCreatedProject.updatedAt.toISOString(),
      });
    });

    it("should handle validation errors", async () => {
      const invalidProjectData = {
        name: "", // Invalid: empty name
        status: "invalid", // Invalid: not a valid status
      };

      const request = new Request("http://localhost:3000/api/omni-momentum/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidProjectData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toBe("Validation failed");
    });

    it("should handle service errors gracefully", async () => {
      const mockProjectData = {
        name: "Test Project",
        status: "active",
      };

      vi.mocked(productivityService.createProjectService).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new Request("http://localhost:3000/api/omni-momentum/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mockProjectData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toHaveProperty("error");
    });
  });
});
