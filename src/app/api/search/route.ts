// ===== SEARCH API ROUTE (app/api/search/route.ts) =====
import { NextRequest, NextResponse } from "next/server";
import { performSearch, type SearchKind } from "@/server/services/semantic-search.service";

interface SearchRequest {
  query?: unknown;
  type?: unknown;
  limit?: unknown;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;

const SEARCH_TYPES: readonly SearchKind[] = ["traditional", "semantic", "hybrid"] as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SearchRequest = await request.json();

    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json({ results: [], searchType: "hybrid", query: "" });
    }

    const requestedType = typeof body.type === "string" ? (body.type as SearchKind) : "hybrid";
    const searchType: SearchKind = SEARCH_TYPES.includes(requestedType) ? requestedType : "hybrid";

    const rawLimit = typeof body.limit === "number" ? body.limit : DEFAULT_LIMIT;
    const limit = clamp(Math.floor(rawLimit), MIN_LIMIT, MAX_LIMIT);

    const results = await performSearch(query, searchType, limit);

    return NextResponse.json({
      results: results.slice(0, limit),
      searchType,
      query,
    });
  } catch (error) {
    console.error("Search API error:", error);
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
