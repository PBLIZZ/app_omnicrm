import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { UpdateOmniClientSchema } from "@/lib/validation/schemas/omniClients";
import { toOmniClient } from "@/server/adapters/omniClients";
import { ensureError } from "@/lib/utils/error-handler";

// --- helpers ---
const IdParams = z.object({ clientId: z.string().uuid() });

function toNull(v: string | null | undefined): string | null {
  if (typeof v === "string" && v.trim().length === 0) return null;
  return v ?? null;
}

// --- GET /api/omni-clients/[clientId] ---
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_client_get" },
  validation: {
    params: IdParams,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("omni_client_get", requestId);

  try {
    const dbo = await getDb();
    const [row] = await dbo
      .select({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        slug: contacts.slug,
        stage: contacts.stage,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, validated.params.clientId)))
      .limit(1);

    if (!row) {
      return api.notFound("Client not found");
    }

    return api.success({ item: toOmniClient(row) });
  } catch (error) {
    return api.error(
      "Failed to fetch omni client",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

// --- PATCH /api/omni-clients/[clientId] ---
export const PATCH = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_client_update" },
  validation: {
    params: IdParams,
    body: UpdateOmniClientSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("omni_client_update", requestId);

  try {
    const dbo = await getDb();

    const updates: Partial<{
      displayName: string;
      primaryEmail: string | null;
      primaryPhone: string | null;
      stage: string | null;
      tags: unknown;
    }> = {};

    if (validated.body.displayName !== undefined) updates.displayName = validated.body.displayName;
    if (validated.body.primaryEmail !== undefined)
      updates.primaryEmail = toNull(validated.body.primaryEmail);
    if (validated.body.primaryPhone !== undefined)
      updates.primaryPhone = toNull(validated.body.primaryPhone);
    if (validated.body.stage !== undefined) updates.stage = toNull(validated.body.stage);
    if (validated.body.tags !== undefined) updates.tags = validated.body.tags;

    if (Object.keys(updates).length === 0) {
      return api.validationError("No valid updates provided");
    }

    const [row] = await dbo
      .update(contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(contacts.userId, userId), eq(contacts.id, validated.params.clientId)))
      .returning({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        stage: contacts.stage,
        slug: contacts.slug,
        tags: contacts.tags,
        confidenceScore: contacts.confidenceScore,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      });

    if (!row) {
      return api.notFound("Client not found");
    }

    return api.success({ item: toOmniClient(row) });
  } catch (error) {
    return api.error(
      "Failed to update omni client",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

// Optional: keep PUT for backward compatibility, delegate to PATCH
export const PUT = PATCH;

// --- DELETE /api/omni-clients/[clientId] ---
export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_client_delete" },
  validation: {
    params: IdParams,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("omni_client_delete", requestId);

  try {
    const dbo = await getDb();
    await dbo
      .delete(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, validated.params.clientId)));

    // idempotent delete
    return api.success({ deleted: 1 });
  } catch (error) {
    return api.error(
      "Failed to delete omni client",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
