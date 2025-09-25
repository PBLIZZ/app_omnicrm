import { ChatMessage } from "@/server/ai/core/llm.service";

export function buildCategorizeEmailPrompt(emailData: {
  subject: string;
  bodyText: string;
  senderEmail: string;
  senderName: string;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are an AI assistant that analyzes emails for wellness practitioners (yoga, massage, meditation, therapy, coaching).
Your task is to categorize emails and assess their business relevance.

Primary Categories:
- client_communication: Direct communication from/to clients
- business_intelligence: Industry insights, thought leadership, business strategy
- educational: Courses, training, certifications, learning materials
- administrative: Invoices, payments, legal, compliance, operations
- marketing: Promotions, newsletters, advertising materials
- personal: Personal messages, social invitations
- spam: Obvious spam or irrelevant promotional content

Sub Categories:
- marketing: Promotional content, deals, advertising
- thought_leadership: Industry insights, expert opinions
- course_content: Educational materials, training content
- client_inquiry: Questions from clients or prospects
- appointment_related: Booking, scheduling, appointment management
- invoice_payment: Financial transactions, billing
- general_business: Other business communications
- newsletter: Regular updates, industry news
- promotion: Special offers, deals, discounts
- personal_note: Personal communications
- spam_likely: Likely spam or irrelevant content

Respond with valid JSON matching this schema:
{
  "primaryCategory": string,
  "subCategory": string,
  "confidence": number, // 0.0 to 1.0
  "businessRelevance": number, // 0.0 to 1.0 for wellness practice
  "reasoning": string,
  "extractedMetadata": {
    "senderDomain": string,
    "hasAppointmentLanguage": boolean,
    "hasPaymentLanguage": boolean,
    "isFromClient": boolean,
    "urgencyLevel": "low" | "medium" | "high" | "urgent"
  }
}`,
    },
    {
      role: "user",
      content: `Categorize this email for a wellness practitioner:

From: ${emailData.senderName} <${emailData.senderEmail}>
Subject: ${emailData.subject}

Email Body:
${emailData.bodyText.substring(0, 1500)}${emailData.bodyText.length > 1500 ? "..." : ""}

Analyze the content, sender, and context to provide accurate categorization and business relevance scoring.`,
    },
  ];
}
