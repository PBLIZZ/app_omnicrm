// Chat storage layer for threads and messages
import { getDb } from "@/server/db/client";
import { threads, messages, toolInvocations } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { 
  Thread, 
  Message, 
  ToolInvocation 
} from "@/server/db/schema";

export class ChatStorage {
  // Threads
  async createThread(userId: string, title?: string): Promise<Thread> {
    const db = await getDb();
    const [thread] = await db
      .insert(threads)
      .values({
        userId,
        title: title || "New Chat",
      })
      .returning();
    return thread;
  }

  async getThreads(userId: string): Promise<Thread[]> {
    const db = await getDb();
    return await db
      .select()
      .from(threads)
      .where(eq(threads.userId, userId))
      .orderBy(desc(threads.updatedAt));
  }

  async getThread(threadId: string, userId: string): Promise<Thread | null> {
    const db = await getDb();
    const [thread] = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, threadId), eq(threads.userId, userId)));
    return thread || null;
  }

  async updateThreadTitle(threadId: string, userId: string, title: string): Promise<void> {
    const db = await getDb();
    await db
      .update(threads)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(threads.id, threadId), eq(threads.userId, userId)));
  }

  async deleteThread(threadId: string, userId: string): Promise<void> {
    const db = await getDb();
    // Delete messages first (due to foreign key)
    await db
      .delete(messages)
      .where(and(eq(messages.threadId, threadId), eq(messages.userId, userId)));
    
    // Then delete thread
    await db
      .delete(threads)
      .where(and(eq(threads.id, threadId), eq(threads.userId, userId)));
  }

  // Messages
  async createMessage(threadId: string, userId: string, role: string, content: unknown): Promise<Message> {
    const db = await getDb();
    // Update thread's updatedAt timestamp
    await db
      .update(threads)
      .set({ updatedAt: new Date() })
      .where(eq(threads.id, threadId));

    const [message] = await db
      .insert(messages)
      .values({
        threadId,
        userId,
        role,
        content,
      })
      .returning();
    return message;
  }

  async getMessages(threadId: string, userId: string): Promise<Message[]> {
    const db = await getDb();
    return await db
      .select()
      .from(messages)
      .where(and(eq(messages.threadId, threadId), eq(messages.userId, userId)))
      .orderBy(messages.createdAt);
  }

  async updateMessage(messageId: string, userId: string, content: unknown): Promise<void> {
    const db = await getDb();
    await db
      .update(messages)
      .set({ content })
      .where(and(eq(messages.id, messageId), eq(messages.userId, userId)));
  }

  // Tool Invocations
  async createToolInvocation(
    messageId: string, 
    userId: string, 
    tool: string, 
    args: unknown, 
    result?: unknown,
    latencyMs?: number
  ): Promise<ToolInvocation> {
    const db = await getDb();
    const [toolInvocation] = await db
      .insert(toolInvocations)
      .values({
        messageId,
        userId,
        tool,
        args,
        result,
        latencyMs,
      })
      .returning();
    return toolInvocation;
  }
}

export const chatStorage = new ChatStorage();