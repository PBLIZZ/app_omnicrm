// src/app/api/contacts/bulk-delete/route.ts
import { NextRequest } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { err, ok, safeJson } from "@/server/http/responses";

const bodySchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).strict();

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return err(400, "invalid_body", parsed.error.flatten());

  const dbo = await getDb();
  // Using inArray for selection; drizzle delete doesn't return count reliably across drivers, so fetch count first
  const { ids } = parsed.data;
  const countRows = await dbo
    .select({ n: sql<number>`count(*)` })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), inArray(contacts.id, ids)))
    .limit(1);
  const n = countRows[0]?.n ?? 0;

  await dbo.delete(contacts).where(and(eq(contacts.userId, userId), inArray(contacts.id, ids)));

  return ok({ deleted: n });
}
