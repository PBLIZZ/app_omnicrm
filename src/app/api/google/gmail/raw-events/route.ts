// src/app/api/google/gmail/raw-events/route.ts
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { GetRawEventsQuerySchema } from "@/lib/validation/schemas";
import { toDateRange, type CreatedAtFilter } from "@/lib/validation/schemas/omniClients";
import { listRawEventsService } from "@/server/services/raw-events.service";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_gmail_raw_events" },
  validation: { query: GetRawEventsQuerySchema },
})(async ({ userId, validated, requestId }) => {

  const parsed = validated.query;

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
    ok: true,
    data: {
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
    }
  });
});
