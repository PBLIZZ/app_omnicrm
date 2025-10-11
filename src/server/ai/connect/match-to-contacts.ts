// New file for matching emails to contacts

import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { buildSuggestNewContactPrompt } from "@/server/ai/prompts/connect/suggest-new-contact.prompt";
import { generateText } from "@/server/ai/core/llm.service";

// Fuzzy matching configuration constants
const MATCH_CONFIDENCE_THRESHOLD = 0.6;
const MAX_CONFIDENCE_CAP = 0.85;

export interface ContactMatch {
  contactId: string | null;
  confidence: number;
  matchingFactors: string[];
  suggestedNewContact?: {
    displayName: string;
    primaryEmail: string;
    estimatedStage: string;
    suggestedTags: string[];
  };
}

export async function matchToContacts(
  userId: string,
  emailData: {
    senderEmail?: string;
    senderName?: string;
    bodyText?: string;
    recipientEmails?: string[];
  },
): Promise<ContactMatch> {
  const { senderEmail = "", senderName = "", bodyText = "" } = emailData;
  const db = await getDb();

  // Exact email match
  if (senderEmail) {
    const exactMatch = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, senderEmail.toLowerCase())))
      .limit(1);

    if (exactMatch.length > 0) {
      const match = exactMatch[0];
      if (match?.id) {
        return {
          contactId: match.id,
          confidence: 0.95,
          matchingFactors: ["exact_email_match"],
        };
      }
    }
  }

  // Partial name matching
  if (senderName && senderName.length > 0) {
    const nameWords = senderName
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/[^\w]/g, "")) // Remove punctuation
      .filter((word) => /^[a-z]{1,}$/.test(word)); // Accept alphabetic tokens of any reasonable length

    if (nameWords.length > 0) {
      const fuzzyMatches = await db
        .select()
        .from(contacts)
        .where(eq(contacts.userId, userId))
        .limit(20);

      for (const contact of fuzzyMatches) {
        const contactNameWords = contact.displayName.toLowerCase().split(/\s+/);
        const matchingWords = nameWords.filter((word) =>
          contactNameWords.some(
            (contactWord) => contactWord.includes(word) || word.includes(contactWord),
          ),
        );

        if (matchingWords.length >= Math.min(nameWords.length, 2)) {
          const confidence =
            matchingWords.length / Math.max(nameWords.length, contactNameWords.length);

          if (confidence > MATCH_CONFIDENCE_THRESHOLD) {
            return {
              contactId: contact.id,
              confidence: Math.min(confidence, MAX_CONFIDENCE_CAP),
              matchingFactors: [`name_match_${matchingWords.length}_words`],
            };
          }
        }
      }
    }
  }

  // Suggest new contact if no match
  if (senderEmail && senderName) {
    try {
      const messages = buildSuggestNewContactPrompt({ senderName, senderEmail, bodyText });
      const response = await generateText<{
        displayName: string;
        primaryEmail: string;
        estimatedStage: string;
        suggestedTags: string[];
      }>(userId, { model: "default", messages });

      return {
        contactId: null,
        confidence: 0.0,
        matchingFactors: [],
        suggestedNewContact: response.data,
      };
    } catch (error) {
      // Log error but continue
      console.error("Failed to generate contact suggestion", error);
    }
  }

  return {
    contactId: null,
    confidence: 0.0,
    matchingFactors: [],
  };
}
