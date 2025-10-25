import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the route before importing it
vi.mock("@/server/db/business-schemas/tags", () => ({
  ApplyTagsBodySchema: {},
  z: {
    object: vi.fn(() => ({})),
    number: vi.fn(() => ({})),
  },
}));

import { POST } from "../route";

// Mock the services
vi.mock("@/server/services/tags.service", () => ({
  applyTagsService: vi.fn(),
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

describe("/api/tags/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/tags/apply", () => {
    it("should apply tags to contact", async () => {
      const { applyTagsService } = await import("@/server/services/tags.service");

      const mockResponse = { applied: 2 };
      vi.mocked(applyTagsService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/apply", {
        method: "POST",
        body: JSON.stringify({
          entityType: "contact",
          entityId: "contact-1",
          tagIds: ["tag-1", "tag-2"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(applyTagsService).toHaveBeenCalledWith("test-user-id", {
        entityType: "contact",
        entityId: "contact-1",
        tagIds: ["tag-1", "tag-2"],
      });
    });

    it("should apply tags to task", async () => {
      const { applyTagsService } = await import("@/server/services/tags.service");

      const mockResponse = { applied: 1 };
      vi.mocked(applyTagsService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/apply", {
        method: "POST",
        body: JSON.stringify({
          entityType: "task",
          entityId: "task-1",
          tagIds: ["tag-1"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(applyTagsService).toHaveBeenCalledWith("test-user-id", {
        entityType: "task",
        entityId: "task-1",
        tagIds: ["tag-1"],
      });
    });

    it("should apply tags to note", async () => {
      const { applyTagsService } = await import("@/server/services/tags.service");

      const mockResponse = { applied: 3 };
      vi.mocked(applyTagsService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/apply", {
        method: "POST",
        body: JSON.stringify({
          entityType: "note",
          entityId: "note-1",
          tagIds: ["tag-1", "tag-2", "tag-3"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(applyTagsService).toHaveBeenCalledWith("test-user-id", {
        entityType: "note",
        entityId: "note-1",
        tagIds: ["tag-1", "tag-2", "tag-3"],
      });
    });

    it("should apply tags to goal", async () => {
      const { applyTagsService } = await import("@/server/services/tags.service");

      const mockResponse = { applied: 1 };
      vi.mocked(applyTagsService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags/apply", {
        method: "POST",
        body: JSON.stringify({
          entityType: "goal",
          entityId: "goal-1",
          tagIds: ["tag-1"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(applyTagsService).toHaveBeenCalledWith("test-user-id", {
        entityType: "goal",
        entityId: "goal-1",
        tagIds: ["tag-1"],
      });
    });
  });
});
