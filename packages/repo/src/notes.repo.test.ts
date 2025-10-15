import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NotesRepository,
  createNotesRepository,
} from "./notes.repo";
import {
  createMockDbClient,
  createMockQueryBuilder,
  type MockDbClient,
} from "@packages/testing";
import type { Note } from "@/server/db/schema";

describe("NotesRepository", () => {
  let mockDb: MockDbClient;
  let repo: NotesRepository;
  const mockUserId = "user-123";
  const mockContactId = "contact-456";
  const mockNoteId = "note-789";

  const createMockNote = (overrides: Partial<Note> = {}): Note => ({
    id: mockNoteId,
    userId: mockUserId,
    contactId: mockContactId,
    contentPlain: "Test note content",
    contentRich: {},
    tags: [],
    piiEntities: [],
    sourceType: "typed",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = createNotesRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("listNotes", () => {
    it("should list all notes for a user when no contactId provided", async () => {
      const mockNotes = [createMockNote(), createMockNote({ id: "note-2" })];
      const selectBuilder = createMockQueryBuilder(mockNotes);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.listNotes(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(mockNoteId);
    });

    it("should filter notes by contactId when provided", async () => {
      const mockNotes = [createMockNote()];
      const selectBuilder = createMockQueryBuilder(mockNotes);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.listNotes(mockUserId, mockContactId);

      expect(result).toHaveLength(1);
      expect(result[0]?.contactId).toBe(mockContactId);
    });

    it("should return empty array when no notes exist", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.listNotes(mockUserId);

      expect(result).toHaveLength(0);
    });

    it("should order notes by createdAt descending", async () => {
      const mockNotes = [
        createMockNote({ createdAt: new Date("2024-01-02") }),
        createMockNote({ id: "note-2", createdAt: new Date("2024-01-01") }),
      ];
      const selectBuilder = createMockQueryBuilder(mockNotes);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.listNotes(mockUserId);

      expect(result[0]?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("getNoteById", () => {
    it("should retrieve a specific note by id", async () => {
      const mockNote = createMockNote();
      const selectBuilder = createMockQueryBuilder([mockNote]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getNoteById(mockUserId, mockNoteId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockNoteId);
      expect(result?.userId).toBe(mockUserId);
    });

    it("should return null when note does not exist", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getNoteById(mockUserId, "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getNotesByContactId", () => {
    it("should retrieve all notes for a specific contact", async () => {
      const mockNotes = [
        createMockNote(),
        createMockNote({ id: "note-2", contentPlain: "Second note" }),
      ];
      const selectBuilder = createMockQueryBuilder(mockNotes);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getNotesByContactId(mockUserId, mockContactId);

      expect(result).toHaveLength(2);
      result.forEach((note) => {
        expect(note.contactId).toBe(mockContactId);
      });
    });

    it("should return empty array when contact has no notes", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getNotesByContactId(mockUserId, "contact-no-notes");

      expect(result).toHaveLength(0);
    });
  });

  describe("searchNotes", () => {
    it("should search notes by content using ILIKE", async () => {
      const searchTerm = "yoga";
      const mockNotes = [
        createMockNote({ contentPlain: "Discussed yoga practices" }),
        createMockNote({ id: "note-2", contentPlain: "Yoga session feedback" }),
      ];
      const selectBuilder = createMockQueryBuilder(mockNotes);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.searchNotes(mockUserId, searchTerm);

      expect(result).toHaveLength(2);
      result.forEach((note) => {
        expect(note.contentPlain.toLowerCase()).toContain(searchTerm);
      });
    });

    it("should return empty array when no matches found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.searchNotes(mockUserId, "nonexistent");

      expect(result).toHaveLength(0);
    });

    it("should handle special characters in search term", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.searchNotes(mockUserId, "test%_search");

      expect(result).toHaveLength(0);
    });
  });

  describe("createNote", () => {
    it("should create a note", async () => {
      const mockNote = createMockNote();
      const insertBuilder = createMockQueryBuilder([mockNote]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const data = {
        userId: mockUserId,
        contactId: mockContactId,
        contentPlain: "New note",
        sourceType: "typed" as const,
      };

      const result = await repo.createNote(data);

      expect(result).not.toBeNull();
      expect(result.id).toBe(mockNoteId);
    });

    it("should create note without contactId", async () => {
      const mockNote = createMockNote({ contactId: null });
      const insertBuilder = createMockQueryBuilder([mockNote]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const data = {
        userId: mockUserId,
        contentPlain: "General note",
        sourceType: "typed" as const,
      };

      const result = await repo.createNote(data);

      expect(result.contactId).toBeNull();
    });

    it("should handle voice sourceType", async () => {
      const mockNote = createMockNote({ sourceType: "voice" });
      const insertBuilder = createMockQueryBuilder([mockNote]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const data = {
        userId: mockUserId,
        contentPlain: "Voice transcription",
        sourceType: "voice" as const,
      };

      const result = await repo.createNote(data);

      expect(result.sourceType).toBe("voice");
    });

    it("should throw error when insert returns no data", async () => {
      const insertBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const data = {
        userId: mockUserId,
        contentPlain: "Test",
        sourceType: "typed" as const,
      };

      await expect(repo.createNote(data)).rejects.toThrow(
        "Insert returned no data"
      );
    });
  });

  describe("updateNote", () => {
    it("should update note", async () => {
      const mockNote = createMockNote({
        contentPlain: "Updated content",
        updatedAt: new Date(),
      });
      const updateBuilder = createMockQueryBuilder([mockNote]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateNote(mockUserId, mockNoteId, {
        contentPlain: "Updated content",
      });

      expect(result).not.toBeNull();
      expect(result?.contentPlain).toBe("Updated content");
    });

    it("should update only provided fields", async () => {
      const mockNote = createMockNote({ tags: ["updated", "tags"] });
      const updateBuilder = createMockQueryBuilder([mockNote]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateNote(mockUserId, mockNoteId, {
        tags: ["updated", "tags"],
      });

      expect(result).not.toBeNull();
      expect(result?.tags).toEqual(["updated", "tags"]);
    });

    it("should return null when note not found", async () => {
      const updateBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateNote(mockUserId, "non-existent", {
        contentPlain: "Update",
      });

      expect(result).toBeNull();
    });

    it("should update updatedAt timestamp", async () => {
      const now = new Date();
      const mockNote = createMockNote({ updatedAt: now });
      const updateBuilder = createMockQueryBuilder([mockNote]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateNote(mockUserId, mockNoteId, {
        contentPlain: "New content",
      });

      expect(result?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("deleteNote", () => {
    it("should delete note successfully", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: mockNoteId }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteNote(mockUserId, mockNoteId);

      expect(result).toBe(true);
    });

    it("should return false when note not found", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteNote(mockUserId, "non-existent");

      expect(result).toBe(false);
    });

    it("should not allow deleting notes from other users", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteNote("different-user", mockNoteId);

      expect(result).toBe(false);
    });
  });
});
