// New file for email categorization logic

import { generateText } from "@/server/ai/core/llm.service";
import { ChatMessage } from "@/server/ai/core/llm.service"; // Assuming types are exported
import { buildCategorizeEmailPrompt } from "@/server/ai/prompts/connect/categorize-email.prompt";

// Types (extract to types file later)
export interface EmailClassification {
  primaryCategory: string;
  subCategory: string;
  confidence: number;
  businessRelevance: number;
  reasoning: string;
  extractedMetadata: {
    senderDomain?: string;
    hasAppointmentLanguage?: boolean;
    hasPaymentLanguage?: boolean;
    isFromClient?: boolean;
    urgencyLevel?: "low" | "medium" | "high" | "urgent";
  };
}

export async function categorizeEmail(
  userId: string,
  emailData: {
    subject?: string;
    bodyText?: string;
    senderEmail?: string;
    senderName?: string;
    recipientEmails?: string[];
    occurredAt: Date;
  },
): Promise<EmailClassification> {
  const { subject = "", bodyText = "", senderEmail = "", senderName = "" } = emailData;

  const senderDomain = senderEmail.includes("@") ? senderEmail.split("@")[1] : undefined;

  const messages: ChatMessage[] = buildCategorizeEmailPrompt({
    subject,
    bodyText,
    senderEmail,
    senderName,
  });

  const response = await generateText<EmailClassification>(userId, { model: "default", messages });

  const enrichedData: EmailClassification = {
    ...response.data,
    extractedMetadata: {
      ...response.data.extractedMetadata,
      ...(senderDomain !== undefined && { senderDomain }),
    },
  };

  return enrichedData;
}
