/**
 * AI Insights Module
 *
 * Provides AI-powered insight generation for contacts and other entities.
 * This module serves as a bridge between the AI services and the rest of the application.
 */

import { ContactIntelligenceService, type ContactInsightsWithNote } from "@/server/services/contact-intelligence.service";

// Define proper types for AI insights
export interface AIInsight {
  type: string;
  content: string;
  confidence: number;
}

export interface ContactInsights {
  summary: string;
  tags: string[];
  stage: string;
  confidenceScore: number;
  lastUpdated: string;
  insights: AIInsight[];
}

export interface InsightError {
  error: string;
}

/**
 * Generate AI insights for a contact based on their interactions and data
 *
 * @returns Promise containing the generated insights
 */
export async function generateContactInsights(): Promise<ContactInsights> {
  // For now, we'll use the contact email approach from the service
  // This is a temporary bridge until we refactor the service to accept contactId directly

  // In a real implementation, we would:
  // 1. Look up the contact by ID to get the email
  // 2. Get the userId from the contact
  // 3. Call the service with the proper parameters

  // For testing purposes, return a mock insight structure
  return {
    summary: "AI-generated summary for contact",
    tags: ["wellness", "yoga", "regular_attendee"],
    stage: "Core Client",
    confidenceScore: 0.85,
    lastUpdated: new Date().toISOString(),
    insights: [
      {
        type: "engagement",
        content: "Regular class attendee with high engagement",
        confidence: 0.9
      }
    ]
  };
}

/**
 * Generate insights for a contact using email and user ID
 * This is the actual implementation that calls the contact intelligence service
 */
export async function generateContactInsightsByEmail(
  userId: string,
  contactEmail: string,
  forceRefresh: boolean = false
): Promise<ContactInsightsWithNote> {
  return ContactIntelligenceService.generateContactInsights(userId, contactEmail, forceRefresh);
}

/**
 * Generate insights for multiple contacts in batch
 */
export async function generateBulkContactInsights(
  contactIds: string[]
): Promise<Record<string, ContactInsights | InsightError>> {
  const results: Record<string, ContactInsights | InsightError> = {};

  for (const contactId of contactIds) {
    try {
      results[contactId] = await generateContactInsights();
    } catch (error) {
      console.error(`Failed to generate insights for contact ${contactId}:`, error);
      results[contactId] = { error: "Failed to generate insights" };
    }
  }

  return results;
}

/**
 * Validate insight data structure using type guards
 */
export function validateInsights(insights: unknown): insights is ContactInsights {
  if (!insights || typeof insights !== "object") {
    return false;
  }

  const obj = insights as Record<string, unknown>;

  // Basic validation of required fields
  if (typeof obj["summary"] !== "string" || !Array.isArray(obj["tags"])) {
    return false;
  }

  // More comprehensive validation
  return typeof obj["stage"] === "string" &&
         typeof obj["confidenceScore"] === "number" &&
         typeof obj["lastUpdated"] === "string" &&
         Array.isArray(obj["insights"]) &&
         obj["insights"].every(insight =>
           typeof insight === "object" &&
           insight !== null &&
           typeof (insight as Record<string, unknown>)["type"] === "string" &&
           typeof (insight as Record<string, unknown>)["content"] === "string" &&
           typeof (insight as Record<string, unknown>)["confidence"] === "number"
         );
}

/**
 * Get insight types that can be generated
 */
export function getAvailableInsightTypes(): string[] {
  return [
    "summary",
    "next_step",
    "risk",
    "persona",
    "engagement",
    "preferences"
  ];
}