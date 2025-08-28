// Environment configuration matching your patterns
export const env = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  AI_MODEL_CHAT: process.env.AI_MODEL_CHAT || "anthropic/claude-3.5-sonnet",
  AI_MODEL_EMBED: process.env.AI_MODEL_EMBED || "text-embedding-3-small",
  AI_MODEL_SUMMARY: process.env.AI_MODEL_SUMMARY || "anthropic/claude-3.5-haiku",
};