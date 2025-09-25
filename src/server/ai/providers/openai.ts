import OpenAI from "openai";

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
  return new OpenAI({ apiKey });
}

export function isOpenAIConfigured(): boolean {
  return !!process.env["OPENAI_API_KEY"];
}

export function assertOpenAIConfigured(): void {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key not configured");
  }
}
