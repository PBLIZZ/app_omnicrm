import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/lib/api/http";
import { chatStorage } from "@/server/storage/chat.storage";
import { z } from "zod";

const CreateThreadSchema = z.object({
  title: z.string().optional(),
  message: z.string().optional(),
});

function generateThreadTitle(message?: string): string {
  if (!message) return "New Chat";

  // Clean and truncate the message to create a meaningful title
  const cleaned = message.trim().replace(/\n+/g, " ").replace(/\s+/g, " ");
  if (cleaned.length <= 40) {
    return cleaned;
  }

  // Try to break at a word boundary
  const truncated = cleaned.substring(0, 40);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
}

export async function GET(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  try {
    const threads = await chatStorage.getThreads(userId);
    return ok({ threads });
  } catch (error) {
    console.error("Error fetching threads:", error);
    return err(500, "internal_server_error");
  }
}

export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const body = (await safeJson<unknown>(request)) ?? {};
  const parsed = CreateThreadSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    const title = parsed.data.title ?? generateThreadTitle(parsed.data.message);
    const thread = await chatStorage.createThread(userId, title);
    return ok({ thread });
  } catch (error) {
    console.error("Error creating thread:", error);
    return err(500, "internal_server_error");
  }
}
