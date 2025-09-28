/**
 * Contact AI Actions Service
 *
 * Service wrapper for AI-powered contact actions. Provides a unified interface
 * for various AI operations on contacts.
 */

import {
  askAIAboutContact,
  type ContactAIInsightResponse,
} from "@/server/ai/clients/ask-ai-about-contact";
import { logger } from "@/lib/observability";

/**
 * Service class for Contact AI Actions
 */
export class ContactAIActionsService {
  /**
   * Ask AI about a specific contact
   *
   * @param userId - User ID making the request
   * @param contactId - Contact ID to analyze
   * @returns AI-generated insights about the contact
   */
  static async askAIAboutContact(
    userId: string,
    contactId: string,
  ): Promise<ContactAIInsightResponse> {
    // Validate parameters
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      throw new Error("userId must be a non-empty string");
    }

    if (!contactId || typeof contactId !== "string" || contactId.trim().length === 0) {
      throw new Error("contactId must be a non-empty string");
    }

    try {
      return await askAIAboutContact(userId, contactId);
    } catch (error) {
      logger.error(
        "Failed to ask AI about contact",
        {
          operation: "ask_ai_about_contact",
          additionalData: { userId, contactId },
        },
        error instanceof Error ? error : new Error(String(error)),
      );

      // Return a consistent error response with explicit error indicators
      return {
        insights: "Unable to generate insights at this time",
        suggestions: [],
        nextSteps: [],
        keyFindings: [],
        confidence: 0,
        error: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
