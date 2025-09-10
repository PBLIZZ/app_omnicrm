// Notes API Validation Schemas
import { z } from "zod";

// Create Note Request Schema
export const CreateNoteSchema = z.object({
  content: z.string().min(1, "Note content is required").max(10000, "Note content too long").trim(),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

// Note Response Schema
export const NoteSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string(),
  createdAt: z.string(), // ISO string
  updatedAt: z.string(), // ISO string
});

export type NoteDTO = z.infer<typeof NoteSchema>;
