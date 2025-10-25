import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "../route";
import { NextRequest } from "next/server";

// Mock the services
vi.mock("@/server/services/tags.service", () => ({
  listTagsService: vi.fn(),
  createTagService: vi.fn(),
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
  handleAuth: vi.fn((schema, responseSchema, handler) => {
    return async (request: NextRequest) => {
      const body = await request.json();
      const userId = "test-user-id";
      const result = await handler(body, userId, request);
      return Response.json(result);
    };
  }),
}));

describe("/api/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/tags", () => {
    it("should list tags with pagination", async () => {
      const { listTagsService } = await import("@/server/services/tags.service");

      const mockResponse = {
        items: [
          {
            id: "1",
            userId: "test-user-id",
            name: "Tag 1",
            category: "services_modalities" as const,
            color: "#3B82F6",
            isSystem: false,
            usageCount: 0,
            createdAt: new Date("2025-01-01"),
            updatedAt: new Date("2025-01-01"),
          },
          {
            id: "2",
            userId: "test-user-id",
            name: "Tag 2",
            category: "client_demographics" as const,
            color: "#10B981",
            isSystem: false,
            usageCount: 5,
            createdAt: new Date("2025-01-01"),
            updatedAt: new Date("2025-01-01"),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.mocked(listTagsService).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/tags?page=1&pageSize=10");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        items: mockResponse.items.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        pagination: mockResponse.pagination,
      });
      expect(listTagsService).toHaveBeenCalledWith("test-user-id", {
        page: "1",
        pageSize: "10",
        search: undefined,
        category: undefined,
        sort: undefined,
        order: undefined,
      });
    });

    it("should handle search and category filters", async () => {
      const { listTagsService } = await import("@/server/services/tags.service");

      const mockResponse = {
        items: [
          {
            id: "1",
            userId: "test-user-id",
            name: "Important Tag",
            category: "services_modalities" as const,
            color: "#3B82F6",
            isSystem: false,
            usageCount: 0,
            createdAt: new Date("2025-01-01"),
            updatedAt: new Date("2025-01-01"),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.mocked(listTagsService).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost:3000/api/tags?search=Important&category=services_modalities",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        items: mockResponse.items.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        pagination: mockResponse.pagination,
      });
      expect(listTagsService).toHaveBeenCalledWith("test-user-id", {
        page: undefined,
        pageSize: undefined,
        search: "Important",
        category: "services_modalities",
        sort: undefined,
        order: undefined,
      });
    });
  });

  describe("POST /api/tags", () => {
    it("should create a new tag", async () => {
      const { createTagService } = await import("@/server/services/tags.service");

      const mockTag = {
        id: "test-id",
        userId: "test-user-id",
        name: "Test Tag",
        category: "services_modalities" as const,
        color: "#3B82F6",
        isSystem: false,
        usageCount: 0,
        createdAt: new Date("2025-10-21T08:00:57.042Z"),
        updatedAt: new Date("2025-10-21T08:00:57.042Z"),
      };

      vi.mocked(createTagService).mockResolvedValue(mockTag);

      const request = new NextRequest("http://localhost:3000/api/tags", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Tag",
          category: "services_modalities",
          color: "#3B82F6",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        item: {
          ...mockTag,
          createdAt: mockTag.createdAt.toISOString(),
          updatedAt: mockTag.updatedAt.toISOString(),
        },
      });
      expect(createTagService).toHaveBeenCalledWith("test-user-id", {
        name: "Test Tag",
        category: "services_modalities",
        color: "#3B82F6",
      });
    });
  });
});
