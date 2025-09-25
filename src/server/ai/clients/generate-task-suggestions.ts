// Extracted from contact-ai-actions.service.ts

import { generateText } from "@/server/ai/core/llm.service";
// function buildGenerateTaskPrompt(data: any): ChatMessage[] { return [{ role: "user", content: "Generate tasks" }]; }
import { getContactData } from "./utils/contact-utils";
import { buildGenerateTaskPrompt } from "@/server/ai/prompts/clients/generate-task.prompt";

export interface ContactTaskSuggestion {
  title: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  estimatedMinutes: number;
  category: "follow-up" | "outreach" | "service" | "admin";
}

export async function generateTaskSuggestions(
  userId: string,
  contactId: string,
): Promise<ContactTaskSuggestion[]> {
  const contactData = await getContactData(userId, contactId);

  if (!contactData.contact) {
    throw new Error("Contact not found");
  }

  const messages = buildGenerateTaskPrompt(contactData);

  const response = await generateText<{ tasks: ContactTaskSuggestion[] }>(userId, {
    model: "default",
    messages,
  });

  return response.data.tasks ?? [];
}
