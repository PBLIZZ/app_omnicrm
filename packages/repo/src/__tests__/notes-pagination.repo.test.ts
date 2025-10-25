import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotesRepository } from "../notes.repo";

const mockNotesResult = [
  {
    id: "note-1",
    userId: "user-1",
    contactId: "contact-1",
    contentPlain: "Test note 1",
    contentRich: {},
    piiEntities: [],
    sourceType: "typed",
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
    sourceType: "typed",
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  },
];

describe("NotesRepository - listNotesByContactIdPaginated", () => {
  let repo: NotesRepository;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a simpler mock structure
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn(),
    };

    repo = new NotesRepository(mockDb);
  });

  it("should call count query first, then notes query with correct parameters", async () => {
    // Mock the count query to return a promise that resolves to count result
    const mockCountQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      }),
    };

    // Mock the notes query to return a promise that resolves to notes
    const mockNotesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue(mockNotesResult),
    };

    // Setup the mock to return different objects for count vs notes query
    mockDb.select
      .mockReturnValueOnce(mockCountQuery) // First call for count
      .mockReturnValueOnce(mockNotesQuery); // Second call for notes

    const result = await repo.listNotesByContactIdPaginated("user-1", "contact-1", {
      page: 2,
      pageSize: 10,
    });

    expect(result).toEqual({
      notes: mockNotesResult,
      total: 5,
    });

    // Verify count query was called
    expect(mockDb.select).toHaveBeenCalledWith({ count: expect.any(Object) });

    // Verify notes query was called
    expect(mockNotesQuery.offset).toHaveBeenCalledWith(10); // (page - 1) * pageSize
  });

  it("should calculate offset correctly for different pages", async () => {
    const mockCountQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      }),
    };

    const mockNotesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue(mockNotesResult),
    };

    mockDb.select.mockReturnValueOnce(mockCountQuery).mockReturnValueOnce(mockNotesQuery);

    await repo.listNotesByContactIdPaginated("user-1", "contact-1", {
      page: 1,
      pageSize: 5,
    });

    expect(mockNotesQuery.offset).toHaveBeenCalledWith(0); // (1 - 1) * 5

    // Reset for second call
    mockDb.select.mockReturnValueOnce(mockCountQuery).mockReturnValueOnce(mockNotesQuery);

    await repo.listNotesByContactIdPaginated("user-1", "contact-1", {
      page: 3,
      pageSize: 5,
    });

    expect(mockNotesQuery.offset).toHaveBeenCalledWith(10); // (3 - 1) * 5
  });

  it("should handle empty results", async () => {
    const mockCountQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    };

    const mockNotesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };

    mockDb.select.mockReturnValueOnce(mockCountQuery).mockReturnValueOnce(mockNotesQuery);

    const result = await repo.listNotesByContactIdPaginated("user-1", "contact-1", {
      page: 1,
      pageSize: 10,
    });

    expect(result).toEqual({
      notes: [],
      total: 0,
    });
  });

  it("should handle null count result", async () => {
    const mockCountQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: null }]),
      }),
    };

    const mockNotesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue(mockNotesResult),
    };

    mockDb.select.mockReturnValueOnce(mockCountQuery).mockReturnValueOnce(mockNotesQuery);

    const result = await repo.listNotesByContactIdPaginated("user-1", "contact-1", {
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(0);
  });

  it("should throw error when database operation fails", async () => {
    const error = new Error("Database connection failed");

    // Mock the count query to throw an error
    const mockCountQuery = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(error),
      }),
    };

    mockDb.select.mockReturnValueOnce(mockCountQuery);

    await expect(
      repo.listNotesByContactIdPaginated("user-1", "contact-1", {
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toThrow("Database connection failed");
  });
});
