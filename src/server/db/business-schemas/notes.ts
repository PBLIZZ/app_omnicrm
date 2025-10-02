/**
 * Notes Business Schemas
 *
 * Business logic validation schemas for note-related API endpoints
 * Derived from database schema for type safety
 */

import { z } from "zod";
import { type Note as DbNote, type CreateNote as DbCreateNote } from "@/server/db/schema";

// ============================================================================
// CORE NOTE SCHEMAS - DERIVED FROM DATABASE SCHEMA
// ============================================================================

/**
 * Note Schema - matches database reality exactly
 */
export const NoteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  content: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
}) satisfies z.ZodType<DbNote>;

export type Note = z.infer<typeof NoteSchema>;

/**
 * Create Note Body Schema - for API input validation
 */
export const CreateNoteBodySchema = z.object({
  content: z.string().min(1, "Note content is required"),
  title: z.string().optional(),
  contactId: z.string().uuid().optional(),
});

/**
 * Create Note Schema - matches database insert type
 */
export const CreateNoteSchema = z.object({
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  content: z.string(),
}) satisfies z.ZodType<DbCreateNote>;

export type CreateNote = z.infer<typeof CreateNoteSchema>;

/**
 * Update Note Schema
 */
export const UpdateNoteSchema = CreateNoteSchema.partial().required({ userId: true });
export type UpdateNote = z.infer<typeof UpdateNoteSchema>;

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

