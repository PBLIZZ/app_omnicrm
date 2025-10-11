import { ChatMessage } from "@/server/ai/core/llm.service";

export function buildSuggestNewContactPrompt(data: {
  senderName: string;
  senderEmail: string;
  bodyText: string;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: `Analyze this email sender information to suggest contact details for a wellness practitioner's CRM.

Lifecycle Stages:
- Prospect: Inquiry or first contact
- New Client: Recently started services
- Core Client: Regular established client
- Referring Client: Brings referrals
- VIP Client: High-value or long-term client

Wellness Tags: Yoga, Massage, Meditation, Pilates, Stress Relief, Mental Health, etc.

Respond with JSON:
{
  "displayName": string,
  "primaryEmail": string,
  "estimatedStage": string,
  "suggestedTags": string[]
}`,
    },
    {
      role: "user",
      content: `Suggest contact details from:
Name: ${data.senderName}
Email: ${data.senderEmail}

Email content preview:
${data.bodyText.substring(0, 300)}`,
    },
  ];
}
