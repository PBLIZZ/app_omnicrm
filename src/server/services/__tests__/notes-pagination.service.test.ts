import { describe, it, expect, vi, beforeEach } from "vitest";
import { listNotesByContactIdPaginatedService } from "../notes.service";
import { createNotesRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";

// Mock the repository
vi.mock("@repo", () => ({
  createNotesRepository: vi.fn(),
}));

// Mock getDb
vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

describe("listNotesByContactIdPaginatedService", () => {
  const mockDb = {};
  const mockRepo = {
    listNotesByContactIdPaginated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createNotesRepository).mockReturnValue(mockRepo as any);
  });

  it("should return paginated notes with correct structure", async () => {
    const mockNotes = [
      {
        id: "note-1",
        userId: "user-1",
        contactId: "contact-1",
        contentPlain: "Test note 1",
        contentRich: {},
        piiEntities: [],
        sourceType: "typed" as const,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        id: "note-2",
        userId: "user-1",
        contactId: "contact-1",
        contentPlain: "Test note 2",
        contentRich: {},
        piiEntities: [],
        sourceType: "typed" as const,
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
      },
    ];

    mockRepo.listNotesByContactIdPaginated.mockResolvedValue({
      notes: mockNotes,
      total: 25,
    });

    const result = await listNotesByContactIdPaginatedService("user-1", "contact-1", {
      page: 1,
      pageSize: 10,
    });

    expect(result).toEqual({
      notes: mockNotes,
      pagination: {
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      },
    });

    expect(mockRepo.listNotesByContactIdPaginated).toHaveBeenCalledWith("user-1", "contact-1", {
      page: 1,
      pageSize: 10,
    });
  });

  it("should use default page and pageSize when not provided", async () => {
    mockRepo.listNotesByContactIdPaginated.mockResolvedValue({
      notes: [],
      total: 0,
    });

    await listNotesByContactIdPaginatedService("user-1", "contact-1");

    expect(mockRepo.listNotesByContactIdPaginated).toHaveBeenCalledWith("user-1", "contact-1", {
      page: 1,
      pageSize: 10,
    });
  });

  it("should calculate pagination correctly for last page", async () => {
    mockRepo.listNotesByContactIdPaginated.mockResolvedValue({
      notes: [],
      total: 25,
    });

    const result = await listNotesByContactIdPaginatedService("user-1", "contact-1", {
      page: 3,
      pageSize: 10,
    });

    expect(result.pagination).toEqual({
      page: 3,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      hasNext: false,
      hasPrev: true,
    });
  });

  it("should throw AppError when repository throws error", async () => {
    const error = new Error("Database error");
    mockRepo.listNotesByContactIdPaginated.mockRejectedValue(error);

    await expect(
      listNotesByContactIdPaginatedService("user-1", "contact-1", {
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toThrow(AppError);

    await expect(
      listNotesByContactIdPaginatedService("user-1", "contact-1", {
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toThrow("Database error");
  });

  it("should handle empty results correctly", async () => {
    mockRepo.listNotesByContactIdPaginated.mockResolvedValue({
      notes: [],
      total: 0,
    });

    const result = await listNotesByContactIdPaginatedService("user-1", "contact-1", {
      page: 1,
      pageSize: 10,
    });

    expect(result).toEqual({
      notes: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
  });
});
