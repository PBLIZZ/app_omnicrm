// New file for OpenRouter provider

export type OpenRouterConfig = {
  baseUrl: string;
  apiKey?: string;
  chatModel: string;
  summaryModel: string;
};

export function getOpenRouterConfig(): OpenRouterConfig {
  return {
    baseUrl: process.env["OPENROUTER_BASE_URL"] || "https://openrouter.ai/api/v1",
    apiKey: process.env["OPENROUTER_API_KEY"] ?? "",
    chatModel: process.env["AI_MODEL_CHAT"] || "openrouter/auto",
    summaryModel: process.env["AI_MODEL_SUMMARY"] || "openrouter/auto",
  };
}

export function isOpenRouterConfigured(): boolean {
  return !!process.env["OPENROUTER_API_KEY"];
}

export function assertOpenRouterConfigured(): void {
  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter not configured: set OPENROUTER_API_KEY in environment");
  }
}

export function openRouterHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env["OPENROUTER_API_KEY"]}`,
  };
}
