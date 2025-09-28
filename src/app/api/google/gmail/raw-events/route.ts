// src/app/api/google/gmail/raw-events/route.ts
import { handleGetWithQueryAuth } from "@/lib/api";
import {
  GmailRawEventsQuerySchema,
  GmailRawEventsResponseSchema,
} from "@/server/db/business-schemas";
import { toDateRange, type CreatedAtFilter } from "@/server/db/business-schemas/contacts";
import { listRawEventsService } from "@/server/services/raw-events.service";

export const GET = handleGetWithQueryAuth(
  GmailRawEventsQuerySchema,
  GmailRawEventsResponseSchema,
  async (query, userId) => {
    const page: number = typeof query.page === "number" ? query.page : 1;
    const pageSize: number = typeof query.pageSize === "number" ? query.pageSize : 25;
    const sortKey =
      query.sort === "occurredAt" || query.sort === "createdAt" ? query.sort : "occurredAt";
    const sortDir = query.order === "desc" || query.order === "asc" ? query.order : "asc";
    const dateRange = toDateRange(query.occurredAtFilter as CreatedAtFilter | undefined);

    const params: Parameters<typeof listRawEventsService>[1] = {
      provider: typeof query.provider === "string" ? query.provider : "gmail",
      sort: sortKey,
      order: sortDir,
      page,
      pageSize,
    };
    if (dateRange) params.dateRange = dateRange;

    const { items, total } = await listRawEventsService(userId, params);

    return {
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
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
      total,
    };
  },
);
