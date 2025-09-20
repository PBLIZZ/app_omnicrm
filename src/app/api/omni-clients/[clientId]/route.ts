import { z } from "zod";
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { ContactsRepository } from "@repo";
import type { UpdateContactDTO } from "@contracts/contact";
import { UpdateOmniClientSchema } from "@/lib/validation/schemas/omniClients";
import { toOmniClient } from "@/server/adapters/omniClients";

// --- helpers ---
const IdParams = z.object({ clientId: z.string().uuid() });

function toOptional(v: string | null | undefined): string | undefined {
  if (typeof v === "string" && v.trim().length === 0) return undefined;
  return v ?? undefined;
}

// --- GET /api/omni-clients/[clientId] ---
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_client_get" },
  validation: {
    params: IdParams,
  },
})(async ({ userId, validated, requestId }) => {
  try {
    const contact = await ContactsRepository.getContactById(userId, validated.params.clientId);

    if (!contact) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ item: toOmniClient(contact) });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch omni client" },
      { status: 500 }
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
  try {
    const updates: UpdateContactDTO = {};

    if (validated.body.displayName !== undefined) updates.displayName = validated.body.displayName;
    if (validated.body.primaryEmail !== undefined)
      updates.primaryEmail = toOptional(validated.body.primaryEmail);
    if (validated.body.primaryPhone !== undefined)
      updates.primaryPhone = toOptional(validated.body.primaryPhone);
    if (validated.body.stage !== undefined) {
      const stageValue = toOptional(validated.body.stage);
      if (stageValue !== undefined) {
        updates.stage = stageValue as "New Client" | "VIP Client" | "Core Client" | "Prospect" | "At Risk Client" | "Lost Client" | "Referring Client";
      }
    }
    if (validated.body.tags !== undefined) {
      updates.tags = validated.body.tags ?? undefined;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    const updatedContact = await ContactsRepository.updateContact(
      userId,
      validated.params.clientId,
      updates
    );

    if (!updatedContact) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ item: toOmniClient(updatedContact) });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update omni client" },
      { status: 500 }
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
  try {
    const deleted = await ContactsRepository.deleteContact(userId, validated.params.clientId);

    // idempotent delete - return success even if contact didn't exist
    return NextResponse.json({ deleted: deleted ? 1 : 0 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete omni client" },
      { status: 500 }
    );
  }
});
