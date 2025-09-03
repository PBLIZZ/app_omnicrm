// Zod schemas for API validation
import { z } from "zod";

// Re-export schemas from lib directory
import { UpdateContactBodySchema, BulkDeleteBodySchema } from "@/lib/schemas/contacts";

export { UpdateContactBodySchema, BulkDeleteBodySchema };

export const SimpleChatRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(4000, "Prompt too long"),
});

export const StreamingChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(4000, "Message too long"),
  threadId: z.string().uuid().optional(),
});

export type SimpleChatRequest = z.infer<typeof SimpleChatRequestSchema>;
export type StreamingChatRequest = z.infer<typeof StreamingChatRequestSchema>;
export type UpdateContactBody = z.infer<typeof UpdateContactBodySchema>;
export type BulkDeleteBody = z.infer<typeof BulkDeleteBodySchema>;