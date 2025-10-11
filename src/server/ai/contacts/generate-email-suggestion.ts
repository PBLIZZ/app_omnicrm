// Extracted from contact-ai-actions.service.ts

import { ChatMessage, generateText } from "../core/llm.service";
import { z } from "zod";
import { EMAIL_SUGGESTION_SYSTEM_PROMPT } from "../prompts/clients/generate-email.prompt";

interface EmailSuggestion {
  subject: string;
  body: string;
}

export async function generateEmailSuggestion(
  userId: string,
  contactEmail: string,
  context: string,
): Promise<EmailSuggestion> {
  // Input validation
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("userId must be a non-empty string");
  }

  if (!contactEmail || typeof contactEmail !== "string" || contactEmail.trim().length === 0) {
    throw new Error("contactEmail must be a non-empty string");
  }

  if (!context || typeof context !== "string" || context.trim().length === 0) {
    throw new Error("context must be a non-empty string");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contactEmail)) {
    throw new Error("contactEmail must be a valid email address");
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: EMAIL_SUGGESTION_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Generate an email for contact ${contactEmail} with context: ${context}`,
    },
  ];

  try {
    const EmailSchema = z.object({
      subject: z.string(),
      body: z.string(),
    });

    const response = await generateText<EmailSuggestion>(userId, {
      model: "gpt-4o", // Using GPT-4o for high-quality email suggestions
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      responseSchema: EmailSchema,
    });

    const emailSuggestion: EmailSuggestion = response.data;
    return emailSuggestion;
  } catch (error) {
    console.error(`Failed to generate email suggestion for ${contactEmail}:`, error);
    throw new Error(
      `Failed to generate email suggestion: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
