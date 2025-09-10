// src/app/api/openrouter/route.ts
import { createRouteHandler } from "@/server/api/handler";
import { withGuardrails } from "@/server/ai/with-guardrails";
import { logger } from "@/lib/observability";
import { ApiResponseBuilder } from "@/server/api/response";
import { ChatRequestSchema } from "@/lib/validation/schemas/chat";
import {
  getOpenRouterConfig,
  isOpenRouterConfigured,
  openRouterHeaders,
} from "@/server/providers/openrouter.provider";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "openrouter_chat" },
  validation: { body: ChatRequestSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("openrouter.chat", requestId);

  // Feature gating: if provider not configured, return error
  if (!isOpenRouterConfigured()) {
    void logger.warn("OpenRouter not configured; service unavailable", {
      operation: "openrouter.chat",
      additionalData: { reason: "provider_not_configured" },
    });
    return api.error("service_unavailable", "INTEGRATION_ERROR");
  }

  // Body validation is handled by createRouteHandler

  // 🚨 CRITICAL: Apply AI guardrails with user context to prevent abuse
  const result = await withGuardrails(userId, async () => {
    const cfg = getOpenRouterConfig();
    const url = `${cfg.baseUrl}/chat/completions`;
    const headers = openRouterHeaders();

    // Secure request logging with user context
    void logger.info("OpenRouter proxy request", {
      operation: "openrouter.chat",
      additionalData: {
        userId: userId.slice(0, 8) + "...", // Masked user ID for privacy
        model: validated.body.model,
        messageCount: validated.body.messages.length,
      },
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(validated.body),
    });

    // Extract usage headers when present for logging
    const inputTokens = Number(response.headers.get("x-usage-input-tokens") ?? 0);
    const outputTokens = Number(response.headers.get("x-usage-output-tokens") ?? 0);
    const costUsd = Number(response.headers.get("x-usage-cost") ?? 0);

    if (!response.ok) {
      const errJson = (await response.json().catch(() => ({}))) as { error?: unknown };
      const message = typeof errJson?.error === "string" ? errJson.error : "provider_error";

      void logger.error("OpenRouter API error", {
        operation: "openrouter.chat",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          status: response.status,
          statusText: response.statusText,
          error: message,
        },
      });

      // Throw error to be handled by guardrails
      throw new Error(message);
    }

    const responseText = await response.text();

    // Log successful usage
    void logger.info("OpenRouter proxy success", {
      operation: "openrouter.chat",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        model: validated.body.model,
        inputTokens,
        outputTokens,
        costUsd,
      },
    });

    return {
      data: responseText,
      model: validated.body.model,
      inputTokens,
      outputTokens,
      costUsd,
    };
  });

  // Handle guardrail failures (rate limiting, quota exceeded, etc.)
  if ("error" in result) {
    void logger.warn("AI guardrails blocked request", {
      operation: "openrouter.chat",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        error: result.error,
      },
    });
    const errorCode = result.error === "rate_limited_minute" ? "RATE_LIMITED" : "INTEGRATION_ERROR";
    return api.error(result.error, errorCode);
  }

  // Success - return the AI response as plain text (matching original behavior)
  return api.raw(result.data, "application/json");
});
