// New file for categorize inbox item prompt

import type { ChatMessage } from "@/server/ai/core/llm.service";

interface InboxProcessingContext {
  zones: Array<{ name: string }>;
  userContext?: {
    currentEnergy: number;
    availableTime: number;
    preferences: {
      preferredZone?: string;
      workingHours?: { start: string; end: string };
    };
  };
}

export function buildCategorizeInboxItemPrompt(
  rawText: string,
  context: InboxProcessingContext,
): ChatMessage[] {
  const zoneList = context.zones.map((z: InboxProcessingContext["zones"][0]) => z.name).join(", ");

  let userContextStr = "";
  if (context.userContext) {
    const { currentEnergy, availableTime, preferences } = context.userContext;
    userContextStr = `
Current Context:
- Energy Level: ${currentEnergy ? `${currentEnergy}/5` : "Not specified"}
- Available Time: ${availableTime ? `${availableTime} minutes` : "Not specified"}
- Preferred Zone: ${preferences?.preferredZone || "No preference"}
- Working Hours: ${preferences?.workingHours ? `${preferences.workingHours.start} - ${preferences.workingHours.end}` : "Not specified"}`;
  }

  const systemPrompt = `You are an AI assistant specialized in helping wellness practitioners organize their work and life. Your task is to analyze raw text input and categorize it into the appropriate life-business zone while extracting actionable tasks.

Available Zones: ${zoneList}

Zone Descriptions:
- Personal Wellness: Self-care activities, personal health goals, mindfulness practices
- Self Care: Rest, relaxation, personal time, hobbies, mental health
- Admin & Finances: Bookkeeping, taxes, administrative tasks, financial planning
- Business Development: Marketing, networking, business growth, strategy
- Social Media & Marketing: Content creation, social media posts, marketing campaigns
- Client Care: Client sessions, follow-ups, client communication, service delivery

Respond with valid JSON matching this exact schema:
{
  "suggestedZone": string, // Must be one of the available zones
  "suggestedPriority": "low" | "medium" | "high" | "urgent",
  "suggestedProject": string | null, // Optional project name if this relates to a larger initiative
  "extractedTasks": [
    {
      "name": string, // Clear, actionable task name
      "description": string | null, // Optional detailed description
      "estimatedMinutes": number | null, // Estimated time to complete (optional)
      "dueDate": string | null // ISO date string if there's a deadline (optional)
    }
  ],
  "confidence": number, // 0.0 to 1.0, confidence in the categorization
  "reasoning": string // Brief explanation of the categorization decision
}`;

  const userPrompt = `Please analyze the following input and categorize it appropriately:

Raw Input: "${rawText}"
${userContextStr}

Consider the user's current context when making suggestions. Break down the input into specific, actionable tasks and categorize them into the most appropriate life-business zone.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}
