/**
 * Notes Business Schemas
 *
 * For base types, import from @/server/db/schema:
 * - Note (select type)
 * - CreateNote (insert type)
 * - UpdateNote (partial insert type)
 *
 * This file contains ONLY API-specific schemas for note operations.
 *
 * Updated for new Notes spec:
 * - content_rich (TipTap JSON)
 * - content_plain (redacted text for search/AI)
 * - pii_entities (redaction metadata)
 * - tags (text array)
 * - source_type (typed | voice | upload)
 */

import { z } from "zod";

// Re-export base types from schema for convenience
export type { Note, CreateNote, UpdateNote } from "@/server/db/schema";

// ============================================================================
// API-SPECIFIC SCHEMAS
// ============================================================================

/**
 * Note Source Type Enum
 */
export const NoteSourceTypeSchema = z.enum(["typed", "voice", "upload"]);
export type NoteSourceType = z.infer<typeof NoteSourceTypeSchema>;

/**
 * Create Note Body Schema - for API input validation
 * Accepts either plain text or rich content
 */
export const CreateNoteBodySchema = z.object({
  contentPlain: z.string().min(1, "Note content is required"),
  contentRich: z.record(z.string(), z.unknown()).optional(), // TipTap JSON (optional, can be derived)
  tags: z.array(z.string()).optional().default([]),
  goalIds: z.array(z.string().uuid()).optional(),
  sourceType: NoteSourceTypeSchema.optional().default("typed"),
  contactId: z.string().uuid("Valid contact ID is required"),
});

/**
 * Update Note Schema
 */
export const UpdateNoteBodySchema = z.object({
  contentPlain: z.string().min(1).optional(),
  contentRich: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  goalIds: z.array(z.string().uuid()).optional(),
});

/**
 * Notes List Response Schema
 */
export const NotesListResponseSchema = z.object({
  notes: z.array(z.unknown()), // Will be validated as Note[] at runtime
  total: z.number(),
});

export type NotesListResponse = z.infer<typeof NotesListResponseSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Get Notes Query Schema
 */
export const GetNotesQuerySchema = z.object({
  contactId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
