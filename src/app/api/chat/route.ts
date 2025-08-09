// src/app/api/chat/route.ts (skeleton—just to show the guardrails in action):

import { NextRequest, NextResponse } from "next/server";
import { withGuardrails } from "@/server/ai/with-guardrails";
// import your OpenRouter client here

export async function POST(req: NextRequest) {
  // TODO: replace with real auth session retrieval
  const userId = req.headers.get("x-user-id") || ""; // e.g., from Supabase server session
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const prompt = String(body?.prompt ?? "");

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
