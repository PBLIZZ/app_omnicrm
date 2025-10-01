import { getOrGenerateEmbedding } from "@/server/lib/embeddings";
import {
  generateChatCompletion,
  isValidChatRole,
  type ChatHistoryMessage,
} from "@/server/services/rag-chat.service";
import {
  searchSemanticByEmbedding,
  type SearchResult,
} from "@/server/services/semantic-search.service";

export interface ChatRequestBody {
  message: string;
  history?: Array<{
    role: string;
    content: string;
  }>;
}

export interface ChatResponse {
  response: string;
  sources: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    similarity?: number;
    url: string;
    metadata: Record<string, unknown>;
  }>;
}

const MAX_HISTORY_ITEMS = 10;
const CONTEXT_MATCH_COUNT = 8;
const CONTEXT_SIMILARITY_THRESHOLD = 0.6;

export class ChatService {
  /**
   * Process a chat request with RAG (Retrieval-Augmented Generation)
   *
   * @param userId - The authenticated user ID
   * @param requestBody - The chat request body containing message and history
   * @returns Promise<ChatResponse> - The chat response with sources
   */
  static async processChatRequest(userId: string, requestBody: ChatRequestBody): Promise<ChatResponse> {
    const message = typeof requestBody.message === "string" ? requestBody.message.trim() : "";
    if (!message) {
      throw new Error("Message is required");
    }

    const history = this.parseHistory(requestBody.history);
    const embedding = await getOrGenerateEmbedding(message);
    const context = await this.retrieveContext(userId, embedding);

    const result = await generateChatCompletion({
      message,
      history,
      context,
    });

    return {
      response: result.response,
      sources: result.sources.map((source) => ({
        id: source.id,
        type: source.type,
        title: source.title,
        content: source.snippet,
        similarity: source.similarity,
        url: source.url,
        metadata: source.metadata,
      })),
    };
  }

  /**
   * Retrieve context for the chat message using semantic search
   *
   * @param userId - The authenticated user ID
   * @param embedding - The embedding vector for the message
   * @returns Promise<SearchResult[]> - Array of search results for context
   */
  private static async retrieveContext(userId: string, embedding: number[]): Promise<SearchResult[]> {
    try {
      const result = await searchSemanticByEmbedding(userId, embedding, {
        matchCount: CONTEXT_MATCH_COUNT,
        similarityThreshold: CONTEXT_SIMILARITY_THRESHOLD,
      });

      if (!result.success) {
        console.error("Context retrieval error:", result.error);
        return [];
      }

      return result.data;
    } catch (error) {
      console.error("Context retrieval error:", error);
      return [];
    }
  }

  /**
   * Parse and validate chat history from request body
   *
   * @param input - The history input from request body
   * @returns ChatHistoryMessage[] - Parsed and validated chat history
   */
  private static parseHistory(input: unknown): ChatHistoryMessage[] {
    if (!Array.isArray(input)) {
      return [];
    }

    const messages: ChatHistoryMessage[] = [];

    for (const item of input) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const role = (item as { role?: unknown }).role;
      const content = (item as { content?: unknown }).content;

      if (!isValidChatRole(role) || typeof content !== "string") {
        continue;
      }

      const trimmed = content.trim();
      if (!trimmed) {
        continue;
      }

      messages.push({ role, content: trimmed });
      if (messages.length >= MAX_HISTORY_ITEMS) {
        break;
      }
    }

    return messages;
  }
}
