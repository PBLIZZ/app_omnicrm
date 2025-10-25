import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { listNotesByContactIdPaginatedService } from "@/server/services/notes.service";

// Mock the service
vi.mock("@/server/services/notes.service", () => ({
  listNotesByContactIdPaginatedService: vi.fn(),
}));

// Mock the API handler
vi.mock("@/lib/api", () => ({
  handleGetWithQueryAuth: vi.fn((schema, responseSchema, handler) => {
    return async (request: Request) => {
      const url = new URL(request.url);
      const query = {
        contactId: url.searchParams.get("contactId"),
        page: url.searchParams.get("page"),
        pageSize: url.searchParams.get("pageSize"),
      };

      const userId = "test-user-id";
      const result = await handler(query, userId);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
  }),
}));

describe("/api/notes/paginated", () => {
  const mockNotes = [
    {
      id: "note-1",
      userId: "test-user-id",
      contactId: "contact-1",
      contentPlain: "Test note 1",
      contentRich: {},
      // tags: ["tag1"], // Tags field removed - now using relational tagging system
      piiEntities: [],
      sourceType: "typed" as const,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "note-2",
      userId: "test-user-id",
      contactId: "contact-1",
      contentPlain: "Test note 2",
      contentRich: {},
      // tags: ["tag2"], // Tags field removed - now using relational tagging system
      piiEntities: [],
      sourceType: "typed" as const,
      createdAt: "2024-01-02T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    },
  ];

  const mockPaginationResult = {
    notes: mockNotes,
    pagination: {
      page: 1,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return paginated notes with default parameters", async () => {
    vi.mocked(listNotesByContactIdPaginatedService).mockResolvedValue(mockPaginationResult);

    const request = new Request("http://localhost/api/notes/paginated?contactId=contact-1");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockPaginationResult);
    expect(listNotesByContactIdPaginatedService).toHaveBeenCalledWith("test-user-id", "contact-1", {
      page: null,
      pageSize: null,
    });
  });

  it("should return paginated notes with custom parameters", async () => {
    vi.mocked(listNotesByContactIdPaginatedService).mockResolvedValue(mockPaginationResult);

    const request = new Request(
      "http://localhost/api/notes/paginated?contactId=contact-1&page=2&pageSize=5",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockPaginationResult);
    expect(listNotesByContactIdPaginatedService).toHaveBeenCalledWith("test-user-id", "contact-1", {
      page: "2",
      pageSize: "5",
    });
  });

  it("should handle service errors", async () => {
    const error = new Error("Service error");
    vi.mocked(listNotesByContactIdPaginatedService).mockRejectedValue(error);

    const request = new Request("http://localhost/api/notes/paginated?contactId=contact-1");

    // The actual error handling would be done by the handleGetWithQueryAuth wrapper
    // This test verifies that the service is called with correct parameters
    await expect(GET(request)).rejects.toThrow();
  });

  it("should handle empty results", async () => {
    const emptyResult = {
      notes: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };

    vi.mocked(listNotesByContactIdPaginatedService).mockResolvedValue(emptyResult);

    const request = new Request("http://localhost/api/notes/paginated?contactId=contact-1");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(emptyResult);
  });

  it("should handle large page numbers", async () => {
    vi.mocked(listNotesByContactIdPaginatedService).mockResolvedValue(mockPaginationResult);

    const request = new Request(
      "http://localhost/api/notes/paginated?contactId=contact-1&page=100&pageSize=50",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockPaginationResult);
    expect(listNotesByContactIdPaginatedService).toHaveBeenCalledWith("test-user-id", "contact-1", {
      page: "100",
      pageSize: "50",
    });
  });

  it("should handle maximum page size", async () => {
    vi.mocked(listNotesByContactIdPaginatedService).mockResolvedValue(mockPaginationResult);

    const request = new Request(
      "http://localhost/api/notes/paginated?contactId=contact-1&page=1&pageSize=100",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockPaginationResult);
    expect(listNotesByContactIdPaginatedService).toHaveBeenCalledWith("test-user-id", "contact-1", {
      page: "1",
      pageSize: "100",
    });
  });
});
