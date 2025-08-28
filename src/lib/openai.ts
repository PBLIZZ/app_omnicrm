// OpenAI integration for task categorization
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

import { env } from "@/lib/env";

export interface CategorySuggestion {
  category: string;
  confidence: number;
}

export async function categorizeTask(
  title: string,
  description?: string,
): Promise<CategorySuggestion> {
  try {
    const apiKey = env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `Analyze this wellness business task and suggest the most appropriate category from these options:
- client-care: Tasks related to direct client interaction, consultations, care
- business-development: Marketing, partnerships, growth activities
- administrative: Paperwork, insurance, legal, operational tasks
- content-creation: Writing, newsletters, social media, educational content
- personal-wellness: Personal development, self-care for the business owner

Task: "${title}"
${description ? `Description: "${description}"` : ""}

Respond with JSON in this exact format: { "category": "category-name", "confidence": 0.85 }`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at categorizing wellness business tasks. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      category: result.category || "personal-wellness",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
    };
  } catch (error) {
    console.error("AI categorization failed:", error);
    // Fallback to simple categorization
    return {
      category: "personal-wellness",
      confidence: 0.1,
    };
  }
}
