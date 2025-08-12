// src/app/api/openrouter/route.ts
import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: Request) {
  if (!process.env["OPENROUTER_API_KEY"]) {
    return new NextResponse("Missing OPENROUTER_API_KEY", { status: 500 });
  }
  if (!process.env["NEXT_PUBLIC_APP_URL"]) {
    return new NextResponse("Missing NEXT_PUBLIC_APP_URL", { status: 500 });
  }
  const body = await req.json();

  const r = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env["OPENROUTER_API_KEY"]}`,
      "HTTP-Referer": process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000",
      "X-Title": "Prompt Workbench",
    },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}
