// Tasks API Validation Schemas
import { z } from "zod";

// Create Task Request Schema
export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200, "Task title too long").trim(),
  description: z.string().max(1000, "Task description too long").trim().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  estimatedMinutes: z.number().int().min(1).max(10080).optional(), // Max 1 week in minutes
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// Email Suggestion Request Schema
export const EmailSuggestionSchema = z.object({
  purpose: z.string().max(500, "Purpose description too long").trim().optional(),
});

export type EmailSuggestionInput = z.infer<typeof EmailSuggestionSchema>;
