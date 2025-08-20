// src/app/api/contacts/route.ts
import { NextRequest } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { err, ok, safeJson } from "@/server/http/responses";
import {
  GetContactsQuerySchema,
  CreateContactBodySchema,
  toDateRange,
  type GetContactsQuery,
} from "@/server/schemas";
import { createContactService, listContactsService } from "@/server/services/contacts.service";

export async function GET(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const sp = req.nextUrl.searchParams;
  const raw: Record<string, string> = {};
  for (const key of ["search", "sort", "order", "page", "pageSize", "createdAtFilter"]) {
    const v = sp.get(key);
    if (v !== null) raw[key] = v;
  }

  let parsed: GetContactsQuery;
  try {
    parsed = GetContactsQuerySchema.parse(raw);
  } catch (e: unknown) {
    const msg =
      e instanceof Error && e.message === "invalid_createdAtFilter"
        ? "invalid_query"
        : "invalid_query";
    return err(400, msg);
  }

  const page = parsed.page ?? 1;
  const pageSize = parsed.pageSize ?? 25;
  const sortKey = parsed.sort ?? "displayName";
  const sortDir = parsed.order === "desc" ? "desc" : "asc";
  const dateRange = toDateRange(parsed.createdAtFilter);

  const params: Parameters<typeof listContactsService>[1] = {
    sort: sortKey,
    order: sortDir,
    page,
    pageSize,
  };
  if (parsed.search) params.search = parsed.search;
  if (dateRange) params.dateRange = dateRange;

  const { items, total } = await listContactsService(userId, params);

  return ok({
    items: items.map((r) => ({
      id: r.id,
      userId: r.userId,
      displayName: r.displayName,
      primaryEmail: r.primaryEmail ?? null,
      primaryPhone: r.primaryPhone ?? null,
      source: r.source ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
  });
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
  const parsed = CreateContactBodySchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  const row = await createContactService(userId, {
    displayName: parsed.data.displayName,
    primaryEmail: parsed.data.primaryEmail,
    primaryPhone: parsed.data.primaryPhone,
    source: parsed.data.source,
  });

  if (!row) return err(500, "insert_failed");

  return ok(
    {
      id: row.id,
      userId: row.userId,
      displayName: row.displayName,
      primaryEmail: row.primaryEmail ?? null,
      primaryPhone: row.primaryPhone ?? null,
      source: row.source ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: (row.updatedAt ?? row.createdAt).toISOString(),
    },
    { status: 201 },
  );
}
