// Zod schemas for API validation
import { z } from "zod";

export const SimpleChatRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(4000, "Prompt too long"),
});

export const StreamingChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(4000, "Message too long"),
  threadId: z.string().uuid().optional(),
});

export type SimpleChatRequest = z.infer<typeof SimpleChatRequestSchema>;
export type StreamingChatRequest = z.infer<typeof StreamingChatRequestSchema>;