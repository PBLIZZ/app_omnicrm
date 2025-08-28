import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { chatStorage } from "@/server/storage/chat.storage";
import { z } from "zod";

const UpdateThreadSchema = z.object({
  title: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { threadId } = await params;
  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = UpdateThreadSchema.safeParse(body);
  
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    // Verify thread belongs to user
    const thread = await chatStorage.getThread(threadId, userId);
    if (!thread) {
      return err(404, "thread_not_found");
    }

    await chatStorage.updateThreadTitle(threadId, userId, parsed.data.title);
    return ok({ success: true });
  } catch (error) {
    console.error("Error updating thread:", error);
    return err(500, "internal_server_error");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { threadId } = await params;

  try {
    // Verify thread belongs to user
    const thread = await chatStorage.getThread(threadId, userId);
    if (!thread) {
      return err(404, "thread_not_found");
    }

    await chatStorage.deleteThread(threadId, userId);
    return ok({ success: true });
  } catch (error) {
    console.error("Error deleting thread:", error);
    return err(500, "internal_server_error");
  }
}