// src/server/prompts/embed.prompt.ts
export type EmbedPromptInput = {
  text: string;
};

export function buildEmbedInput(input: EmbedPromptInput): string {
  // For embedding models, we often pass raw text. Keep a place to transform/normalize.
  return input.text.trim();
}
