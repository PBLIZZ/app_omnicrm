// Extracted from contact-ai-actions.service.ts

import { generateText, ChatMessage } from "@/server/ai/core/llm.service";
import { getContactData, ContactWithContext } from "@/server/ai/clients/utils/contact-utils";

function buildGenerateNotePrompt(data: ContactWithContext): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are an AI assistant specialized in generating structured note suggestions for CRM contacts. Your task is to analyze contact data and provide actionable, categorized note suggestions.

## Note Categories:
- **summary**: High-level overview of the contact's status, key characteristics, or relationship summary
- **interaction**: Specific details about recent communications, meetings, or touchpoints
- **observation**: Behavioral patterns, preferences, pain points, or notable characteristics
- **follow-up**: Actionable next steps, reminders, or future engagement opportunities

## Priority Levels:
- **high**: Urgent actions, critical information, or time-sensitive items
- **medium**: Important but not urgent items requiring attention
- **low**: Nice-to-have information or future considerations

## Guidelines:
- Keep notes concise but informative (1-3 sentences per note)
- Focus on actionable insights and relationship-building opportunities
- Emphasize recent interactions, communication patterns, and engagement history
- Consider the contact's role, industry, and relationship stage
- Use a professional but personable tone
- Prioritize information that helps with future interactions

## Output Format:
Return your response as a JSON object with a "notes" array. Each note should have:
- content: The note text (string)
- category: One of the categories above (string)
- priority: One of the priority levels above (string)

## Example Format:
{
  "notes": [
    {
      "content": "Client expressed interest in Q2 expansion plans during last call. Mentioned budget approval pending board review.",
      "category": "interaction",
      "priority": "high"
    },
    {
      "content": "Prefers email communication over phone calls. Responds best to detailed technical specifications.",
      "category": "observation", 
      "priority": "medium"
    }
  ]
}`,
    },
    {
      role: "user",
      content: `Generate structured note suggestions for this contact based on their data and interaction history:

Contact Data:
${JSON.stringify(data, null, 2)}

Please analyze the contact information and provide 3-5 relevant note suggestions that would be valuable for future interactions and relationship management.`,
    },
  ];
}

export interface ContactNoteSuggestion {
  content: string;
  category: "summary" | "interaction" | "observation" | "follow-up";
  priority: "high" | "medium" | "low";
}

export async function generateNoteSuggestions(
  userId: string,
  contactId: string,
): Promise<ContactNoteSuggestion[]> {
  const contactData = await getContactData(userId, contactId);

  if (!contactData.contact) {
    throw new Error("Contact not found");
  }

  const messages = buildGenerateNotePrompt(contactData);

  const response = await generateText<{ notes: ContactNoteSuggestion[] }>(userId, {
    model: "default",
    messages,
  });

  return response.data.notes ?? [];
}
