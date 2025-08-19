// src/server/providers/openrouter.provider.ts
import { env } from "@/lib/env";

export type OpenRouterConfig = {
  apiKey?: string;
  baseUrl: string;
  chatModel: string;
  embedModel: string;
  summaryModel: string;
};

export function getOpenRouterConfig(): OpenRouterConfig {
  const cfg: OpenRouterConfig = {
    baseUrl: "https://openrouter.ai/api/v1",
    chatModel: env.AI_MODEL_CHAT,
    embedModel: env.AI_MODEL_EMBED,
    summaryModel: env.AI_MODEL_SUMMARY,
  };
  if (env.OPENROUTER_API_KEY) cfg.apiKey = env.OPENROUTER_API_KEY;
  return cfg;
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(env.OPENROUTER_API_KEY);
}

export function assertOpenRouterConfigured(): void {
  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter not configured: set OPENROUTER_API_KEY in environment");
  }
}

export function openRouterHeaders(): Record<string, string> {
  if (!env.OPENROUTER_API_KEY) return { "content-type": "application/json" };
  return {
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    "content-type": "application/json",
  };
}
