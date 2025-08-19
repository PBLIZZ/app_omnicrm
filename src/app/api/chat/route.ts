// src/app/api/chat/route.ts

import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { SimpleChatRequestSchema } from "@/server/schemas";
import { chatService } from "@/server/services/chat.service";

export async function POST(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = SimpleChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }
  const { prompt } = parsed.data;

  const result = await chatService(userId, prompt);

  if ("error" in result) {
    const status =
      result.error === "rate_limited_minute"
        ? 429
        : result.error === "rate_limited_daily_cost"
          ? 402
          : 429;
    return err(status, result.error);
  }

  return ok({ ...result.data, creditsLeft: result.creditsLeft });
}
