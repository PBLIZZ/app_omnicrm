// src/app/api/google/gmail/raw-events/route.ts
import { NextRequest } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { err, ok } from "@/lib/api/http";
import { GetRawEventsQuerySchema, type GetRawEventsQuery, toDateRange } from "@/lib/schemas";
import { listRawEventsService } from "@/server/services/raw-events.service";

export async function GET(req: NextRequest): Promise<Response> {
  // 1) Auth
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  // 2) Parse query
  const sp = req.nextUrl.searchParams;
  const raw: Record<string, string> = {};
  for (const key of ["provider", "sort", "order", "page", "pageSize", "occurredAtFilter"]) {
    const v = sp.get(key);
    if (v !== null) raw[key] = v;
  }

  let parsed: GetRawEventsQuery;
  try {
    parsed = GetRawEventsQuerySchema.parse(raw);
  } catch {
    return err(400, "invalid_query");
  }

  const page = parsed.page ?? 1;
  const pageSize = parsed.pageSize ?? 25;
  const sortKey = parsed.sort ?? "occurredAt";
  const sortDir = parsed.order === "desc" ? "desc" : "asc";
  const dateRange = toDateRange(parsed.occurredAtFilter);

  const params: Parameters<typeof listRawEventsService>[1] = {
    provider: parsed.provider ?? "gmail",
    sort: sortKey,
    order: sortDir,
    page,
    pageSize,
  };
  if (dateRange) params.dateRange = dateRange;

  const { items, total } = await listRawEventsService(userId, params);

  return ok({
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
}
