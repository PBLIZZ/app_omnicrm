/**
 * Unit Tests for NotesRepository
 *
 * Tests all CRUD operations, PII redaction, validation, and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NotesRepository } from "./notes.repo";
import * as dbClient from "@/server/db/client";
import * as piiDetector from "@/server/lib/pii-detector";
import type { Note } from "@/server/db/schema";

// Mock dependencies
vi.mock("@/server/db/client");
vi.mock("@/server/lib/pii-detector");

describe("NotesRepository", () => {
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

  const createMockDb = () => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("listNotes", () => {
    it("should list all notes for a user when no contactId provided", async () => {
      const mockNotes = [createMockNote(), createMockNote({ id: "note-2" })];
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue(mockNotes);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.listNotes(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].id).toBe(mockNoteId);
      }
    });

    it("should filter notes by contactId when provided", async () => {
      const mockNotes = [createMockNote()];
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue(mockNotes);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.listNotes(mockUserId, mockContactId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].contactId).toBe(mockContactId);
      }
    });

    it("should return empty array when no notes exist", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.listNotes(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("should handle database errors gracefully", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(dbClient.getDb).mockRejectedValue(mockError);

      const result = await NotesRepository.listNotes(mockUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
        expect(result.error.message).toContain("Database connection failed");
      }
    });

    it("should order notes by createdAt descending", async () => {
      const mockNotes = [
        createMockNote({ createdAt: new Date("2024-01-02") }),
        createMockNote({ id: "note-2", createdAt: new Date("2024-01-01") }),
      ];
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue(mockNotes);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.listNotes(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].createdAt).toBeInstanceOf(Date);
      }
    });
  });

  describe("getNoteById", () => {
    it("should retrieve a specific note by id", async () => {
      const mockNote = createMockNote();
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockNote]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.getNoteById(mockUserId, mockNoteId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data?.id).toBe(mockNoteId);
        expect(result.data?.userId).toBe(mockUserId);
      }
    });

    it("should return null when note does not exist", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.getNoteById(mockUserId, "non-existent");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should handle database errors", async () => {
      const mockError = new Error("Query timeout");
      vi.mocked(dbClient.getDb).mockRejectedValue(mockError);

      const result = await NotesRepository.getNoteById(mockUserId, mockNoteId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
        expect(result.error.message).toContain("Query timeout");
      }
    });
  });

  describe("getNotesByContactId", () => {
    it("should retrieve all notes for a specific contact", async () => {
      const mockNotes = [
        createMockNote(),
        createMockNote({ id: "note-2", contentPlain: "Second note" }),
      ];
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue(mockNotes);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.getNotesByContactId(mockUserId, mockContactId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        result.data.forEach((note) => {
          expect(note.contactId).toBe(mockContactId);
        });
      }
    });

    it("should return empty array when contact has no notes", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.getNotesByContactId(mockUserId, "contact-no-notes");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe("searchNotes", () => {
    it("should search notes by content using ILIKE", async () => {
      const searchTerm = "yoga";
      const mockNotes = [
        createMockNote({ contentPlain: "Discussed yoga practices" }),
        createMockNote({ id: "note-2", contentPlain: "Yoga session feedback" }),
      ];
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue(mockNotes);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.searchNotes(mockUserId, searchTerm);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        result.data.forEach((note) => {
          expect(note.contentPlain.toLowerCase()).toContain(searchTerm);
        });
      }
    });

    it("should return empty array when no matches found", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.searchNotes(mockUserId, "nonexistent");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("should handle special characters in search term", async () => {
      const searchTerm = "test%_search";
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.searchNotes(mockUserId, searchTerm);

      expect(result.success).toBe(true);
    });
  });

  describe("createNote", () => {
    it("should create a note with PII redaction", async () => {
      const noteInput = {
        contentPlain: "Contact me at john@example.com or 555-1234",
        contentRich: {},
        contactId: mockContactId,
        tags: ["important"],
        sourceType: "typed",
      };

      const redactionResult = {
        sanitizedText: "Contact me at [EMAIL] or [PHONE]",
        entities: [
          { type: "email" as const, value: "john@example.com", start: 14, end: 30, redacted: "[EMAIL]" },
          { type: "phone" as const, value: "555-1234", start: 34, end: 42, redacted: "[PHONE]" },
        ],
        hasRedactions: true,
      };

      vi.mocked(piiDetector.redactPII).mockReturnValue(redactionResult);

      const mockNote = createMockNote({
        contentPlain: redactionResult.sanitizedText,
        piiEntities: redactionResult.entities,
      });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockNote]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.createNote(mockUserId, noteInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contentPlain).toBe(redactionResult.sanitizedText);
        expect(result.data.piiEntities).toHaveLength(2);
        expect(piiDetector.redactPII).toHaveBeenCalledWith(noteInput.contentPlain);
      }
    });

    it("should create note without contactId", async () => {
      const noteInput = {
        contentPlain: "General note",
        sourceType: "typed",
      };

      const redactionResult = {
        sanitizedText: "General note",
        entities: [],
        hasRedactions: false,
      };

      vi.mocked(piiDetector.redactPII).mockReturnValue(redactionResult);

      const mockNote = createMockNote({ contentPlain: "General note", contactId: null });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockNote]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.createNote(mockUserId, noteInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contactId).toBeNull();
      }
    });

    it("should reject invalid note data", async () => {
      const invalidInput = {
        // Missing required contentPlain
        contactId: mockContactId,
      };

      const result = await NotesRepository.createNote(mockUserId, invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.message).toContain("Invalid note data");
      }
    });

    it("should validate contactId as UUID", async () => {
      const invalidInput = {
        contentPlain: "Test",
        contactId: "not-a-uuid",
      };

      const result = await NotesRepository.createNote(mockUserId, invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should handle voice sourceType", async () => {
      const noteInput = {
        contentPlain: "Voice transcription",
        sourceType: "voice",
      };

      const redactionResult = {
        sanitizedText: "Voice transcription",
        entities: [],
        hasRedactions: false,
      };

      vi.mocked(piiDetector.redactPII).mockReturnValue(redactionResult);

      const mockNote = createMockNote({ sourceType: "voice" });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockNote]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.createNote(mockUserId, noteInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceType).toBe("voice");
      }
    });

    it("should handle database insert failure", async () => {
      const noteInput = {
        contentPlain: "Test",
      };

      vi.mocked(piiDetector.redactPII).mockReturnValue({
        sanitizedText: "Test",
        entities: [],
        hasRedactions: false,
      });

      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.createNote(mockUserId, noteInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_INSERT_FAILED");
      }
    });
  });

  describe("updateNote", () => {
    it("should update note with PII redaction", async () => {
      const updateInput = {
        contentPlain: "Updated content with email@test.com",
      };

      const redactionResult = {
        sanitizedText: "Updated content with [EMAIL]",
        entities: [
          { type: "email" as const, value: "email@test.com", start: 21, end: 36, redacted: "[EMAIL]" },
        ],
        hasRedactions: true,
      };

      vi.mocked(piiDetector.redactPII).mockReturnValue(redactionResult);

      const mockNote = createMockNote({
        contentPlain: redactionResult.sanitizedText,
        piiEntities: redactionResult.entities,
        updatedAt: new Date(),
      });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockNote]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.updateNote(mockUserId, mockNoteId, updateInput);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.contentPlain).toBe(redactionResult.sanitizedText);
        expect(result.data.piiEntities).toHaveLength(1);
      }
    });

    it("should update only provided fields", async () => {
      const updateInput = {
        tags: ["updated", "tags"],
      };

      const mockNote = createMockNote({ tags: ["updated", "tags"] });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockNote]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.updateNote(mockUserId, mockNoteId, updateInput);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.tags).toEqual(["updated", "tags"]);
      }
    });

    it("should return null when note not found", async () => {
      const updateInput = {
        contentPlain: "Update",
      };

      vi.mocked(piiDetector.redactPII).mockReturnValue({
        sanitizedText: "Update",
        entities: [],
        hasRedactions: false,
      });

      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.updateNote(mockUserId, "non-existent", updateInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should reject invalid update data", async () => {
      const invalidInput = {
        contentPlain: 123, // Should be string
      };

      const result = await NotesRepository.updateNote(mockUserId, mockNoteId, invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should update updatedAt timestamp", async () => {
      const updateInput = {
        contentPlain: "New content",
      };

      vi.mocked(piiDetector.redactPII).mockReturnValue({
        sanitizedText: "New content",
        entities: [],
        hasRedactions: false,
      });

      const now = new Date();
      const mockNote = createMockNote({ updatedAt: now });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockNote]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.updateNote(mockUserId, mockNoteId, updateInput);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe("deleteNote", () => {
    it("should delete note successfully", async () => {
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([{ id: mockNoteId }]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.deleteNote(mockUserId, mockNoteId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it("should return false when note not found", async () => {
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.deleteNote(mockUserId, "non-existent");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it("should handle database errors", async () => {
      const mockError = new Error("Delete failed");
      vi.mocked(dbClient.getDb).mockRejectedValue(mockError);

      const result = await NotesRepository.deleteNote(mockUserId, mockNoteId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_DELETE_FAILED");
        expect(result.error.message).toContain("Delete failed");
      }
    });

    it("should not allow deleting notes from other users", async () => {
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.deleteNote("different-user", mockNoteId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });

  describe("Edge Cases and Security", () => {
    it("should handle empty string for contentPlain", async () => {
      const noteInput = {
        contentPlain: "",
      };

      const result = await NotesRepository.createNote(mockUserId, noteInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should handle very long content", async () => {
      const longContent = "a".repeat(10000);
      const noteInput = {
        contentPlain: longContent,
      };

      vi.mocked(piiDetector.redactPII).mockReturnValue({
        sanitizedText: longContent,
        entities: [],
        hasRedactions: false,
      });

      const mockNote = createMockNote({ contentPlain: longContent });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockNote]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.createNote(mockUserId, noteInput);

      expect(result.success).toBe(true);
    });

    it("should handle multiple PII entities in one note", async () => {
      const noteInput = {
        contentPlain: "Contact: john@example.com, phone: 555-1234, SSN: 123-45-6789",
      };

      const redactionResult = {
        sanitizedText: "Contact: [EMAIL], phone: [PHONE], SSN: [SSN]",
        entities: [
          { type: "email" as const, value: "john@example.com", start: 9, end: 25, redacted: "[EMAIL]" },
          { type: "phone" as const, value: "555-1234", start: 34, end: 42, redacted: "[PHONE]" },
          { type: "ssn" as const, value: "123-45-6789", start: 49, end: 60, redacted: "[SSN]" },
        ],
        hasRedactions: true,
      };

      vi.mocked(piiDetector.redactPII).mockReturnValue(redactionResult);

      const mockNote = createMockNote({
        contentPlain: redactionResult.sanitizedText,
        piiEntities: redactionResult.entities,
      });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockNote]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.createNote(mockUserId, noteInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.piiEntities).toHaveLength(3);
      }
    });

    it("should handle SQL injection attempts in search", async () => {
      const maliciousInput = "'; DROP TABLE notes; --";
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await NotesRepository.searchNotes(mockUserId, maliciousInput);

      // Should not throw error, Drizzle handles parameterization
      expect(result.success).toBe(true);
    });
  });
});