import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { contactsStorage } from "@/server/storage/contacts.storage";
import { z } from "zod";

const UpdateNoteSchema = z.object({
  content: z.string().min(1),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string; noteId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { contactId, noteId } = await params;
  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = UpdateNoteSchema.safeParse(body);
  
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    // Verify contact belongs to user
    const contact = await contactsStorage.getContact(contactId, userId);
    if (!contact) {
      return err(404, "contact_not_found");
    }

    await contactsStorage.updateNote(noteId, userId, parsed.data.content);
    return ok({ success: true });
  } catch (error) {
    console.error("Error updating note:", error);
    return err(500, "internal_server_error");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string; noteId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { contactId, noteId } = await params;

  try {
    // Verify contact belongs to user
    const contact = await contactsStorage.getContact(contactId, userId);
    if (!contact) {
      return err(404, "contact_not_found");
    }

    await contactsStorage.deleteNote(noteId, userId);
    return ok({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return err(500, "internal_server_error");
  }
}