import { describe, it, expect, beforeEach, vi } from "vitest";
import { DELETE } from "../route";
import { NextRequest } from "next/server";

// Mock the services
vi.mock("@/server/services/tags.service", () => ({
  deleteTagsBulkService: vi.fn(),
}));

// Mock the API handlers
vi.mock("@/lib/api", () => ({
  handleAuth: vi.fn((schema, responseSchema, handler) => {
    return async (request: NextRequest) => {
      const body = await request.json();
      const userId = "test-user-id";
      const result = await handler(body, userId, request);
      return Response.json(result);
    };
  }),
}));

describe("/api/tags/bulk-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DELETE /api/tags/bulk-delete", () => {
    it("should bulk delete tags", async () => {
      const { deleteTagsBulkService } = await import("@/server/services/tags.service");

      const mockResponse = {
        deleted: 3,
        errors: [],
      };
      vi.mocked(deleteTagsBulkService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({
          ids: ["tag-1", "tag-2", "tag-3"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(deleteTagsBulkService).toHaveBeenCalledWith("test-user-id", {
        ids: ["tag-1", "tag-2", "tag-3"],
      });
    });

    it("should handle partial deletion with errors", async () => {
      const { deleteTagsBulkService } = await import("@/server/services/tags.service");

      const mockResponse = {
        deleted: 2,
        errors: [{ id: "tag-3", error: "Tag not found" }],
      };
      vi.mocked(deleteTagsBulkService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({
          ids: ["tag-1", "tag-2", "tag-3"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(deleteTagsBulkService).toHaveBeenCalledWith("test-user-id", {
        ids: ["tag-1", "tag-2", "tag-3"],
      });
    });

    it("should handle empty IDs array", async () => {
      const { deleteTagsBulkService } = await import("@/server/services/tags.service");

      const mockResponse = {
        deleted: 0,
        errors: [],
      };
      vi.mocked(deleteTagsBulkService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({
          ids: [],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(deleteTagsBulkService).toHaveBeenCalledWith("test-user-id", {
        ids: [],
      });
    });
  });
});

