/**
 * Chat API Business Schemas
 *
 * For base types, import from @/server/db/schema:
 * - Thread, Message, ToolInvocation (select types)
 * - CreateThread, CreateMessage, CreateToolInvocation (insert types)
 * - UpdateThread, UpdateMessage, UpdateToolInvocation (partial insert types)
 *
 * Generated from Drizzle schema using drizzle-zod.
 *
 * This file contains ONLY API-specific schemas and business logic validations.
 */

import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { threads, messages, toolInvocations } from "@/server/db/schema";

// Re-export base types from schema for convenience
export type {
  Thread,
  CreateThread,
  UpdateThread,
  Message,
  CreateMessage,
  UpdateMessage,
  ToolInvocation,
  CreateToolInvocation,
  UpdateToolInvocation,
  ThreadWithMessages,
  MessageWithTools,
} from "@/server/db/schema";

// Create Zod schemas from Drizzle tables for API validation
const ThreadDataSchema = createSelectSchema(threads);
const MessageDataSchema = createSelectSchema(messages);
const ToolInvocationDataSchema = createSelectSchema(toolInvocations);

// Export base schemas for single entity responses
export const ThreadSchema = ThreadDataSchema.extend({
  title: z.string().nullable(),
});

export const MessageSchema = MessageDataSchema.extend({
  content: z.unknown(), // JSONB field
});

export const ToolInvocationSchema = ToolInvocationDataSchema.extend({
  args: z.unknown(), // JSONB field
  result: z.unknown().nullable(), // JSONB field
  latencyMs: z.number().int().nullable(),
});

// ============================================================================
// API REQUEST SCHEMAS - THREADS
// ============================================================================

/**
 * POST /api/chat/threads - Create thread
 */
export const CreateThreadBodySchema = z.object({
  title: z.string().optional(),
});

export type CreateThreadBody = z.infer<typeof CreateThreadBodySchema>;

/**
 * PATCH /api/chat/threads/[id] - Update thread
 */
export const UpdateThreadBodySchema = z.object({
  title: z.string().nullish(),
});

export type UpdateThreadBody = z.infer<typeof UpdateThreadBodySchema>;

/**
 * GET /api/chat/threads - Query parameters
 */
export const GetThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "updatedAt"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type GetThreadsQuery = z.infer<typeof GetThreadsQuerySchema>;

// ============================================================================
// API REQUEST SCHEMAS - MESSAGES
// ============================================================================

/**
 * POST /api/chat/threads/[threadId]/messages - Create message
 */
export const CreateMessageBodySchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.unknown(), // JSONB content (can be text, structured data, etc.)
});

export type CreateMessageBody = z.infer<typeof CreateMessageBodySchema>;

/**
 * GET /api/chat/threads/[threadId]/messages - Query parameters
 */
export const GetMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  order: z.enum(["asc", "desc"]).default("asc"), // Usually chronological for chat
});

export type GetMessagesQuery = z.infer<typeof GetMessagesQuerySchema>;

// ============================================================================
// API REQUEST SCHEMAS - TOOL INVOCATIONS
// ============================================================================

/**
 * POST /api/chat/messages/[messageId]/tools - Create tool invocation
 */
export const CreateToolInvocationBodySchema = z.object({
  tool: z.string().min(1),
  args: z.unknown(), // JSONB args
  result: z.unknown().optional(), // JSONB result
  latencyMs: z.number().int().positive().optional(),
});

export type CreateToolInvocationBody = z.infer<typeof CreateToolInvocationBodySchema>;

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

/**
 * GET /api/chat/threads - List response
 */
export const ThreadListResponseSchema = z.object({
  items: z.array(ThreadDataSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type ThreadListResponse = z.infer<typeof ThreadListResponseSchema>;

/**
 * GET /api/chat/threads/[id] - Single thread with messages
 */
export const ThreadWithMessagesSchema = ThreadDataSchema.extend({
  messages: z.array(MessageDataSchema),
});

export type ThreadWithMessagesResponse = z.infer<typeof ThreadWithMessagesSchema>;

/**
 * GET /api/chat/threads/[threadId]/messages - Messages list
 */
export const MessageListResponseSchema = z.object({
  items: z.array(MessageDataSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type MessageListResponse = z.infer<typeof MessageListResponseSchema>;

/**
 * GET /api/chat/messages/[id] - Single message with tool invocations
 */
export const MessageWithToolsSchema = MessageDataSchema.extend({
  toolInvocations: z.array(ToolInvocationDataSchema),
});

export type MessageWithToolsResponse = z.infer<typeof MessageWithToolsSchema>;

/**
 * Success response for single entity operations
 */
export const ThreadResponseSchema = z.object({
  item: ThreadDataSchema,
});

export const MessageResponseSchema = z.object({
  item: MessageDataSchema,
});

export const ToolInvocationResponseSchema = z.object({
  item: ToolInvocationDataSchema,
});

/**
 * Delete response
 */
export const DeleteResponseSchema = z.object({
  deleted: z.boolean(),
});

export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;
