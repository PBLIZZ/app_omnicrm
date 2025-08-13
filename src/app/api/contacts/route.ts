// src/app/api/contacts/route.ts
import { NextRequest } from "next/server";
import { and, asc, desc, eq, ilike, or, gte, lte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { err, ok, safeJson } from "@/server/http/responses";

const getQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(200).optional(),
    sort: z.enum(["displayName", "createdAt"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().min(1).max(100000).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).optional(),
    createdAtFilter: z
      .string()
      .transform((v) => {
        try {
          return JSON.parse(v) as {
            mode?: "any" | "today" | "week" | "month" | "quarter" | "year" | "range";
            from?: string;
            to?: string;
          };
        } catch {
          throw new Error("invalid_createdAtFilter");
        }
      })
      .optional(),
  })
  .strict();

function toDateRange(
  filter:
    | {
        mode?: "any" | "today" | "week" | "month" | "quarter" | "year" | "range";
        from?: string;
        to?: string;
      }
    | undefined,
): { from?: Date | undefined; to?: Date | undefined } | undefined {
  if (!filter || !filter.mode || filter.mode === "any") return undefined;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (filter.mode) {
    case "today":
      return { from: startOfDay };
    case "week": {
      const day = startOfDay.getDay();
      const diff = (day + 6) % 7; // Monday as start
      const weekStart = new Date(startOfDay);
      weekStart.setDate(startOfDay.getDate() - diff);
      return { from: weekStart };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1) };
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1) };
    }
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1) };
    case "range": {
      const from = filter.from ? new Date(filter.from) : undefined;
      const to = filter.to ? new Date(filter.to) : undefined;
      return { from, to };
    }
    default:
      return undefined;
  }
}

export async function GET(req: NextRequest) {
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

  let parsed: z.infer<typeof getQuerySchema>;
  try {
    parsed = getQuerySchema.parse(raw);
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

  const dbo = await getDb();

  let whereExpr: SQL<unknown> = eq(contacts.userId, userId);
  if (parsed.search) {
    const needle = `%${parsed.search}%`;
    whereExpr = and(
      whereExpr,
      or(
        ilike(contacts.displayName, needle),
        ilike(contacts.primaryEmail, needle),
        ilike(contacts.primaryPhone, needle),
      ),
    ) as SQL<unknown>;
  }
  if (dateRange?.from)
    whereExpr = and(whereExpr, gte(contacts.createdAt, dateRange.from as Date)) as SQL<unknown>;
  if (dateRange?.to)
    whereExpr = and(whereExpr, lte(contacts.createdAt, dateRange.to as Date)) as SQL<unknown>;

  const orderExpr =
    sortKey === "createdAt"
      ? sortDir === "desc"
        ? desc(contacts.createdAt)
        : asc(contacts.createdAt)
      : sortDir === "desc"
        ? desc(contacts.displayName)
        : asc(contacts.displayName);

  const [items, totalRow] = await Promise.all([
    dbo
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(whereExpr)
      .orderBy(orderExpr)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    dbo
      .select({ n: sql<number>`count(*)` })
      .from(contacts)
      .where(whereExpr)
      .limit(1),
  ]);

  return ok({
    items: items.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      primaryEmail: r.primaryEmail ?? null,
      primaryPhone: r.primaryPhone ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total: totalRow[0]?.n ?? 0,
  });
}

const postBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(200),
    primaryEmail: z.string().email().max(320).nullable().optional(),
    primaryPhone: z.string().min(3).max(50).nullable().optional(),
    tags: z.array(z.string()).max(100),
    notes: z.string().max(5000).nullable().optional(),
    source: z.literal("manual"),
  })
  .strict();

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  const dbo = await getDb();
  const toNull = (v: string | null | undefined): string | null => {
    if (typeof v === "string" && v.trim().length === 0) return null;
    return v ?? null;
  };

  const [row] = await dbo
    .insert(contacts)
    .values({
      userId,
      displayName: parsed.data.displayName,
      primaryEmail: toNull(parsed.data.primaryEmail ?? null),
      primaryPhone: toNull(parsed.data.primaryPhone ?? null),
      source: parsed.data.source,
    })
    .returning({
      id: contacts.id,
      displayName: contacts.displayName,
      primaryEmail: contacts.primaryEmail,
      primaryPhone: contacts.primaryPhone,
      createdAt: contacts.createdAt,
    });

  if (!row) return err(500, "insert_failed");

  return ok(
    {
      id: row.id,
      displayName: row.displayName,
      primaryEmail: row.primaryEmail ?? null,
      primaryPhone: row.primaryPhone ?? null,
      createdAt: row.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
