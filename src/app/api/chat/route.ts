// src/app/api/chat/route.ts

import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { withGuardrails } from "@/server/ai/with-guardrails";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { chatRequestSchema } from "./schema";
// import your OpenRouter client here

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }
  const { prompt } = parsed.data;

  const result = await withGuardrails(userId, async () => {
    // === PLACEHOLDER LLM CALL ===
    // call OpenRouter here and parse usage if headers are provided
    // const res = await fetch("https://openrouter.ai/api/v1/chat/completions", { ... })
    // const inputTokens = Number(res.headers.get("x-usage-input-tokens") ?? 0);
    // const outputTokens = Number(res.headers.get("x-usage-output-tokens") ?? 0);
    // const costUsd = Number(res.headers.get("x-usage-cost") ?? 0);
    const model = "openrouter/minimal-model";
    const data = { text: `Echo: ${prompt}` };
    const inputTokens = 1,
      outputTokens = 5,
      costUsd = 0; // stub
    return { data, model, inputTokens, outputTokens, costUsd };
  });

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
