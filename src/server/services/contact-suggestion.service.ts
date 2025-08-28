import { getDb } from '@/server/db/client';
import { contacts } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { ContactIntelligenceService } from './contact-intelligence.service';

export interface ContactSuggestion {
  id: string;
  displayName: string;
  email: string;
  eventCount: number;
  lastEventDate: string;
  eventTitles: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'calendar_attendee';
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

      const existingEmails = existingContacts
        .map(c => c.email)
        .filter(Boolean) as string[];

      // Analyze calendar attendees using CTE to handle JSON array expansion
      const attendeeAnalysis = await db.execute(sql`
        WITH expanded_attendees AS (
          SELECT 
            ce.user_id,
            ce.title,
            ce.start_time,
            attendee_data->>'email' as email,
            attendee_data->>'displayName' as display_name
          FROM calendar_events ce,
               jsonb_array_elements(ce.attendees) as attendee_data
          WHERE ce.user_id = ${userId}
            AND ce.attendees IS NOT NULL 
            AND jsonb_array_length(ce.attendees) > 0
        )
        SELECT 
          email,
          display_name,
          COUNT(*) as event_count,
          MAX(start_time) as last_event_date,
          array_agg(DISTINCT title ORDER BY title) as event_titles
        FROM expanded_attendees
        WHERE email IS NOT NULL 
          AND email != ''
          AND display_name IS NOT NULL
          AND display_name != ''
        GROUP BY email, display_name
        HAVING COUNT(*) >= 1
        ORDER BY event_count DESC, last_event_date DESC
      `);

      const suggestions: ContactSuggestion[] = [];

      for (const row of attendeeAnalysis.rows) {
        const email = row['email'] as string;
        const displayName = row['display_name'] as string;
        const eventCount = row['event_count'] as number;
        const lastEventDate = row['last_event_date'] as string;
        const eventTitles = row['event_titles'] as string[];

        // Skip if email already exists in contacts
        if (existingEmails.includes(email)) {
          continue;
        }

        // Skip system/group emails
        if (this.isSystemEmail(email)) {
          continue;
        }

        // Skip if no proper display name or just email-like names
        if (!displayName || displayName.trim() === '' || displayName === email) {
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
          source: 'calendar_attendee',
        });
      }

      return suggestions.slice(0, 20); // Limit to top 20 suggestions

    } catch (error) {
      console.error('❌ Error generating contact suggestions:', error);
      return [];
    }
  }

  /**
   * Create contacts from approved suggestions
   */
  static async createContactsFromSuggestions(
    userId: string, 
    suggestionIds: string[]
  ): Promise<{
    success: boolean;
    createdCount: number;
    errors: string[];
  }> {
    try {
      const db = await getDb();

      // Get fresh suggestions to validate
      const allSuggestions = await this.getContactSuggestions(userId);
      const validSuggestions = allSuggestions.filter(s => suggestionIds.includes(s.id));

      let createdCount = 0;
      const errors: string[] = [];

      // Generate AI insights for all suggestions
      const emailsToAnalyze = validSuggestions.map(s => s.email);
      const contactInsights = await ContactIntelligenceService.bulkGenerateInsights(userId, emailsToAnalyze);

      for (const suggestion of validSuggestions) {
        try {
          const insights = contactInsights.get(suggestion.email);
          
          await db.insert(contacts).values({
            userId,
            displayName: suggestion.displayName,
            primaryEmail: suggestion.email,
            source: 'calendar_import',
            notes: insights?.noteContent,
            stage: insights?.stage,
            tags: insights?.tags ? JSON.stringify(insights.tags) : null,
            confidenceScore: insights?.confidenceScore?.toString(),
          });

          createdCount++;

        } catch (error) {
          const errorMsg = `Failed to create ${suggestion.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      return {
        success: createdCount > 0,
        createdCount,
        errors,
      };

    } catch (error) {
      console.error('❌ Error creating contacts from suggestions:', error);
      return {
        success: false,
        createdCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
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

    return systemPatterns.some(pattern => pattern.test(email));
  }

  /**
   * Calculate confidence level based on calendar engagement metrics.
   * Higher confidence for recent, frequent calendar interactions.
   */
  private static calculateConfidence(
    eventCount: number, 
    lastEventDate: string
  ): 'high' | 'medium' | 'low' {
    const lastDate = new Date(lastEventDate);
    const daysSinceLastEvent = Math.floor(
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // High confidence: Recent and frequent calendar activity
    if (eventCount >= 3 && daysSinceLastEvent <= 30) {
      return 'high';
    }

    // Medium confidence: Either recent OR frequent calendar presence
    if (eventCount >= 2 || daysSinceLastEvent <= 60) {
      return 'medium';
    }

    // Low confidence: Infrequent or old calendar interactions
    return 'low';
  }

  /**
   * Generate a consistent ID for a suggestion
   */
  private static generateSuggestionId(email: string): string {
    return `suggestion_${Buffer.from(email).toString('base64url')}`;
  }
}