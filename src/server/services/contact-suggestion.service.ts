import { getDb } from "@/server/db/client";
import { contacts, notes } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { calendarStorage } from "@/server/storage/calendar.storage";
import { ContactIntelligenceService } from "./contact-intelligence.service";
import { logger } from "@/lib/observability";

export interface ContactSuggestion {
  id: string;
  displayName: string;
  email: string;
  eventCount: number;
  lastEventDate: string;
  eventTitles: string[];
  confidence: "high" | "medium" | "low";
  source: "calendar_attendee";
}

export class ContactSuggestionService {
  /**
   * Analyze calendar events and suggest contacts to create.
   * Focuses purely on attendees from calendar events who aren't already contacts.
   */
  static async getContactSuggestions(userId: string): Promise<ContactSuggestion[]> {
    try {
      const db = await getDb();

      // Get existing contact emails to avoid duplicates
      const existingContacts = await db
        .select({ email: contacts.primaryEmail })
        .from(contacts)
        .where(eq(contacts.userId, userId));

      const existingEmails = existingContacts.map((c) => c.email).filter(Boolean) as string[];

      // Analyze calendar attendees using the calendar storage layer
      const attendeeAnalysis = await calendarStorage.getAttendeeAnalysis(userId);
      const suggestions: ContactSuggestion[] = [];

      for (const row of attendeeAnalysis) {
        const email = row.email;
        const displayName = row.display_name;
        const eventCount = row.event_count;
        const lastEventDate = row.last_event_date;
        const eventTitles = row.event_titles;

        // Skip if email already exists in contacts
        if (existingEmails.includes(email)) {
          continue;
        }

        // Skip system/group emails
        if (this.isSystemEmail(email)) {
          continue;
        }

        // Skip if no proper display name or just email-like names
        if (!displayName || displayName.trim() === "" || displayName === email) {
          continue;
        }

        // Calculate confidence based on engagement
        const confidence = this.calculateConfidence(eventCount, lastEventDate);

        suggestions.push({
          id: this.generateSuggestionId(email),
          displayName: displayName.trim(),
          email: email.toLowerCase(),
          eventCount,
          lastEventDate,
          eventTitles: eventTitles.slice(0, 5), // Limit to 5 titles
          confidence,
          source: "calendar_attendee",
        });
      }

      return suggestions.slice(0, 20); // Limit to top 20 suggestions
    } catch (error) {
      await logger.error(
        "Error generating contact suggestions",
        {
          operation: "contacts.suggestions.generate",
          additionalData: { userId: userId.slice(0, 8) + "..." },
        },
        error instanceof Error ? error : undefined,
      );
      return [];
    }
  }

  /**
   * Create contacts from approved suggestions
   */
  static async createContactsFromSuggestions(
    userId: string,
    suggestionIds: string[],
  ): Promise<{
    success: boolean;
    createdCount: number;
    errors: string[];
  }> {
    try {
      const db = await getDb();

      // Get fresh suggestions to validate
      const allSuggestions = await this.getContactSuggestions(userId);
      const validSuggestions = allSuggestions.filter((s) => suggestionIds.includes(s.id));

      let createdCount = 0;
      const errors: string[] = [];

      // Generate AI insights for all suggestions
      const emailsToAnalyze = validSuggestions.map((s) => s.email);
      const contactInsights = await ContactIntelligenceService.bulkGenerateInsights(
        userId,
        emailsToAnalyze,
      );

      for (const suggestion of validSuggestions) {
        try {
          const insights = contactInsights.get(suggestion.email);

          // Create the contact first
          const [newContact] = await db
            .insert(contacts)
            .values({
              userId,
              displayName: suggestion.displayName,
              primaryEmail: suggestion.email,
              source: "calendar_import",
              stage: insights?.stage,
              tags: insights?.tags ? JSON.stringify(insights.tags) : null,
              confidenceScore: insights?.confidenceScore?.toString(),
            })
            .returning({ id: contacts.id });

          // Create a note separately if we have AI-generated content
          if (insights?.noteContent && newContact?.id) {
            await db.insert(notes).values({
              contactId: newContact.id,
              userId,
              content: `[OmniBot] ${insights.noteContent}`,
            });
          }

          createdCount++;
        } catch (error) {
          const errorMsg = `Failed to create ${suggestion.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
          await logger.error(
            "Failed to create contact from suggestion",
            {
              operation: "contacts.suggestions.create",
              additionalData: {
                userId: userId.slice(0, 8) + "...",
                suggestionEmail: suggestion.email,
                suggestionName: suggestion.displayName,
              },
            },
            error instanceof Error ? error : undefined,
          );
          errors.push(errorMsg);
        }
      }

      return {
        success: createdCount > 0,
        createdCount,
        errors,
      };
    } catch (error) {
      await logger.error(
        "Error creating contacts from suggestions",
        {
          operation: "contacts.suggestions.bulk_create",
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            suggestionCount: suggestionIds.length,
          },
        },
        error instanceof Error ? error : undefined,
      );
      return {
        success: false,
        createdCount: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Check if email is a system/service email that shouldn't become a contact.
   * Focuses on calendar service emails and common automated senders.
   */
  private static isSystemEmail(email: string): boolean {
    const systemPatterns = [
      // Google Calendar system emails
      /@group\.calendar\.google\.com$/,
      /@calendar\.google\.com$/,
      /@resource\.calendar\.google\.com$/,

      // Common automated/service emails
      /noreply/i,
      /no-reply/i,
      /support@/i,
      /admin@/i,
      /system@/i,
      /notification@/i,
      /automated@/i,
      /@zoom\.us$/i,
      /@teams\.microsoft\.com$/i,
    ];

    return systemPatterns.some((pattern) => pattern.test(email));
  }

  /**
   * Calculate confidence level based on calendar engagement metrics.
   * Higher confidence for recent, frequent calendar interactions.
   */
  private static calculateConfidence(
    eventCount: number,
    lastEventDate: string,
  ): "high" | "medium" | "low" {
    const lastDate = new Date(lastEventDate);
    const daysSinceLastEvent = Math.floor(
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // High confidence: Recent and frequent calendar activity
    if (eventCount >= 3 && daysSinceLastEvent <= 30) {
      return "high";
    }

    // Medium confidence: Either recent OR frequent calendar presence
    if (eventCount >= 2 || daysSinceLastEvent <= 60) {
      return "medium";
    }

    // Low confidence: Infrequent or old calendar interactions
    return "low";
  }

  /**
   * Generate a consistent ID for a suggestion
   */
  private static generateSuggestionId(email: string): string {
    return `suggestion_${Buffer.from(email).toString("base64url")}`;
  }
}
