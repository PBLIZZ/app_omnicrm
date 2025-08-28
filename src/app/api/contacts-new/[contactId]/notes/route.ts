import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { contactsStorage } from "@/server/storage/contacts.storage";
import { z } from "zod";

const CreateNoteSchema = z.object({
  content: z.string().min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { contactId } = await params;

  try {
    // Verify contact belongs to user
    const contact = await contactsStorage.getContact(contactId, userId);
    if (!contact) {
      return err(404, "contact_not_found");
    }

    const notes = await contactsStorage.getNotes(contactId, userId);
    return ok({ notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return err(500, "internal_server_error");
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { contactId } = await params;
  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = CreateNoteSchema.safeParse(body);
  
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    // Verify contact belongs to user
    const contact = await contactsStorage.getContact(contactId, userId);
    if (!contact) {
      return err(404, "contact_not_found");
    }

    const note = await contactsStorage.createNote(contactId, userId, parsed.data.content);
    return ok({ note });
  } catch (error) {
    console.error("Error creating note:", error);
    return err(500, "internal_server_error");
  }
}