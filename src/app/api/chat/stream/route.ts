import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { err, safeJson } from "@/lib/api/http";
import { StreamingChatRequestSchema } from "@/server/schemas";
import { streamingChatService } from "@/server/services/chat.service";
import { ClaudeChatService } from "@/server/services/claude-chat.service";
import { isAnthropicConfigured } from "@/server/providers/anthropic.provider";
import { chatStorage } from "@/server/storage/chat.storage";

function generateThreadTitle(message: string): string {
  // Clean and truncate the message to create a meaningful title
  const cleaned = message.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
  if (cleaned.length <= 40) {
    return cleaned;
  }
  
  // Try to break at a word boundary
  const truncated = cleaned.substring(0, 40);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

export async function POST(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = StreamingChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  const { message, threadId } = parsed.data;

  try {
    // Get or create thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      // Create thread with a meaningful title from the message
      const title = generateThreadTitle(message);
      const thread = await chatStorage.createThread(userId, title);
      currentThreadId = thread.id;
    } else {
      // Verify thread belongs to user
      const thread = await chatStorage.getThread(currentThreadId, userId);
      if (!thread) {
        return err(404, "thread_not_found");
      }
    }

    // Save user message
    await chatStorage.createMessage(currentThreadId, userId, "user", { text: message });

    // Use Claude if available, otherwise fallback to OpenRouter
    const stream = isAnthropicConfigured() 
      ? await ClaudeChatService.streamingChat(userId, message, currentThreadId)
      : await streamingChatService(userId, message, currentThreadId);
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Thread-Id': currentThreadId, // Include thread ID in response
      },
    });
  } catch (error) {
    console.error("Streaming chat error:", error);
    return err(500, "internal_server_error");
  }
}