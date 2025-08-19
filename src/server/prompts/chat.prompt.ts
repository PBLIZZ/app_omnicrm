// src/server/prompts/chat.prompt.ts
export type ChatPromptContext = {
  appName?: string;
};

export function buildChatSystemPrompt(ctx: ChatPromptContext = {}): string {
  const app = ctx.appName ?? "OmniCRM";
  return [
    `You are ${app}'s helpful AI assistant.`,
    "Be concise, accurate, and action-oriented.",
  ].join(" ");
}
