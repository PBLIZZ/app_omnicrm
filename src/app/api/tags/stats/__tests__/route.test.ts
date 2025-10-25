import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";

// Mock the services
vi.mock("@/server/services/tags.service", () => ({
  getTagUsageStatsService: vi.fn(),
}));

// Mock the API handlers
vi.mock("@/lib/api", () => ({
  handleGetWithQueryAuth: vi.fn((schema, responseSchema, handler) => {
    return async (request: NextRequest) => {
      const url = new URL(request.url);
      const query = Object.fromEntries(url.searchParams.entries());
      const userId = "test-user-id";
      const result = await handler(query, userId, request);
      return Response.json(result);
    };
  }),
}));

describe("/api/tags/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/tags/stats", () => {
    it("should get tag usage statistics", async () => {
      const { getTagUsageStatsService } = await import("@/server/services/tags.service");

      const mockStats = [
        { tagId: "tag-1", usageCount: 10, entityType: "tag" },
        { tagId: "tag-2", usageCount: 5, entityType: "tag" },
        { tagId: "tag-3", usageCount: 2, entityType: "tag" },
      ];

      vi.mocked(getTagUsageStatsService).mockResolvedValue(mockStats);

      const request = new NextRequest("http://localhost:3000/api/tags/stats");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ stats: mockStats });
      expect(getTagUsageStatsService).toHaveBeenCalledWith("test-user-id");
    });

    it("should return empty stats when no tags exist", async () => {
      const { getTagUsageStatsService } = await import("@/server/services/tags.service");

      const mockStats: any[] = [];
      vi.mocked(getTagUsageStatsService).mockResolvedValue(mockStats);

      const request = new NextRequest("http://localhost:3000/api/tags/stats");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ stats: [] });
      expect(getTagUsageStatsService).toHaveBeenCalledWith("test-user-id");
    });

    it("should handle service errors", async () => {
      const { getTagUsageStatsService } = await import("@/server/services/tags.service");

      vi.mocked(getTagUsageStatsService).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/tags/stats");

      // The error should be handled by the API handler
      await expect(GET(request)).rejects.toThrow("Database error");
    });
  });
});

