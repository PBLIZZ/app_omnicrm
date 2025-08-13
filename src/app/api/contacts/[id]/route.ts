// src/app/api/contacts/[id]/route.ts
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { err, ok, safeJson } from "@/server/http/responses";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }
  if (!id) return err(400, "invalid_id");

  const dbo = await getDb();
  const [row] = await dbo
    .select({
      id: contacts.id,
      displayName: contacts.displayName,
      primaryEmail: contacts.primaryEmail,
      primaryPhone: contacts.primaryPhone,
      source: contacts.source,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.id, id)))
    .limit(1);

  if (!row) return err(404, "not_found");

  return ok({
    id: row.id,
    displayName: row.displayName,
    primaryEmail: row.primaryEmail ?? null,
    primaryPhone: row.primaryPhone ?? null,
    source: row.source ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

const putSchema = z
  .object({
    displayName: z.string().trim().min(1).max(200).optional(),
    primaryEmail: z.string().email().max(320).nullable().optional(),
    primaryPhone: z.string().min(3).max(50).nullable().optional(),
    tags: z.array(z.string()).max(100).optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }
  if (!id) return err(400, "invalid_id");

  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return err(400, "invalid_body", parsed.error.flatten());

  const dbo = await getDb();
  const toNull = (v: string | null | undefined): string | null => {
    if (typeof v === "string" && v.trim().length === 0) return null;
    return v ?? null;
  };

  const updates: Partial<{
    displayName: string;
    primaryEmail: string | null;
    primaryPhone: string | null;
  }> = {};
  if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName;
  if (parsed.data.primaryEmail !== undefined)
    updates.primaryEmail = toNull(parsed.data.primaryEmail);
  if (parsed.data.primaryPhone !== undefined)
    updates.primaryPhone = toNull(parsed.data.primaryPhone);

  if (Object.keys(updates).length === 0) return err(400, "invalid_body");

  const [row] = await dbo
    .update(contacts)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(contacts.userId, userId), eq(contacts.id, id)))
    .returning({
      id: contacts.id,
      displayName: contacts.displayName,
      primaryEmail: contacts.primaryEmail,
      primaryPhone: contacts.primaryPhone,
      source: contacts.source,
      createdAt: contacts.createdAt,
    });

  if (!row) return err(404, "not_found");

  return ok({
    id: row.id,
    displayName: row.displayName,
    primaryEmail: row.primaryEmail ?? null,
    primaryPhone: row.primaryPhone ?? null,
    source: row.source ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }
  if (!id) return err(400, "invalid_id");

  const dbo = await getDb();
  await dbo.delete(contacts).where(and(eq(contacts.userId, userId), eq(contacts.id, id)));
  // drizzle returns void; we can try to fetch and check existence before delete for 404 semantics
  // Here we will return ok regardless to keep idempotent delete
  return ok({ deleted: 1 });
}
