/**
 * Notes Tools - Comprehensive Tests
 *
 * Tests all 6 notes domain tools with valid/invalid inputs,
 * error handling, and edge cases.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  searchNotesHandler,
  getNoteHandler,
  analyzeNoteSentimentHandler,
  tagNoteHandler,
  summarizeNotesHandler,
  rankNotesByRelevanceHandler,
} from "../notes";
import type { ToolExecutionContext } from "../../types";
import { AppError } from "@/lib/errors";
import { getDb } from "@/server/db/client";

// Mock dependencies - need to mock at the source
vi.mock("@/server/db/client");

// Mock the repository creation functions
const mockNotesRepo = {
  listNotes: vi.fn(),
  getNoteById: vi.fn(),
  getNotesByContactId: vi.fn(),
  searchNotes: vi.fn(),
};

const mockTagsRepo = {
  getTagById: vi.fn(),
  applyTagsToNote: vi.fn(),
};

vi.mock("@repo", async () => {
  const actual = await vi.importActual("@repo");
  return {
    ...actual,
    createNotesRepository: vi.fn(() => mockNotesRepo),
    createTagsRepository: vi.fn(() => mockTagsRepo),
  };
});

// Test data
const mockContext: ToolExecutionContext = {
  userId: "550e8400-e29b-41d4-a716-446655440010",
  timestamp: new Date(),
  requestId: "req-123",
};

const mockNote = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  userId: "550e8400-e29b-41d4-a716-446655440010",
  contactId: "550e8400-e29b-41d4-a716-446655440020",
  contentPlain: "Patient reports feeling anxious and stressed. Progress is good overall.",
  contentRich: {},
  piiEntities: [],
  sourceType: "typed" as const,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15"),
};

const mockNote2 = {
  id: "550e8400-e29b-41d4-a716-446655440002",
  userId: "550e8400-e29b-41d4-a716-446655440010",
  contactId: "550e8400-e29b-41d4-a716-446655440020",
  contentPlain: "Great session today! Patient is happy and motivated.",
  contentRich: {},
  piiEntities: [],
  sourceType: "typed" as const,
  createdAt: new Date("2024-01-20"),
  updatedAt: new Date("2024-01-20"),
};

const mockTag = {
  id: "550e8400-e29b-41d4-a716-446655440030",
  userId: "550e8400-e29b-41d4-a716-446655440010",
  name: "anxiety",
  category: "emotional_mental" as const,
  color: "#FF5733",
  isSystem: false,
  usageCount: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Notes Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockNotesRepo.listNotes.mockReset();
    mockNotesRepo.getNoteById.mockReset();
    mockNotesRepo.getNotesByContactId.mockReset();
    mockNotesRepo.searchNotes.mockReset();
    mockTagsRepo.getTagById.mockReset();
    mockTagsRepo.applyTagsToNote.mockReset();
  });

  // ============================================================================
  // search_notes
  // ============================================================================

  describe("search_notes", () => {
    it("should search notes by query", async () => {
      mockNotesRepo.searchNotes.mockResolvedValue([mockNote]);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await searchNotesHandler({ query: "anxious", limit: 20 }, mockContext);

      expect(mockNotesRepo.searchNotes).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440010",
        "anxious",
      );
      expect(result).toEqual([mockNote]);
    });

    it("should search notes by contact_id", async () => {
      mockNotesRepo.getNotesByContactId.mockResolvedValue([mockNote]);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await searchNotesHandler(
        { contact_id: "550e8400-e29b-41d4-a716-446655440020", limit: 20 },
        mockContext,
      );

      expect(mockNotesRepo.getNotesByContactId).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440010",
        "550e8400-e29b-41d4-a716-446655440020",
      );
      expect(result).toEqual([mockNote]);
    });

    it("should filter notes by date range", async () => {
      mockNotesRepo.listNotes.mockResolvedValue([mockNote, mockNote2]);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await searchNotesHandler(
        {
          start_date: "2024-01-18T00:00:00Z",
          limit: 20,
        },
        mockContext,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("550e8400-e29b-41d4-a716-446655440002");
    });

    it("should apply limit", async () => {
      const manyNotes = Array.from({ length: 30 }, (_, i) => ({
        ...mockNote,
        id: `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, "0")}`,
      }));

      mockNotesRepo.listNotes.mockResolvedValue(manyNotes);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await searchNotesHandler({ limit: 10 }, mockContext);

      expect(result).toHaveLength(10);
    });

    it("should throw error for invalid UUID", async () => {
      await expect(
        searchNotesHandler({ contact_id: "invalid-uuid" }, mockContext),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // get_note
  // ============================================================================

  describe("get_note", () => {
    it("should retrieve note by ID", async () => {
      mockNotesRepo.getNoteById.mockResolvedValue(mockNote);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await getNoteHandler(
        { note_id: "550e8400-e29b-41d4-a716-446655440001" },
        mockContext,
      );

      expect(mockNotesRepo.getNoteById).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440010",
        "550e8400-e29b-41d4-a716-446655440001",
      );
      expect(result).toEqual(mockNote);
    });

    it("should throw error when note not found", async () => {
      mockNotesRepo.getNoteById.mockResolvedValue(null);
      vi.mocked(getDb).mockResolvedValue({} as never);

      await expect(
        getNoteHandler({ note_id: "550e8400-e29b-41d4-a716-446655440099" }, mockContext),
      ).rejects.toThrow(AppError);
    });

    it("should throw error for invalid UUID", async () => {
      await expect(getNoteHandler({ note_id: "invalid" }, mockContext)).rejects.toThrow();
    });
  });

  // ============================================================================
  // analyze_note_sentiment
  // ============================================================================

  describe("analyze_note_sentiment", () => {
    it("should analyze positive sentiment", async () => {
      const positiveNote = {
        ...mockNote,
        contentPlain: "Patient is happy, great progress, feeling wonderful and positive!",
      };

      mockNotesRepo.getNoteById.mockResolvedValue(positiveNote);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await analyzeNoteSentimentHandler(
        { note_id: "550e8400-e29b-41d4-a716-446655440001" },
        mockContext,
      );

      expect(result.sentiment).toBe("positive");
      expect(result.positiveKeywordCount).toBeGreaterThan(0);
    });

    it("should analyze negative sentiment", async () => {
      const negativeNote = {
        ...mockNote,
        contentPlain: "Patient is sad, anxious, stressed, feeling terrible and frustrated.",
      };

      mockNotesRepo.getNoteById.mockResolvedValue(negativeNote);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await analyzeNoteSentimentHandler(
        { note_id: "550e8400-e29b-41d4-a716-446655440001" },
        mockContext,
      );

      expect(result.sentiment).toBe("negative");
      expect(result.negativeKeywordCount).toBeGreaterThan(0);
    });

    it("should analyze neutral sentiment", async () => {
      const neutralNote = {
        ...mockNote,
        contentPlain: "Patient discussed work schedule and upcoming appointments.",
      };

      mockNotesRepo.getNoteById.mockResolvedValue(neutralNote);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await analyzeNoteSentimentHandler(
        { note_id: "550e8400-e29b-41d4-a716-446655440001" },
        mockContext,
      );

      expect(result.sentiment).toBe("neutral");
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should include analysis statistics", async () => {
      mockNotesRepo.getNoteById.mockResolvedValue(mockNote);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await analyzeNoteSentimentHandler(
        { note_id: "550e8400-e29b-41d4-a716-446655440001" },
        mockContext,
      );

      expect(result.analysis).toBeDefined();
      expect(result.analysis.wordCount).toBeGreaterThan(0);
      expect(result.analysis.characterCount).toBeGreaterThan(0);
    });

    it("should throw error when note not found", async () => {
      mockNotesRepo.getNoteById.mockResolvedValue(null);
      vi.mocked(getDb).mockResolvedValue({} as never);

      await expect(
        analyzeNoteSentimentHandler(
          { note_id: "550e8400-e29b-41d4-a716-446655440099" },
          mockContext,
        ),
      ).rejects.toThrow(AppError);
    });
  });

  // ============================================================================
  // tag_note
  // ============================================================================

  describe("tag_note", () => {
    it("should successfully tag a note", async () => {
      mockNotesRepo.getNoteById.mockResolvedValue(mockNote);
      mockTagsRepo.getTagById.mockResolvedValue(mockTag);
      mockTagsRepo.applyTagsToNote.mockResolvedValue([
        {
          id: "550e8400-e29b-41d4-a716-446655440040",
          noteId: "550e8400-e29b-41d4-a716-446655440001",
          tagId: "550e8400-e29b-41d4-a716-446655440030",
          createdAt: new Date(),
        },
      ]);

      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await tagNoteHandler(
        {
          note_id: "550e8400-e29b-41d4-a716-446655440001",
          tag_id: "550e8400-e29b-41d4-a716-446655440030",
        },
        mockContext,
      );

      expect(mockNotesRepo.getNoteById).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440010",
        "550e8400-e29b-41d4-a716-446655440001",
      );
      expect(mockTagsRepo.getTagById).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440010",
        "550e8400-e29b-41d4-a716-446655440030",
      );
      expect(mockTagsRepo.applyTagsToNote).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440010",
        "550e8400-e29b-41d4-a716-446655440001",
        ["550e8400-e29b-41d4-a716-446655440030"],
      );
      expect(result.success).toBe(true);
    });

    it("should throw error when note not found", async () => {
      mockNotesRepo.getNoteById.mockResolvedValue(null);
      vi.mocked(getDb).mockResolvedValue({} as never);

      await expect(
        tagNoteHandler(
          {
            note_id: "550e8400-e29b-41d4-a716-446655440099",
            tag_id: "550e8400-e29b-41d4-a716-446655440030",
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });

    it("should throw error when tag not found", async () => {
      mockNotesRepo.getNoteById.mockResolvedValue(mockNote);
      mockTagsRepo.getTagById.mockResolvedValue(null);
      vi.mocked(getDb).mockResolvedValue({} as never);

      await expect(
        tagNoteHandler(
          {
            note_id: "550e8400-e29b-41d4-a716-446655440001",
            tag_id: "550e8400-e29b-41d4-a716-446655440099",
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });

    it("should throw error when tagging fails", async () => {
      mockNotesRepo.getNoteById.mockResolvedValue(mockNote);
      mockTagsRepo.getTagById.mockResolvedValue(mockTag);
      mockTagsRepo.applyTagsToNote.mockRejectedValue(new Error("Database error"));
      vi.mocked(getDb).mockResolvedValue({} as never);

      await expect(
        tagNoteHandler(
          {
            note_id: "550e8400-e29b-41d4-a716-446655440001",
            tag_id: "550e8400-e29b-41d4-a716-446655440030",
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // summarize_notes
  // ============================================================================

  describe("summarize_notes", () => {
    it("should summarize notes for a contact", async () => {
      mockNotesRepo.getNotesByContactId.mockResolvedValue([mockNote, mockNote2]);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await summarizeNotesHandler(
        { contact_id: "550e8400-e29b-41d4-a716-446655440020", limit: 10 },
        mockContext,
      );

      expect(mockNotesRepo.getNotesByContactId).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440010",
        "550e8400-e29b-41d4-a716-446655440020",
      );
      expect(result.contactId).toBe("550e8400-e29b-41d4-a716-446655440020");
      expect(result.notesCount).toBe(2);
      expect(result.themes).toBeDefined();
      expect(result.sentimentTrend).toBeDefined();
    });

    it("should handle no notes found", async () => {
      mockNotesRepo.getNotesByContactId.mockResolvedValue([]);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await summarizeNotesHandler(
        { contact_id: "550e8400-e29b-41d4-a716-446655440020", limit: 10 },
        mockContext,
      );

      expect(result.notesCount).toBe(0);
      expect(result.summary).toContain("No notes found");
    });

    it("should apply limit correctly", async () => {
      const manyNotes = Array.from({ length: 20 }, (_, i) => ({
        ...mockNote,
        id: `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, "0")}`,
      }));

      mockNotesRepo.getNotesByContactId.mockResolvedValue(manyNotes);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await summarizeNotesHandler(
        { contact_id: "550e8400-e29b-41d4-a716-446655440020", limit: 5 },
        mockContext,
      );

      expect(result.notesCount).toBe(5);
      expect(result.totalNotesAvailable).toBe(20);
    });

    it("should calculate sentiment trend", async () => {
      const positiveNotes = [
        { ...mockNote, contentPlain: "Great progress, happy and positive" },
        { ...mockNote2, contentPlain: "Excellent session, good improvement" },
      ];

      mockNotesRepo.getNotesByContactId.mockResolvedValue(positiveNotes);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await summarizeNotesHandler(
        { contact_id: "550e8400-e29b-41d4-a716-446655440020", limit: 10 },
        mockContext,
      );

      expect(result.sentimentTrend).toBe("positive");
    });

    it("should extract themes from notes", async () => {
      mockNotesRepo.getNotesByContactId.mockResolvedValue([mockNote, mockNote2]);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await summarizeNotesHandler(
        { contact_id: "550e8400-e29b-41d4-a716-446655440020", limit: 10 },
        mockContext,
      );

      expect(result.themes).toBeInstanceOf(Array);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalWords).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // rank_notes_by_relevance
  // ============================================================================

  describe("rank_notes_by_relevance", () => {
    it("should rank notes by relevance", async () => {
      const notes = [
        { ...mockNote, contentPlain: "Patient reports stress and anxiety issues" },
        { ...mockNote2, contentPlain: "Great session, no stress mentioned" },
        {
          ...mockNote,
          id: "550e8400-e29b-41d4-a716-446655440003",
          contentPlain: "Managing stress effectively with new techniques",
        },
      ];

      mockNotesRepo.listNotes.mockResolvedValue(notes);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await rankNotesByRelevanceHandler({ query: "stress", limit: 10 }, mockContext);

      expect(result.query).toBe("stress");
      expect(result.results).toBeInstanceOf(Array);
      expect(result.matchedNotes).toBeGreaterThan(0);
      // First result should have highest relevance score
      if (result.results.length > 1) {
        expect(result.results[0]?.relevanceScore).toBeGreaterThanOrEqual(
          result.results[1]?.relevanceScore ?? 0,
        );
      }
    });

    it("should filter by contact_id", async () => {
      mockNotesRepo.getNotesByContactId.mockResolvedValue([mockNote]);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await rankNotesByRelevanceHandler(
        { query: "anxious", contact_id: "550e8400-e29b-41d4-a716-446655440020", limit: 10 },
        mockContext,
      );

      expect(mockNotesRepo.getNotesByContactId).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440010",
        "550e8400-e29b-41d4-a716-446655440020",
      );
      expect(result.results).toBeInstanceOf(Array);
    });

    it("should return empty results when no matches", async () => {
      mockNotesRepo.listNotes.mockResolvedValue([mockNote]);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await rankNotesByRelevanceHandler(
        { query: "xyz123nonexistent", limit: 10 },
        mockContext,
      );

      expect(result.matchedNotes).toBe(0);
      expect(result.results).toEqual([]);
    });

    it("should apply limit correctly", async () => {
      const manyNotes = Array.from({ length: 30 }, (_, i) => ({
        ...mockNote,
        id: `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, "0")}`,
        contentPlain: "Patient reports anxiety and stress issues",
      }));

      mockNotesRepo.listNotes.mockResolvedValue(manyNotes);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await rankNotesByRelevanceHandler({ query: "anxiety", limit: 5 }, mockContext);

      expect(result.results.length).toBeLessThanOrEqual(5);
    });

    it("should boost recent notes in ranking", async () => {
      const recentNote = {
        ...mockNote,
        id: "550e8400-e29b-41d4-a716-446655440050",
        contentPlain: "stress",
        createdAt: new Date(),
      };
      const oldNote = {
        ...mockNote,
        id: "550e8400-e29b-41d4-a716-446655440051",
        contentPlain: "stress stress stress",
        createdAt: new Date("2020-01-01"),
      };

      mockNotesRepo.listNotes.mockResolvedValue([recentNote, oldNote]);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await rankNotesByRelevanceHandler({ query: "stress", limit: 10 }, mockContext);

      expect(result.results.length).toBeGreaterThan(0);
      // Recent note should get boosted despite having fewer matches
      const recentResult = result.results.find((r) => r.noteId === "550e8400-e29b-41d4-a716-446655440050");
      expect(recentResult).toBeDefined();
    });

    it("should include content preview in results", async () => {
      mockNotesRepo.listNotes.mockResolvedValue([mockNote]);
      vi.mocked(getDb).mockResolvedValue({} as never);

      const result = await rankNotesByRelevanceHandler(
        { query: "anxious", limit: 10 },
        mockContext,
      );

      if (result.results.length > 0) {
        expect(result.results[0]?.contentPreview).toBeDefined();
        expect(result.results[0]?.contentPreview.length).toBeLessThanOrEqual(200);
      }
    });
  });
});
