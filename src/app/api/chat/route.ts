// ===== RAG API ROUTE (app/api/chat/route.ts) =====
import { handleAuth } from "@/lib/api";
import { ChatService } from "@/server/services/chat.service";
import {
  ChatRequestSchema,
  ChatResponseSchema,
  type ChatResponse
} from "@/server/db/business-schemas";

export const POST = handleAuth(
  ChatRequestSchema,
  ChatResponseSchema,
  async (data, userId): Promise<ChatResponse> => {
    const result = await ChatService.processChatRequest(userId, data);
    return result;
  }
);
