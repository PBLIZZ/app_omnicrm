// ===== RAG API ROUTE (app/api/chat/route.ts) =====
import { NextRequest, NextResponse } from "next/server";
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

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
}

const MAX_HISTORY_ITEMS = 10;
const CONTEXT_MATCH_COUNT = 8;
const CONTEXT_SIMILARITY_THRESHOLD = 0.6;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = (await request.json()) as ChatRequestBody;
    const body: ChatRequestBody = typeof rawBody === "object" && rawBody !== null ? rawBody : {};

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const history = parseHistory(body.history);

    const embedding = await getOrGenerateEmbedding(message);
    const context = await retrieveContext(embedding);

    const result = await generateChatCompletion({
      message,
      history,
      context,
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    // Log full error details on server for debugging
    console.error("RAG Chat error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Return sanitized error message to client
    return NextResponse.json(
      {
        error: "An error occurred while processing your request. Please try again later.",
      },
      { status: 500 },
    );
  }
}

async function retrieveContext(embedding: number[]): Promise<SearchResult[]> {
  try {
    return await searchSemanticByEmbedding(embedding, {
      matchCount: CONTEXT_MATCH_COUNT,
      similarityThreshold: CONTEXT_SIMILARITY_THRESHOLD,
    });
  } catch (error) {
    console.error("Context retrieval error:", error);
    return [];
  }
}

function parseHistory(input: unknown): ChatHistoryMessage[] {
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
