/**
 * Notes Business Schemas
 *
 * Business logic validation schemas for note-related API endpoints
 */

import { z } from "zod";

// ============================================================================
// CORE NOTE SCHEMAS
// ============================================================================

/**
 * Note Schema - Single note response
 */
export const NoteSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  content: z.string(),
  isAIGenerated: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Note = z.infer<typeof NoteSchema>;

/**
 * Create Note Body Schema
 */
export const CreateNoteBodySchema = z.object({
  content: z.string().min(1, "Note content is required"),
  isAIGenerated: z.boolean().default(false),
});

export type CreateNoteBody = z.infer<typeof CreateNoteBodySchema>;

/**
 * Notes List Response Schema
 */
export const NotesListResponseSchema = z.object({
  notes: z.array(NoteSchema),
  total: z.number(),
});

export type NotesListResponse = z.infer<typeof NotesListResponseSchema>;

/**
 * Created Note Response Schema
 */
export const CreatedNoteResponseSchema = NoteSchema;

export type CreatedNoteResponse = z.infer<typeof CreatedNoteResponseSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Get Notes Query Schema (for future filtering)
 */
export const GetNotesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  includeAI: z
    .preprocess((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        const lower = val.toLowerCase();
        if (["false", "0", "no"].includes(lower)) return false;
        if (["true", "1", "yes"].includes(lower)) return true;
      }
      return val;
    }, z.boolean())
    .default(true),
});

export type GetNotesQuery = z.infer<typeof GetNotesQuerySchema>;
