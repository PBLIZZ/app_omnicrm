// New prompt for wiki extraction

import { ChatMessage } from "@/server/ai/core/llm.service";
import { sanitizeText } from "@/lib/utils/sanitization";

export function buildExtractWikiDetailsPrompt(content: string): ChatMessage[] {
  // Input validation
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    throw new TypeError("content must be a non-empty string");
  }

  // Sanitize content to prevent prompt injection using centralized utility
  const sanitizedContent = sanitizeText(content, 5000);

  return [
    {
      role: "system",
      content: `You are a content analyzer that extracts business and marketing wiki information from text.

**Business Wiki**: Internal processes, SOPs, organizational strategies, governance policies, metrics, operational procedures, and strategic items tied to internal business functions.

**Marketing Wiki**: Campaign ideas, content topics, target audiences, messaging strategies, creative briefs, channel tactics, and externally facing promotional items.

**Output Format**: Return ONLY a valid JSON object with this exact structure:
{
  "businessWiki": string[],
  "marketingWiki": string[]
}

**Rules**:
- Each array should contain concise, bullet-like strings
- Deduplicate similar entries
- Return empty arrays [] if no items found in a category
- No additional text outside the JSON
- Each string should be 1-2 sentences maximum`,
    },
    {
      role: "user",
      content: `Analyze this content and extract business and marketing wiki information:

${sanitizedContent}`,
    },
  ];
}
