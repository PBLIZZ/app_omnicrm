// src/app/api/google/gmail/raw-events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GetRawEventsQuerySchema } from "@/lib/validation/schemas";
import { toDateRange, type CreatedAtFilter } from "@/lib/validation/schemas/omniClients";
import { listRawEventsService } from "@/server/services/raw-events.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = GetRawEventsQuerySchema.parse(queryParams);
    const parsed = validatedQuery;

  const page: number = typeof parsed.page === "number" ? parsed.page : 1;
  const pageSize: number = typeof parsed.pageSize === "number" ? parsed.pageSize : 25;
  const sortKey =
    parsed.sort === "occurredAt" || parsed.sort === "createdAt" ? parsed.sort : "occurredAt";
  const sortDir = parsed.order === "desc" || parsed.order === "asc" ? parsed.order : "asc";
  const dateRange = toDateRange(parsed.occurredAtFilter as CreatedAtFilter | undefined);

  const params: Parameters<typeof listRawEventsService>[1] = {
    provider: typeof parsed.provider === "string" ? parsed.provider : "gmail",
    sort: sortKey,
    order: sortDir,
    page,
    pageSize,
  };
  if (dateRange) params.dateRange = dateRange;

  const { items, total } = await listRawEventsService(userId, params);

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      userId: r.userId,
      provider: r.provider,
      payload: r.payload,
      contactId: r.contactId,
      occurredAt: r.occurredAt.toISOString(),
      sourceMeta: r.sourceMeta ?? undefined,
      batchId: r.batchId,
      sourceId: r.sourceId,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  });
  } catch (error) {
    console.error("GET /api/google/gmail/raw-events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch raw events" },
      { status: 500 }
    );
  }
}
