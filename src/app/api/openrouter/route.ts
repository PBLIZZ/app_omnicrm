// src/app/api/openrouter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { log } from "@/server/log";
import { ChatRequestSchema } from "@/server/schemas";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    if (!process.env["OPENROUTER_API_KEY"]) {
      return new NextResponse("Missing OPENROUTER_API_KEY", { status: 500 });
    }
    if (!process.env["NEXT_PUBLIC_APP_URL"]) {
      return new NextResponse("Missing NEXT_PUBLIC_APP_URL", { status: 500 });
    }

    const body: unknown = await req.json();

    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new NextResponse("Invalid request format", { status: 400 });
    }

    // Minimal, non-sensitive request logging
    const model = parsed.data.model;
    const msgCount = parsed.data.messages.length;
    log.info({ path: "api/openrouter", model, msgCount }, "LLM proxy request");

    const r = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env["OPENROUTER_API_KEY"]}`,
        "HTTP-Referer": process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3001",
        "X-Title": "Prompt Workbench",
      },
      body: JSON.stringify(parsed.data),
    });

    log.info({ status: r.status, ok: r.ok }, "LLM proxy response");

    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err: message }, "LLM proxy failed");
    return new NextResponse("Upstream error", { status: 502 });
  }
}
