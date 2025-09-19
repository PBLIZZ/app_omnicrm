import { z } from "zod";

/**
 * Note DTO Schema
 *
 * Stable UI-focused contract for note data.
 * Used for both user-created notes and AI-generated insights.
 */
export const NoteDTOSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  content: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type NoteDTO = z.infer<typeof NoteDTOSchema>;

/**
 * Create Note DTO Schema
 *
 * Schema for creating new notes
 */
export const CreateNoteDTOSchema = z.object({
  contactId: z.string().uuid().optional(),
  title: z.string().optional(),
  content: z.string().min(1, "Note content is required"),
});

export type CreateNoteDTO = z.infer<typeof CreateNoteDTOSchema>;

/**
 * Update Note DTO Schema
 *
 * Schema for updating existing notes
 */
export const UpdateNoteDTOSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Note content is required").optional(),
});

export type UpdateNoteDTO = z.infer<typeof UpdateNoteDTOSchema>;