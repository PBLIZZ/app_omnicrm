// New file for extracting wisdom from emails

import { generateText } from "@/server/ai/core/llm.service";
import type { ChatMessage } from "@/server/ai/core/llm.service";

interface EmailWisdom {
  keyInsights: string[];
  actionableItems: string[];
  marketingOpportunities: string[];
  businessOpportunities: string[];
  clientMood: string;
  followUpRecommended: boolean;
  followUpReason?: string | undefined;
}

const buildExtractWisdomPrompt = ({
  subject,
  bodyText,
  senderName,
  classification,
}: {
  subject: string;
  bodyText: string;
  senderName: string;
  classification: {
    primaryCategory: string;
    subCategory: string;
    confidence: number;
    businessRelevance: number;
    reasoning: string;
    extractedMetadata?: Record<string, unknown>;
  };
}): ChatMessage[] => {
  return [
    {
      role: "system",
      content: `You are an expert email analyst specializing in extracting actionable wisdom from business communications. 
      
Your task is to analyze emails and extract:
- Key insights about the sender's situation, needs, or concerns
- Actionable items that require follow-up
- Marketing opportunities if the email relates to business development
- Business opportunities that might be present
- The sender's emotional state/mood
- Whether follow-up is recommended and why

Return your analysis in JSON format matching the EmailWisdom interface.`,
    },
    {
      role: "user",
      content: `Please analyze this email and extract wisdom:

Subject: ${subject}
Sender: ${senderName}
Classification: ${classification.primaryCategory} - ${classification.subCategory}
Body: ${bodyText}

Focus on actionable insights that can help improve client relationships and business outcomes.`,
    },
  ];
};

export async function extractWisdom(
  userId: string,
  emailData: {
    subject?: string;
    bodyText?: string;
    senderEmail?: string;
    senderName?: string;
    classification: {
      primaryCategory: string;
      subCategory: string;
      confidence: number;
      businessRelevance: number;
      reasoning: string;
      extractedMetadata?: Record<string, unknown>;
    };
  },
): Promise<EmailWisdom> {
  const subject = emailData.subject ?? "";
  const bodyText = emailData.bodyText ?? "";
  const senderName = emailData.senderName ?? "";
  const classification = emailData.classification;

  // Input validation
  if (!subject || !bodyText || !senderName) {
    throw new Error("Missing required email data fields");
  }

  if (
    typeof subject !== "string" ||
    typeof bodyText !== "string" ||
    typeof senderName !== "string"
  ) {
    throw new Error("Invalid email data types");
  }

  const messages: ChatMessage[] = buildExtractWisdomPrompt({
    subject,
    bodyText,
    senderName,
    classification,
  });

  try {
    const response = await generateText<EmailWisdom>(userId, { model: "default", messages });
    const data = response.data;

    return {
      keyInsights: Array.isArray(data.keyInsights) ? data.keyInsights : [],
      actionableItems: Array.isArray(data.actionableItems) ? data.actionableItems : [],
      marketingOpportunities: Array.isArray(data.marketingOpportunities)
        ? data.marketingOpportunities
        : [],
      businessOpportunities: Array.isArray(data.businessOpportunities)
        ? data.businessOpportunities
        : [],
      clientMood: data.clientMood ?? "neutral",
      followUpRecommended: data.followUpRecommended ?? false,
      followUpReason: data.followUpReason,
    };
  } catch (error) {
    console.error("Failed to extract wisdom from email:", error);
    // Return fallback wisdom data
    return {
      keyInsights: ["Unable to analyze email content"],
      actionableItems: [],
      marketingOpportunities: [],
      businessOpportunities: [],
      clientMood: "neutral",
      followUpRecommended: false,
      followUpReason: "Analysis failed",
    };
  }
}
