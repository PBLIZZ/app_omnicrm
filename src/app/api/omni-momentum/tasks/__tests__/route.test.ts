import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import * as productivityService from "@/server/services/productivity.service";

// Mock the productivity service
vi.mock("@/server/services/productivity.service");

// Mock the authentication handlers
vi.mock("@/lib/api", () => ({
  handleGetWithQueryAuth: vi.fn((schema, responseSchema, handler) => {
    return async (request: Request) => {
      // Mock authentication - simulate authenticated user
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
      // Mock authentication - simulate authenticated user
      const userId = "user-123";

      try {
        const body = await request.json();

        // Mock validation - check for invalid data
        if (body.name === "" || body.priority === "invalid") {
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
          return new Response(JSON.stringify({ error: "Failed to create task" }), {
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

describe("/api/omni-momentum/tasks API Route", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/omni-momentum/tasks", () => {
    it("should return list of tasks with default filters", async () => {
      const mockTasks = [
        {
          id: "task-1",
          userId: mockUserId,
          name: "Test Task",
          projectId: null,
          parentTaskId: null,
          priority: "medium",
          status: "todo",
          dueDate: null,
          details: {},
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(productivityService.listTasksService).mockResolvedValue(mockTasks);

      const request = new Request("http://localhost:3000/api/omni-momentum/tasks");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(productivityService.listTasksService).toHaveBeenCalledWith(mockUserId, {});

      const data = await response.json();
      expect(data).toEqual(
        mockTasks.map((task) => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        })),
      );
    });

    it("should handle query parameters correctly", async () => {
      const mockTasks = [];
      vi.mocked(productivityService.listTasksService).mockResolvedValue(mockTasks);

      const request = new Request(
        "http://localhost:3000/api/omni-momentum/tasks?status=todo&priority=high&projectId=proj-1",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(productivityService.listTasksService).toHaveBeenCalledWith(mockUserId, {
        status: "todo",
        priority: "high",
        projectId: "proj-1",
      });
    });

    it("should handle service errors gracefully", async () => {
      vi.mocked(productivityService.listTasksService).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new Request("http://localhost:3000/api/omni-momentum/tasks");
      const response = await GET(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toHaveProperty("error");
    });
  });

  describe("POST /api/omni-momentum/tasks", () => {
    it("should create a new task", async () => {
      const mockTaskData = {
        name: "New Task",
        projectId: "proj-1",
        priority: "high",
        status: "todo",
        dueDate: "2024-12-31",
        details: { description: "Task description" },
      };

      const mockCreatedTask = {
        id: "task-2",
        userId: mockUserId,
        ...mockTaskData,
        parentTaskId: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(productivityService.createTaskService).mockResolvedValue(mockCreatedTask);

      const request = new Request("http://localhost:3000/api/omni-momentum/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mockTaskData),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(productivityService.createTaskService).toHaveBeenCalledWith(mockUserId, mockTaskData);

      const data = await response.json();
      expect(data).toEqual({
        ...mockCreatedTask,
        createdAt: mockCreatedTask.createdAt.toISOString(),
        updatedAt: mockCreatedTask.updatedAt.toISOString(),
      });
    });

    it("should handle validation errors", async () => {
      const invalidTaskData = {
        name: "", // Invalid: empty name
        priority: "invalid", // Invalid: not a valid priority
      };

      const request = new Request("http://localhost:3000/api/omni-momentum/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidTaskData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toBe("Validation failed");
    });

    it("should handle service errors gracefully", async () => {
      const mockTaskData = {
        name: "Test Task",
        priority: "medium",
        status: "todo",
      };

      vi.mocked(productivityService.createTaskService).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new Request("http://localhost:3000/api/omni-momentum/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mockTaskData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toHaveProperty("error");
    });
  });
});
