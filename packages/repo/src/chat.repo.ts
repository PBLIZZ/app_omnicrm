import { eq, and, desc, asc, count } from "drizzle-orm";
import {
  threads,
  messages,
  toolInvocations,
  type Thread,
  type Message,
  type ToolInvocation,
  type CreateThread,
  type CreateMessage,
  type CreateToolInvocation,
} from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

/**
 * Chat Repository
 *
 * Manages threads, messages, and tool invocations for AI chat functionality.
 * Pure database operations - no business logic, no validation.
 * Uses DbClient constructor injection pattern.
 * Throws errors on failure - no Result wrapper.
 */

export class ChatRepository {
  constructor(private readonly db: DbClient) {}

  // ============================================================================
  // THREADS
  // ============================================================================

  /**
   * List threads with pagination
   */
  async listThreads(
    userId: string,
    params: {
      sort?: "createdAt" | "updatedAt";
      order?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{ items: Thread[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const sortKey = params.sort ?? "updatedAt";
    const sortDir = params.order === "desc" ? desc : asc;

    // Count total
    const countResult = await this.db
      .select({ count: count() })
      .from(threads)
      .where(eq(threads.userId, userId));

    const totalRow = countResult[0];
    const total = totalRow?.count ?? 0;

    // Fetch items
    const sortColumnMap = {
      createdAt: threads.createdAt,
      updatedAt: threads.updatedAt,
    } as const;

    const items = await this.db
      .select()
      .from(threads)
      .where(eq(threads.userId, userId))
      .orderBy(sortDir(sortColumnMap[sortKey]))
      .limit(pageSize)
      .offset(offset);

    return { items, total };
  }

  /**
   * Get single thread by ID
   */
  async getThreadById(userId: string, threadId: string): Promise<Thread | null> {
    const rows = await this.db
      .select()
      .from(threads)
      .where(and(eq(threads.userId, userId), eq(threads.id, threadId)))
      .limit(1);

    return rows.length > 0 && rows[0] ? rows[0] : null;
  }

  /**
   * Create new thread
   */
  async createThread(data: CreateThread): Promise<Thread> {
    const [thread] = await this.db.insert(threads).values(data).returning();

    if (!thread) {
      throw new Error("Insert returned no data");
    }

    return thread;
  }

  /**
   * Update thread
   */
  async updateThread(
    userId: string,
    threadId: string,
    updates: Partial<CreateThread>,
  ): Promise<Thread | null> {
    const [thread] = await this.db
      .update(threads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
      .returning();

    return thread ?? null;
  }

  /**
   * Delete thread (cascades to messages and tool invocations via DB)
   */
  async deleteThread(userId: string, threadId: string): Promise<boolean> {
    const result = await this.db
      .delete(threads)
      .where(and(eq(threads.userId, userId), eq(threads.id, threadId)))
      .returning({ id: threads.id });

    return result.length > 0;
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  /**
   * List messages for a thread
   */
  async listMessages(
    userId: string,
    threadId: string,
    params: {
      order?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{ items: Message[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;
    const sortDir = params.order === "desc" ? desc : asc;

    // Count total
    const countResult = await this.db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.threadId, threadId)));

    const totalRow = countResult[0];
    const total = totalRow?.count ?? 0;

    // Fetch items
    const items = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.threadId, threadId)))
      .orderBy(sortDir(messages.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { items, total };
  }

  /**
   * Get single message by ID
   */
  async getMessageById(userId: string, messageId: string): Promise<Message | null> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.id, messageId)))
      .limit(1);

    return rows.length > 0 && rows[0] ? rows[0] : null;
  }

  /**
   * Create new message
   */
  async createMessage(data: CreateMessage): Promise<Message> {
    const [message] = await this.db.insert(messages).values(data).returning();

    if (!message) {
      throw new Error("Insert returned no data");
    }

    return message;
  }

  /**
   * Delete message
   */
  async deleteMessage(userId: string, messageId: string): Promise<boolean> {
    const result = await this.db
      .delete(messages)
      .where(and(eq(messages.userId, userId), eq(messages.id, messageId)))
      .returning({ id: messages.id });

    return result.length > 0;
  }

  // ============================================================================
  // TOOL INVOCATIONS
  // ============================================================================

  /**
   * List tool invocations for a message
   */
  async listToolInvocations(
    userId: string,
    messageId: string,
  ): Promise<ToolInvocation[]> {
    const rows = await this.db
      .select()
      .from(toolInvocations)
      .where(and(eq(toolInvocations.userId, userId), eq(toolInvocations.messageId, messageId)))
      .orderBy(asc(toolInvocations.createdAt));

    return rows;
  }

  /**
   * Get single tool invocation by ID
   */
  async getToolInvocationById(
    userId: string,
    invocationId: string,
  ): Promise<ToolInvocation | null> {
    const rows = await this.db
      .select()
      .from(toolInvocations)
      .where(and(eq(toolInvocations.userId, userId), eq(toolInvocations.id, invocationId)))
      .limit(1);

    return rows.length > 0 && rows[0] ? rows[0] : null;
  }

  /**
   * Create new tool invocation
   */
  async createToolInvocation(data: CreateToolInvocation): Promise<ToolInvocation> {
    const [invocation] = await this.db
      .insert(toolInvocations)
      .values(data)
      .returning();

    if (!invocation) {
      throw new Error("Insert returned no data");
    }

    return invocation;
  }

  /**
   * Update tool invocation result
   */
  async updateToolInvocation(
    userId: string,
    invocationId: string,
    updates: Partial<CreateToolInvocation>,
  ): Promise<ToolInvocation | null> {
    const [invocation] = await this.db
      .update(toolInvocations)
      .set(updates)
      .where(
        and(
          eq(toolInvocations.id, invocationId),
          eq(toolInvocations.userId, userId),
        ),
      )
      .returning();

    return invocation ?? null;
  }

  // ============================================================================
  // COMPOSED QUERIES
  // ============================================================================

  /**
   * Get thread with all its messages
   */
  async getThreadWithMessages(
    userId: string,
    threadId: string,
  ): Promise<(Thread & { messages: Message[] }) | null> {
    const thread = await this.getThreadById(userId, threadId);
    if (!thread) return null;

    const { items: messageList } = await this.listMessages(userId, threadId, {
      order: "asc",
      pageSize: 1000, // Get all messages for thread detail view
    });

    return {
      ...thread,
      messages: messageList,
    };
  }

  /**
   * Get message with all its tool invocations
   */
  async getMessageWithTools(
    userId: string,
    messageId: string,
  ): Promise<(Message & { toolInvocations: ToolInvocation[] }) | null> {
    const message = await this.getMessageById(userId, messageId);
    if (!message) return null;

    const tools = await this.listToolInvocations(userId, messageId);

    return {
      ...message,
      toolInvocations: tools,
    };
  }
}

export function createChatRepository(db: DbClient): ChatRepository {
  return new ChatRepository(db);
}
