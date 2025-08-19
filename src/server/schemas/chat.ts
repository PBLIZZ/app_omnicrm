// OpenRouter-style chat request/response schemas
// Data types sourced from server/db/schema.ts (canonical database schema)
// No manual types created - all types inferred from zod schemas

import { z } from "zod";

// Message role matching database enum
export const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// OpenRouter-style chat request (for api/openrouter)
export const ChatRequestSchema = z
  .object({
    model: z.string().min(1),
    messages: z.array(ChatMessageSchema).min(1),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    stream: z.boolean().optional(),
  })
  .strict();
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// OpenRouter-style chat response
export const ChatResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  message: ChatMessageSchema,
  usage: z
    .object({
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative(),
    })
    .optional(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// Simple chat request (for api/chat - existing simple endpoint)
export const SimpleChatRequestSchema = z.object({
  prompt: z.string().min(1, "prompt must not be empty").max(4000, "prompt too long"),
});
export type SimpleChatRequest = z.infer<typeof SimpleChatRequestSchema>;
