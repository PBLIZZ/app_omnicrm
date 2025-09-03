import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err } from "@/lib/api/http";
import { chatStorage } from "@/server/storage/chat.storage";

export async function GET(
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

    const messages = await chatStorage.getMessages(threadId, userId);
    return ok({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return err(500, "internal_server_error");
  }
}