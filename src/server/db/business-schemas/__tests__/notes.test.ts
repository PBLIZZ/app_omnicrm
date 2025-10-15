/**
 * Notes Business Schemas Tests
 *
 * Validates note operation schemas including create, update, query,
 * and response validation with proper PII handling.
 */

import { describe, it, expect } from "vitest";
import {
  NoteSourceTypeSchema,
  CreateNoteBodySchema,
  UpdateNoteBodySchema,
  NotesListResponseSchema,
  GetNotesQuerySchema,
} from "../notes";

describe("Notes Business Schemas", () => {
  describe("NoteSourceTypeSchema", () => {
    it("should validate typed source", () => {
      const result = NoteSourceTypeSchema.parse("typed");
      expect(result).toBe("typed");
    });

    it("should validate voice source", () => {
      const result = NoteSourceTypeSchema.parse("voice");
      expect(result).toBe("voice");
    });

    it("should validate upload source", () => {
      const result = NoteSourceTypeSchema.parse("upload");
      expect(result).toBe("upload");
    });

    it("should reject invalid source type", () => {
      expect(() => NoteSourceTypeSchema.parse("invalid")).toThrow();
      expect(() => NoteSourceTypeSchema.parse("email")).toThrow();
      expect(() => NoteSourceTypeSchema.parse("")).toThrow();
    });
  });

  describe("CreateNoteBodySchema", () => {
    it("should validate minimal note with plain text", () => {
      const input = {
        contentPlain: "This is a test note",
      };
      
      const result = CreateNoteBodySchema.parse(input);
      
      expect(result.contentPlain).toBe("This is a test note");
      expect(result.tags).toEqual([]);
      expect(result.sourceType).toBe("typed");
      expect(result.contentRich).toBeUndefined();
      expect(result.contactId).toBeUndefined();
    });

    it("should validate note with all fields", () => {
      const input = {
        contentPlain: "Meeting notes",
        contentRich: { type: "doc", content: [] },
        tags: ["important", "follow-up"],
        goalIds: ["550e8400-e29b-41d4-a716-446655440000"],
        sourceType: "voice" as const,
        contactId: "650e8400-e29b-41d4-a716-446655440000",
      };
      
      const result = CreateNoteBodySchema.parse(input);
      
      expect(result.contentPlain).toBe("Meeting notes");
      expect(result.contentRich).toEqual({ type: "doc", content: [] });
      expect(result.tags).toEqual(["important", "follow-up"]);
      expect(result.goalIds).toHaveLength(1);
      expect(result.sourceType).toBe("voice");
      expect(result.contactId).toBe("650e8400-e29b-41d4-a716-446655440000");
    });

    it("should require contentPlain", () => {
      const input = {};
      expect(() => CreateNoteBodySchema.parse(input)).toThrow();
    });

    it("should reject empty contentPlain", () => {
      const input = { contentPlain: "" };
      expect(() => CreateNoteBodySchema.parse(input)).toThrow();
    });

    it("should validate TipTap JSON structure in contentRich", () => {
      const input = {
        contentPlain: "Text version",
        contentRich: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello" }],
            },
          ],
        },
      };
      
      const result = CreateNoteBodySchema.parse(input);
      expect(result.contentRich).toBeDefined();
    });

    it("should validate empty tags array", () => {
      const input = {
        contentPlain: "Test note",
        tags: [],
      };
      
      const result = CreateNoteBodySchema.parse(input);
      expect(result.tags).toEqual([]);
    });

    it("should validate multiple tags", () => {
      const input = {
        contentPlain: "Test note",
        tags: ["wellness", "yoga", "nutrition", "follow-up"],
      };
      
      const result = CreateNoteBodySchema.parse(input);
      expect(result.tags).toHaveLength(4);
    });

    it("should validate UUID format for contactId", () => {
      const validInput = {
        contentPlain: "Test",
        contactId: "550e8400-e29b-41d4-a716-446655440000",
      };
      
      expect(() => CreateNoteBodySchema.parse(validInput)).not.toThrow();
      
      const invalidInput = {
        contentPlain: "Test",
        contactId: "not-a-uuid",
      };
      
      expect(() => CreateNoteBodySchema.parse(invalidInput)).toThrow();
    });

    it("should validate UUID format for goalIds", () => {
      const validInput = {
        contentPlain: "Test",
        goalIds: [
          "550e8400-e29b-41d4-a716-446655440000",
          "660e8400-e29b-41d4-a716-446655440001",
        ],
      };
      
      expect(() => CreateNoteBodySchema.parse(validInput)).not.toThrow();
      
      const invalidInput = {
        contentPlain: "Test",
        goalIds: ["not-a-uuid"],
      };
      
      expect(() => CreateNoteBodySchema.parse(invalidInput)).toThrow();
    });

    it("should default sourceType to typed", () => {
      const input = { contentPlain: "Test note" };
      const result = CreateNoteBodySchema.parse(input);
      expect(result.sourceType).toBe("typed");
    });

    it("should validate all sourceType options", () => {
      const sources: Array<"typed" | "voice" | "upload"> = ["typed", "voice", "upload"];
      
      sources.forEach((source) => {
        const result = CreateNoteBodySchema.parse({
          contentPlain: "Test",
          sourceType: source,
        });
        expect(result.sourceType).toBe(source);
      });
    });
  });

  describe("UpdateNoteBodySchema", () => {
    it("should validate with all fields optional", () => {
      const result = UpdateNoteBodySchema.parse({});
      expect(result).toEqual({});
    });

    it("should validate partial updates", () => {
      const input = {
        contentPlain: "Updated content",
      };
      
      const result = UpdateNoteBodySchema.parse(input);
      expect(result.contentPlain).toBe("Updated content");
    });

    it("should validate updating contentRich", () => {
      const input = {
        contentRich: { type: "doc", content: [] },
      };
      
      const result = UpdateNoteBodySchema.parse(input);
      expect(result.contentRich).toBeDefined();
    });

    it("should validate updating tags", () => {
      const input = {
        tags: ["updated-tag"],
      };
      
      const result = UpdateNoteBodySchema.parse(input);
      expect(result.tags).toEqual(["updated-tag"]);
    });

    it("should validate updating goalIds", () => {
      const input = {
        goalIds: ["550e8400-e29b-41d4-a716-446655440000"],
      };
      
      const result = UpdateNoteBodySchema.parse(input);
      expect(result.goalIds).toHaveLength(1);
    });

    it("should reject empty contentPlain if provided", () => {
      const input = { contentPlain: "" };
      expect(() => UpdateNoteBodySchema.parse(input)).toThrow();
    });

    it("should validate UUID format for goalIds", () => {
      const invalidInput = {
        goalIds: ["invalid-uuid"],
      };
      
      expect(() => UpdateNoteBodySchema.parse(invalidInput)).toThrow();
    });

    it("should validate multiple field updates", () => {
      const input = {
        contentPlain: "New content",
        tags: ["new-tag"],
        goalIds: ["550e8400-e29b-41d4-a716-446655440000"],
      };
      
      const result = UpdateNoteBodySchema.parse(input);
      expect(result.contentPlain).toBe("New content");
      expect(result.tags).toEqual(["new-tag"]);
      expect(result.goalIds).toHaveLength(1);
    });
  });

  describe("NotesListResponseSchema", () => {
    it("should validate empty notes list", () => {
      const input = {
        notes: [],
        total: 0,
      };
      
      const result = NotesListResponseSchema.parse(input);
      expect(result.notes).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should validate notes list with items", () => {
      const input = {
        notes: [
          { id: "1", content: "Note 1" },
          { id: "2", content: "Note 2" },
        ],
        total: 2,
      };
      
      const result = NotesListResponseSchema.parse(input);
      expect(result.notes).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should require notes array", () => {
      const input = {
        total: 0,
      };
      
      expect(() => NotesListResponseSchema.parse(input)).toThrow();
    });

    it("should require total field", () => {
      const input = {
        notes: [],
      };
      
      expect(() => NotesListResponseSchema.parse(input)).toThrow();
    });

    it("should reject non-array notes", () => {
      const input = {
        notes: "not an array",
        total: 0,
      };
      
      expect(() => NotesListResponseSchema.parse(input)).toThrow();
    });

    it("should reject non-number total", () => {
      const input = {
        notes: [],
        total: "0",
      };
      
      expect(() => NotesListResponseSchema.parse(input)).toThrow();
    });
  });

  describe("GetNotesQuerySchema", () => {
    it("should validate with defaults", () => {
      const result = GetNotesQuerySchema.parse({});
      
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.contactId).toBeUndefined();
      expect(result.search).toBeUndefined();
    });

    it("should validate with all parameters", () => {
      const input = {
        contactId: "550e8400-e29b-41d4-a716-446655440000",
        search: "test query",
        limit: 20,
        offset: 10,
      };
      
      const result = GetNotesQuerySchema.parse(input);
      
      expect(result.contactId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.search).toBe("test query");
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(10);
    });

    it("should validate UUID format for contactId", () => {
      const invalidInput = {
        contactId: "not-a-uuid",
      };
      
      expect(() => GetNotesQuerySchema.parse(invalidInput)).toThrow();
    });

    it("should enforce minimum limit", () => {
      const input = { limit: 0 };
      expect(() => GetNotesQuerySchema.parse(input)).toThrow();
    });

    it("should enforce maximum limit", () => {
      const input = { limit: 101 };
      expect(() => GetNotesQuerySchema.parse(input)).toThrow();
    });

    it("should accept boundary limit values", () => {
      const min = GetNotesQuerySchema.parse({ limit: 1 });
      const max = GetNotesQuerySchema.parse({ limit: 100 });
      
      expect(min.limit).toBe(1);
      expect(max.limit).toBe(100);
    });

    it("should enforce minimum offset", () => {
      const input = { offset: -1 };
      expect(() => GetNotesQuerySchema.parse(input)).toThrow();
    });

    it("should accept zero offset", () => {
      const result = GetNotesQuerySchema.parse({ offset: 0 });
      expect(result.offset).toBe(0);
    });

    it("should coerce string numbers to integers", () => {
      const result = GetNotesQuerySchema.parse({
        limit: "25",
        offset: "10",
      } as any);
      
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(10);
    });

    it("should validate empty search string", () => {
      const result = GetNotesQuerySchema.parse({ search: "" });
      expect(result.search).toBe("");
    });

    it("should validate search with special characters", () => {
      const result = GetNotesQuerySchema.parse({
        search: "test @#$ %^& query",
      });
      expect(result.search).toBe("test @#$ %^& query");
    });
  });
});
