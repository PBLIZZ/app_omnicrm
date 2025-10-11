// New file for extracting wisdom from emails

import { generateText, ChatMessage } from "@/server/ai/core/llm.service";
import { EmailClassification } from "@/server/ai/types/connect-types";

const buildExtractWisdomPrompt = ({
  subject,
  bodyText,
  senderName,
  classification,
}: {
  subject: string;
  bodyText: string;
  senderName: string;
  classification: EmailClassification;
}): ChatMessage[] => {
  return [
    {
      role: "system",
      content: `You are an expert email analyst specializing in extracting actionable wisdom from business communications. 
      
Your task is to analyze emails and extract:
- Key insights about the sender's situation, needs, or concerns
- Actionable items that require follow-up
- Wellness-related tags if applicable
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
Classification: ${classification}
Body: ${bodyText}

Focus on actionable insights that can help improve client relationships and business outcomes.`,
    },
  ];
};

export interface EmailWisdom {
  keyInsights: string[];
  actionItems: string[];
  wellnessTags: string[];
  marketingTips?: string[];
  businessOpportunities?: string[];
  clientMood?: "positive" | "neutral" | "concerned" | "frustrated" | "excited";
  followUpRecommended?: boolean;
  followUpReason?: string;
}

export async function extractWisdom(
  userId: string,
  emailData: {
    subject?: string;
    bodyText?: string;
    senderEmail?: string;
    senderName?: string;
    classification: EmailClassification;
  },
): Promise<EmailWisdom> {
  const { subject = "", bodyText = "", senderName = "", classification } = emailData;

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
    return response.data;
  } catch (error) {
    console.error("Failed to extract wisdom from email:", error);
    // Return fallback wisdom data
    return {
      keyInsights: ["Unable to analyze email content"],
      actionableItems: [],
      wellnessTags: [],
      marketingOpportunities: [],
      businessOpportunities: [],
      clientMood: "neutral",
      followUpRecommended: false,
      followUpReason: "Analysis failed",
    };
  }
}
