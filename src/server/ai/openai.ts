// OpenAI compatibility layer using OpenRouter
import { openRouterChat } from "@/server/ai/llm.service";

interface OpenAIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OpenAIChatCompletion {
  messages: OpenAIMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// Simple OpenAI-compatible client
export const openai = {
  chat: {
    completions: {
      create: async (params: OpenAIChatCompletion): Promise<OpenAIResponse> => {
        const {
          messages,
          model = "anthropic/claude-3-haiku:beta",
          temperature = 0.7,
          max_tokens,
        } = params;

        // Convert OpenAI format to our internal format
        const chatMessages = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        try {
          const response = await openRouterChat({
            messages: chatMessages,
            model,
            temperature,
            ...(typeof max_tokens === "number" ? { maxTokens: max_tokens } : {}),
          });

          // Convert back to OpenAI format
          const usageObj = response.usage
            ? {
                ...(response.usage.prompt_tokens != null
                  ? { prompt_tokens: response.usage.prompt_tokens }
                  : {}),
                ...(response.usage.completion_tokens != null
                  ? { completion_tokens: response.usage.completion_tokens }
                  : {}),
                ...(response.usage.total_tokens != null
                  ? { total_tokens: response.usage.total_tokens }
                  : {}),
              }
            : undefined;

          return {
            choices: [
              {
                message: {
                  content: response.content,
                },
              },
            ],
            ...(usageObj ? { usage: usageObj } : {}),
          };
        } catch (error) {
          throw new Error(`OpenAI compatibility error: ${error}`);
        }
      },
    },
  },
};
