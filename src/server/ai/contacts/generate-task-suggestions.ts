// Extracted from contact-ai-actions.service.ts

import { generateText } from "@/server/ai/core/llm.service";
// function buildGenerateTaskPrompt(data: any): ChatMessage[] { return [{ role: "user", content: "Generate tasks" }]; }
import { getContactData } from "./utils/contact-utils";
import { buildGenerateTaskPrompt } from "@/server/ai/prompts/clients/generate-task.prompt";

export async function generateTaskSuggestions(
  userId: string,
  contactId: string,
  model?: string,
): Promise<ContactTaskSuggestion[]> {
  // Input validation
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    throw new TypeError("userId must be a non-empty string");
  }

  if (!contactId || typeof contactId !== "string" || contactId.trim().length === 0) {
    throw new TypeError("contactId must be a non-empty string");
  }

  const contactData = await getContactData(userId, contactId);

  if (!contactData.contact) {
    throw new Error("Contact not found");
  }

  const messages = buildGenerateTaskPrompt(contactData);

  // Use explicit model or fallback to environment variable
  const aiModel = model ?? process.env["AI_MODEL"] ?? "openai/gpt-4o-mini";

  type ResponseType = { tasks: ContactTaskSuggestion[] };

  const response = await generateText<ResponseType>(userId, {
    model: aiModel,
    messages,
  });

  const data: ResponseType = response.data;
  return data.tasks ?? [];
}
