// src/app/api/chat/route.ts (skeleton—just to show the guardrails in action):

import { NextRequest, NextResponse } from "next/server";
import { withGuardrails } from "@/server/ai/with-guardrails";
import { getServerUserId } from "@/server/auth/user";
import { chatRequestSchema } from "./schema";
// import your OpenRouter client here

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return NextResponse.json(
      { error: error?.message ?? "unauthorized" },
      { status: error?.status ?? 401 },
    );
  }

  const body = await req.json();
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
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
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ...result.data, creditsLeft: result.creditsLeft });
}
