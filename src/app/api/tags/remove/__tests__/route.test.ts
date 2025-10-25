import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the route before importing it
vi.mock("@/server/db/business-schemas/tags", () => ({
  RemoveTagsBodySchema: {},
  z: {
    object: vi.fn(() => ({})),
    number: vi.fn(() => ({})),
  },
}));

import { DELETE } from "../route";

// Mock the services
vi.mock("@/server/services/tags.service", () => ({
  removeTagsService: vi.fn(),
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

describe("/api/tags/remove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DELETE /api/tags/remove", () => {
    it("should remove tags from contact", async () => {
      const { removeTagsService } = await import("@/server/services/tags.service");

      const mockResponse = { removed: 2 };
      vi.mocked(removeTagsService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/remove", {
        method: "DELETE",
        body: JSON.stringify({
          entityType: "contact",
          entityId: "contact-1",
          tagIds: ["tag-1", "tag-2"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(removeTagsService).toHaveBeenCalledWith("test-user-id", {
        entityType: "contact",
        entityId: "contact-1",
        tagIds: ["tag-1", "tag-2"],
      });
    });

    it("should remove tags from task", async () => {
      const { removeTagsService } = await import("@/server/services/tags.service");

      const mockResponse = { removed: 1 };
      vi.mocked(removeTagsService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/remove", {
        method: "DELETE",
        body: JSON.stringify({
          entityType: "task",
          entityId: "task-1",
          tagIds: ["tag-1"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(removeTagsService).toHaveBeenCalledWith("test-user-id", {
        entityType: "task",
        entityId: "task-1",
        tagIds: ["tag-1"],
      });
    });

    it("should remove tags from note", async () => {
      const { removeTagsService } = await import("@/server/services/tags.service");

      const mockResponse = { removed: 3 };
      vi.mocked(removeTagsService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/remove", {
        method: "DELETE",
        body: JSON.stringify({
          entityType: "note",
          entityId: "note-1",
          tagIds: ["tag-1", "tag-2", "tag-3"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(removeTagsService).toHaveBeenCalledWith("test-user-id", {
        entityType: "note",
        entityId: "note-1",
        tagIds: ["tag-1", "tag-2", "tag-3"],
      });
    });

    it("should remove tags from goal", async () => {
      const { removeTagsService } = await import("@/server/services/tags.service");

      const mockResponse = { removed: 1 };
      vi.mocked(removeTagsService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/remove", {
        method: "DELETE",
        body: JSON.stringify({
          entityType: "goal",
          entityId: "goal-1",
          tagIds: ["tag-1"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(removeTagsService).toHaveBeenCalledWith("test-user-id", {
        entityType: "goal",
        entityId: "goal-1",
        tagIds: ["tag-1"],
      });
    });
  });
});
