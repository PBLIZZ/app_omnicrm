/**
 * POST /api/gmail/search — Semantic email search endpoint
 *
 * Provides AI-powered semantic search through Gmail data using vector embeddings
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GmailSearchService } from "@/server/services/gmail-search.service";
import { z } from "zod";
import { ApiEnvelope } from "@/lib/utils/type-guards";

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().min(1).max(50).default(10),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body: unknown = await request.json();
    const { query, limit } = SearchRequestSchema.parse(body);

    const results = await GmailSearchService.searchEmails(userId, { query, limit });

    const envelope: ApiEnvelope<{ results: typeof results }> = { ok: true, data: { results } };
    return NextResponse.json(envelope);

  } catch (error: unknown) {
    console.error("POST /api/gmail/search error:", error);

    if (error instanceof z.ZodError) {
      const envelope: ApiEnvelope = {
        ok: false,
        error: "Invalid request parameters",
        details: error.issues,
      };
      return NextResponse.json(envelope, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    if (errorMessage.includes("unauthorized") || errorMessage.includes("auth")) {
      const envelope: ApiEnvelope = { ok: false, error: "Authentication required" };
      return NextResponse.json(envelope, { status: 401 });
    }

    const envelope: ApiEnvelope = { ok: false, error: "Failed to search emails" };
    return NextResponse.json(envelope, { status: 500 });
  }
}