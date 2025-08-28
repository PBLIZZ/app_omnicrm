import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { contactsStorage } from "@/server/storage/contacts.storage";
import { z } from "zod";

const CreateContactSchema = z.object({
  displayName: z.string().min(1),
  primaryEmail: z.string().email().optional().or(z.literal("")),
  primaryPhone: z.string().optional().or(z.literal("")),
});

export async function GET(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  try {
    const contacts = await contactsStorage.getContacts(userId);
    return ok({ contacts });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return err(500, "internal_server_error");
  }
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
  const parsed = CreateContactSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    const contact = await contactsStorage.createContact(userId, {
      displayName: parsed.data.displayName,
      primaryEmail: parsed.data.primaryEmail || null,
      primaryPhone: parsed.data.primaryPhone || null,
    });
    return ok({ contact });
  } catch (error) {
    console.error("Error creating contact:", error);
    return err(500, "internal_server_error");
  }
}