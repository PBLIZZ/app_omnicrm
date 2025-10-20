import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listNotesService,
  getNoteByIdService,
  createNoteService,
  updateNoteService,
  deleteNoteService,
  getNotesByContactIdService,
} from "../notes.service";
import { createNotesRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { AppError } from "@/lib/errors/app-error";

// Mock dependencies
vi.mock("@repo");
vi.mock("@/server/db/client");
vi.mock("@/server/lib/pii-detector", () => ({
  redactPII: vi.fn((text) => ({
    hasRedactions: false,
    sanitizedText: text,
    entities: [],
  })),
}));

describe("NotesService", () => {
  let mockDb: any;
  let mockRepo: any;
  const mockUserId = "user-123";
  const mockContactId = "contact-456";
  const mockNoteId = "note-789";

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {};
    mockRepo = {
      listNotes: vi.fn(),
      getNoteById: vi.fn(),
      createNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
      getNotesByContactId: vi.fn(),
      searchNotes: vi.fn(),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(createNotesRepository).mockReturnValue(mockRepo);
  });

  describe("listNotesService", () => {
    it("should return list of notes with default parameters", async () => {
      const mockNotes = [
        {
          id: mockNoteId,
          userId: mockUserId,
          contactId: mockContactId,
          contentPlain: "Test note content",
          contentRich: {},
          tags: ["important"],
          piiEntities: [],
          sourceType: "typed",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepo.listNotes.mockResolvedValue(mockNotes);

      const result = await listNotesService(mockUserId);

      expect(result).toEqual(mockNotes);
      expect(createNotesRepository).toHaveBeenCalledWith(mockDb);
      expect(mockRepo.listNotes).toHaveBeenCalledWith(mockUserId, undefined);
    });

    it("should filter notes by contactId", async () => {
      const mockNotes = [];
      mockRepo.listNotes.mockResolvedValue(mockNotes);

      const result = await listNotesService(mockUserId, { contactId: mockContactId });

      expect(result).toEqual(mockNotes);
      expect(mockRepo.listNotes).toHaveBeenCalledWith(mockUserId, mockContactId);
    });

    it("should filter notes by search term", async () => {
      const mockNotes = [];
      mockRepo.searchNotes.mockResolvedValue(mockNotes);

      const result = await listNotesService(mockUserId, { search: "test" });

      expect(result).toEqual(mockNotes);
      expect(mockRepo.searchNotes).toHaveBeenCalledWith(mockUserId, "test");
    });

    it("should handle database errors", async () => {
      mockRepo.listNotes.mockRejectedValue(new Error("Database error"));

      await expect(listNotesService(mockUserId)).rejects.toThrow(AppError);
    });
  });

  describe("getNoteByIdService", () => {
    it("should return note when found", async () => {
      const mockNote = {
        id: mockNoteId,
        userId: mockUserId,
        contactId: mockContactId,
        contentPlain: "Test note content",
        contentRich: {},
        tags: ["important"],
        piiEntities: [],
        sourceType: "typed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.getNoteById.mockResolvedValue(mockNote);

      const result = await getNoteByIdService(mockUserId, mockNoteId);

      expect(result).toEqual(mockNote);
      expect(mockRepo.getNoteById).toHaveBeenCalledWith(mockUserId, mockNoteId);
    });

    it("should throw when note not found", async () => {
      mockRepo.getNoteById.mockResolvedValue(null);

      await expect(getNoteByIdService(mockUserId, "non-existent")).rejects.toThrow(AppError);
      await expect(getNoteByIdService(mockUserId, "non-existent")).rejects.toThrow(
        "Note not found",
      );
    });

    it("should handle database errors", async () => {
      mockRepo.getNoteById.mockRejectedValue(new Error("Database error"));

      await expect(getNoteByIdService(mockUserId, mockNoteId)).rejects.toThrow(AppError);
    });
  });

  describe("createNoteService", () => {
    it("should create a new note with PII redaction", async () => {
      const noteData = {
        contentPlain: "Test note with email@example.com",
        contentRich: { type: "doc", content: [] },
        contactId: mockContactId,
        tags: ["important"],
        sourceType: "typed" as const,
      };

      const mockCreatedNote = {
        id: mockNoteId,
        userId: mockUserId,
        ...noteData,
        piiEntities: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.createNote.mockResolvedValue(mockCreatedNote);

      const result = await createNoteService(mockUserId, noteData);

      expect(result).toEqual(mockCreatedNote);
      expect(mockRepo.createNote).toHaveBeenCalledWith({
        userId: mockUserId,
        ...noteData,
        piiEntities: [],
      });
    });

    it("should handle database errors", async () => {
      const noteData = {
        contentPlain: "Test note",
        contactId: mockContactId,
      };

      mockRepo.createNote.mockRejectedValue(new Error("Database error"));

      await expect(createNoteService(mockUserId, noteData)).rejects.toThrow(AppError);
    });
  });

  describe("updateNoteService", () => {
    it("should update an existing note", async () => {
      const updateData = {
        contentPlain: "Updated note content",
        tags: ["updated"],
      };

      const mockUpdatedNote = {
        id: mockNoteId,
        userId: mockUserId,
        contactId: mockContactId,
        contentPlain: "Updated note content",
        contentRich: {},
        tags: ["updated"],
        piiEntities: [],
        sourceType: "typed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.updateNote.mockResolvedValue(mockUpdatedNote);

      const result = await updateNoteService(mockUserId, mockNoteId, updateData);

      expect(result).toEqual(mockUpdatedNote);
      expect(mockRepo.updateNote).toHaveBeenCalledWith(mockUserId, mockNoteId, {
        ...updateData,
        piiEntities: [],
      });
    });

    it("should throw error when note not found for update", async () => {
      const updateData = { contentPlain: "Updated content" };
      mockRepo.updateNote.mockResolvedValue(null);

      await expect(updateNoteService(mockUserId, "non-existent", updateData)).rejects.toThrow(
        AppError,
      );
    });

    it("should handle database errors", async () => {
      const updateData = { contentPlain: "Updated content" };
      mockRepo.updateNote.mockRejectedValue(new Error("Database error"));

      await expect(updateNoteService(mockUserId, mockNoteId, updateData)).rejects.toThrow(AppError);
    });
  });

  describe("deleteNoteService", () => {
    it("should delete an existing note", async () => {
      mockRepo.deleteNote.mockResolvedValue(true);

      await expect(deleteNoteService(mockUserId, mockNoteId)).resolves.toBeUndefined();
      expect(mockRepo.deleteNote).toHaveBeenCalledWith(mockUserId, mockNoteId);
    });

    it("should throw error when note not found for deletion", async () => {
      mockRepo.deleteNote.mockResolvedValue(false);

      await expect(deleteNoteService(mockUserId, "non-existent")).rejects.toThrow(AppError);
    });

    it("should handle database errors", async () => {
      mockRepo.deleteNote.mockRejectedValue(new Error("Database error"));

      await expect(deleteNoteService(mockUserId, mockNoteId)).rejects.toThrow(AppError);
    });
  });

  describe("getNotesByContactIdService", () => {
    it("should return notes for a specific contact", async () => {
      const mockNotes = [
        {
          id: mockNoteId,
          userId: mockUserId,
          contactId: mockContactId,
          contentPlain: "Contact note",
          contentRich: {},
          tags: [],
          piiEntities: [],
          sourceType: "typed",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepo.getNotesByContactId.mockResolvedValue(mockNotes);

      const result = await getNotesByContactIdService(mockUserId, mockContactId);

      expect(result).toEqual(mockNotes);
      expect(mockRepo.getNotesByContactId).toHaveBeenCalledWith(mockUserId, mockContactId);
    });

    it("should return empty array when no notes found for contact", async () => {
      mockRepo.getNotesByContactId.mockResolvedValue([]);

      const result = await getNotesByContactIdService(mockUserId, "non-existent");

      expect(result).toEqual([]);
    });

    it("should handle database errors", async () => {
      mockRepo.getNotesByContactId.mockRejectedValue(new Error("Database error"));

      await expect(getNotesByContactIdService(mockUserId, mockContactId)).rejects.toThrow(AppError);
    });
  });
});
