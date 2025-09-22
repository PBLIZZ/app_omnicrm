// ============================================================================
// CHAT DTO SCHEMAS - Aligned with database schema
// ============================================================================

import { z } from "zod";

// ============================================================================
// MESSAGE ROLE ENUM
// ============================================================================

export const MessageRoleEnum = z.enum(["user", "assistant", "tool"]);

// ============================================================================
// THREADS SCHEMAS
// ============================================================================

// Full thread schema (mirrors threads table structure)
export const ThreadSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema for creating new threads
export const CreateThreadSchema = z.object({
  title: z.string().max(500, "Title too long").optional(),
});

// Schema for updating existing threads
export const UpdateThreadSchema = z.object({
  title: z.string().max(500, "Title too long").nullable().optional(),
});

// ============================================================================
// MESSAGES SCHEMAS
// ============================================================================

// Full message schema (mirrors messages table structure)
export const MessageSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  userId: z.string().uuid(),
  role: MessageRoleEnum,
  content: z.unknown(), // JSONB field - can contain various message content structures
  createdAt: z.string().datetime(),
});

// Schema for creating new messages
export const CreateMessageSchema = z.object({
  threadId: z.string().uuid(),
  role: MessageRoleEnum,
  content: z.unknown(), // JSONB field - flexible content structure
});

// Schema for updating existing messages
export const UpdateMessageSchema = z.object({
  content: z.unknown().optional(), // JSONB field
});

// Schema for message queries/filters
export const MessageQuerySchema = z.object({
  threadId: z.string().uuid().optional(),
  role: MessageRoleEnum.optional(),
  search: z.string().optional(), // Search in content
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortOrder: z.enum(["asc", "desc"]).default("desc"), // Most recent first
});

// ============================================================================
// TOOL INVOCATIONS SCHEMAS
// ============================================================================

// Full tool invocation schema (mirrors tool_invocations table structure)
export const ToolInvocationSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  userId: z.string().uuid(),
  tool: z.string(),
  args: z.unknown(), // JSONB field - tool arguments
  result: z.unknown().nullable(), // JSONB field - tool result
  latencyMs: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});

// Schema for creating new tool invocations
export const CreateToolInvocationSchema = z.object({
  messageId: z.string().uuid(),
  tool: z.string().min(1, "Tool name is required"),
  args: z.unknown(), // JSONB field
  result: z.unknown().optional(), // JSONB field
  latencyMs: z.number().int().min(0).optional(),
});

// Schema for updating existing tool invocations
export const UpdateToolInvocationSchema = z.object({
  result: z.unknown().optional(), // JSONB field
  latencyMs: z.number().int().min(0).optional(),
});

// ============================================================================
// CHAT MESSAGE CONTENT SCHEMAS
// ============================================================================

// Schema for text message content
export const TextMessageContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

// Schema for tool call message content
export const ToolCallMessageContentSchema = z.object({
  type: z.literal("tool_call"),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal("function"),
    function: z.object({
      name: z.string(),
      arguments: z.string(), // JSON string
    }),
  })),
});

// Schema for tool result message content
export const ToolResultMessageContentSchema = z.object({
  type: z.literal("tool_result"),
  toolCallId: z.string(),
  result: z.unknown(),
  isError: z.boolean().default(false),
});

// Union schema for all message content types
export const MessageContentSchema = z.discriminatedUnion("type", [
  TextMessageContentSchema,
  ToolCallMessageContentSchema,
  ToolResultMessageContentSchema,
]);

// ============================================================================
// CONVERSATION SCHEMAS
// ============================================================================

// Schema for a complete conversation (thread with messages)
export const ConversationSchema = z.object({
  thread: ThreadSchema,
  messages: z.array(MessageSchema),
  messageCount: z.number().int().min(0),
  latestMessageAt: z.string().datetime().nullable(),
});

// Schema for conversation queries/filters
export const ConversationQuerySchema = z.object({
  search: z.string().optional(), // Search in thread title and message content
  hasMessages: z.boolean().optional(), // Filter threads with/without messages
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(["updatedAt", "createdAt", "title"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================================
// CHAT COMPLETION SCHEMAS
// ============================================================================

// Schema for chat completion request
export const ChatCompletionRequestSchema = z.object({
  threadId: z.string().uuid().optional(), // If not provided, creates new thread
  message: z.string().min(1, "Message is required"),
  model: z.string().optional(), // AI model to use
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(4000).optional(),
  tools: z.array(z.object({
    type: z.literal("function"),
    function: z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.unknown(), // JSON Schema object
    }),
  })).optional(),
});

// Schema for chat completion response
export const ChatCompletionResponseSchema = z.object({
  threadId: z.string().uuid(),
  messageId: z.string().uuid(),
  content: z.string(),
  role: z.literal("assistant"),
  finishReason: z.enum(["stop", "length", "tool_calls", "content_filter"]),
  usage: z.object({
    promptTokens: z.number().int().min(0),
    completionTokens: z.number().int().min(0),
    totalTokens: z.number().int().min(0),
  }).optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal("function"),
    function: z.object({
      name: z.string(),
      arguments: z.unknown(),
    }),
  })).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Thread = z.infer<typeof ThreadSchema>;
export type CreateThread = z.infer<typeof CreateThreadSchema>;
export type UpdateThread = z.infer<typeof UpdateThreadSchema>;

export type Message = z.infer<typeof MessageSchema>;
export type CreateMessage = z.infer<typeof CreateMessageSchema>;
export type UpdateMessage = z.infer<typeof UpdateMessageSchema>;
export type MessageQuery = z.infer<typeof MessageQuerySchema>;

export type ToolInvocation = z.infer<typeof ToolInvocationSchema>;
export type CreateToolInvocation = z.infer<typeof CreateToolInvocationSchema>;
export type UpdateToolInvocation = z.infer<typeof UpdateToolInvocationSchema>;

export type MessageContent = z.infer<typeof MessageContentSchema>;
export type TextMessageContent = z.infer<typeof TextMessageContentSchema>;
export type ToolCallMessageContent = z.infer<typeof ToolCallMessageContentSchema>;
export type ToolResultMessageContent = z.infer<typeof ToolResultMessageContentSchema>;

export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationQuery = z.infer<typeof ConversationQuerySchema>;

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
export type ChatCompletionResponse = z.infer<typeof ChatCompletionResponseSchema>;

export type MessageRole = z.infer<typeof MessageRoleEnum>;