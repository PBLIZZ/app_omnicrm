import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
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
export async function GET(
  _: NextRequest,
  context: { params: { clientId: string } }
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Validate params
    const validatedParams = IdParams.parse(context.params);

    const contact = await ContactsRepository.getContactById(userId, validatedParams.clientId);

    if (!contact) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ item: toOmniClient(contact) });
  } catch (error) {
    console.error("GET /api/omni-clients/[clientId] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch omni client" },
      { status: 500 }
    );
  }
}

// --- PATCH /api/omni-clients/[clientId] ---
export async function PATCH(
  request: NextRequest,
  context: { params: { clientId: string } }
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Validate params
    const validatedParams = IdParams.parse(context.params);

    // Validate request body
    const body: unknown = await request.json();
    const validatedBody = UpdateOmniClientSchema.parse(body);

    const updates: UpdateContactDTO = {};

    if (validatedBody.displayName !== undefined) updates.displayName = validatedBody.displayName;
    if (validatedBody.primaryEmail !== undefined)
      updates.primaryEmail = toOptional(validatedBody.primaryEmail);
    if (validatedBody.primaryPhone !== undefined)
      updates.primaryPhone = toOptional(validatedBody.primaryPhone);
    if (validatedBody.stage !== undefined) {
      const stageValue = toOptional(validatedBody.stage);
      if (stageValue !== undefined) {
        updates.stage = stageValue as "New Client" | "VIP Client" | "Core Client" | "Prospect" | "At Risk Client" | "Lost Client" | "Referring Client";
      }
    }
    if (validatedBody.tags !== undefined) {
      updates.tags = validatedBody.tags ?? undefined;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    const updatedContact = await ContactsRepository.updateContact(
      userId,
      validatedParams.clientId,
      updates
    );

    if (!updatedContact) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ item: toOmniClient(updatedContact) });
  } catch (error) {
    console.error("PATCH /api/omni-clients/[clientId] error:", error);
    return NextResponse.json(
      { error: "Failed to update omni client" },
      { status: 500 }
    );
  }
}

// Optional: keep PUT for backward compatibility, delegate to PATCH
export const PUT = PATCH;

// --- DELETE /api/omni-clients/[clientId] ---
export async function DELETE(
  _: NextRequest,
  context: { params: { clientId: string } }
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Validate params
    const validatedParams = IdParams.parse(context.params);

    const deleted = await ContactsRepository.deleteContact(userId, validatedParams.clientId);

    // idempotent delete - return success even if contact didn't exist
    return NextResponse.json({ deleted: deleted ? 1 : 0 });
  } catch (error) {
    console.error("DELETE /api/omni-clients/[clientId] error:", error);
    return NextResponse.json(
      { error: "Failed to delete omni client" },
      { status: 500 }
    );
  }
}
