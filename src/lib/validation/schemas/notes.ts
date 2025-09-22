// ============================================================================
// NOTES DTO SCHEMAS - Aligned with database schema
// ============================================================================

import { z } from "zod";

// Full note schema (mirrors notes table structure)
export const NoteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(), // Can be null for general notes
  title: z.string().nullable(),
  content: z.string(),
  createdAt: z.string().datetime(), // ISO string format
  updatedAt: z.string().datetime(), // ISO string format
});

// Schema for creating new notes
export const CreateNoteSchema = z.object({
  contactId: z.string().uuid().optional(), // Optional for general notes
  title: z.string().optional(),
  content: z.string().min(1, "Note content is required").max(10000, "Note content too long").trim(),
});

// Schema for updating existing notes
export const UpdateNoteSchema = z.object({
  title: z.string().nullable().optional(),
  content: z.string().min(1, "Note content is required").max(10000, "Note content too long").trim().optional(),
});

// Schema for note queries/filters
export const NoteQuerySchema = z.object({
  contactId: z.string().uuid().optional(),
  search: z.string().optional(), // Search in title and content
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Note = z.infer<typeof NoteSchema>;
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
export type NoteQuery = z.infer<typeof NoteQuerySchema>;

// Legacy alias for backward compatibility
export type NoteDTO = Note;
