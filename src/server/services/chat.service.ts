// src/server/services/chat.service.ts
import { logger } from "@/lib/logger";
import { buildChatSystemPrompt } from "@/server/prompts/chat.prompt";
import {
  getOpenRouterConfig,
  isOpenRouterConfigured,
  openRouterHeaders,
} from "@/server/providers/openrouter.provider";
import { withGuardrails } from "@/server/ai/with-guardrails";

export type ChatServiceResult =
  | { data: { text: string }; creditsLeft: number }
  | { error: "rate_limited_minute" | "rate_limited_daily_cost" | "rate_limited_monthly" };

export async function chatService(userId: string, prompt: string): Promise<ChatServiceResult> {
  // Feature gating: if provider not configured (e.g., in dev), short-circuit with a safe fallback
  if (!isOpenRouterConfigured()) {
    logger.warn("OpenRouter not configured; returning fallback response", {}, "chat.service");
    // Do NOT spend credits in fallback path
    return {
      data: { text: `AI is disabled. Echo: ${prompt}` },
      // No quota spend, so return a sentinel -1 to indicate unchanged credits to the caller
      // The route ignores creditsLeft if not using guardrails; however, keep shape consistent.
      creditsLeft: -1,
    };
  }

  const cfg = getOpenRouterConfig();
  const system = buildChatSystemPrompt({ appName: "OmniCRM" });

  return withGuardrails(userId, async () => {
    const url = `${cfg.baseUrl}/chat/completions`;
    const headers = openRouterHeaders();
    const body = {
      model: cfg.chatModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    } satisfies Record<string, unknown>;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // Extract usage headers when present
    const inputTokens = Number(res.headers.get("x-usage-input-tokens") ?? 0);
    const outputTokens = Number(res.headers.get("x-usage-output-tokens") ?? 0);
    const costUsd = Number(res.headers.get("x-usage-cost") ?? 0);

    if (!res.ok) {
      // On provider error, surface a minimal message but still log usage as 0
      const errJson = await safeJson<{ error?: unknown }>(res);
      const message = typeof errJson?.error === "string" ? errJson.error : "provider_error";
      return {
        data: { text: `Error: ${message}` },
        model: cfg.chatModel,
        inputTokens,
        outputTokens,
        costUsd,
      };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } | null }>;
      model?: string;
    };

    const text = json?.choices?.[0]?.message?.content ?? "";
    const model = json?.model ?? cfg.chatModel;

    return {
      data: { text },
      model,
      inputTokens,
      outputTokens,
      costUsd,
    };
  });
}

// Local helper: tolerant safe JSON read of Response
async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Streaming version of chatService that returns a ReadableStream
 */
export async function streamingChatService(userId: string, prompt: string, threadId?: string): Promise<ReadableStream> {
  // Feature gating: if provider not configured (e.g., in dev), short-circuit with a safe fallback
  if (!isOpenRouterConfigured()) {
    const encoder = new TextEncoder();
    const fallbackMessage = "AI is disabled. Echo: " + prompt;
    
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: fallbackMessage })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
  }

  const cfg = getOpenRouterConfig();
  const system = buildChatSystemPrompt({ appName: "OmniCRM" });

  const url = `${cfg.baseUrl}/chat/completions`;
  const headers = openRouterHeaders();
  const body = {
    model: cfg.chatModel,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    stream: true,
  } satisfies Record<string, unknown>;

  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errJson = await safeJson<{ error?: unknown }>(res);
          const message = typeof errJson?.error === "string" ? errJson.error : "provider_error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "Error: " + message })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "No response body" })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        // Process the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          controller.enqueue(encoder.encode(chunk));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error("Streaming chat error:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "Internal server error" })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    }
  });
}
