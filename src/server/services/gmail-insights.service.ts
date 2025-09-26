/**
 * Gmail Insights Service
 *
 * Provides AI-powered insights and patterns from Gmail data
 */

import { getDb } from "@/server/db/client";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { rawEvents, contacts } from "@/server/db/schema";

export interface EmailVolumeInsight {
  total: number;
  thisWeek: number;
  trend: "up" | "down" | "stable";
}

export interface TopContact {
  displayName?: string;
  email: string;
  emailCount: number;
}

export interface GmailInsights {
  patterns: string[];
  emailVolume: EmailVolumeInsight;
  topContacts: TopContact[];
}

export class GmailInsightsService {
  /**
   * Generate comprehensive Gmail insights for a user
   */
  static async generateInsights(userId: string): Promise<GmailInsights> {
    const db = await getDb();

    // Calculate date ranges
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get email volume stats
    const [totalEmails, thisWeekEmails, lastWeekEmails] = await Promise.all([
      // Total emails
      db
        .select({ count: sql<number>`count(*)` })
        .from(rawEvents)
        .where(
          and(
            eq(rawEvents.userId, userId),
            eq(rawEvents.provider, "gmail")
          )
        ),

      // This week's emails
      db
        .select({ count: sql<number>`count(*)` })
        .from(rawEvents)
        .where(
          and(
            eq(rawEvents.userId, userId),
            eq(rawEvents.provider, "gmail"),
            gte(rawEvents.occurredAt, oneWeekAgo)
          )
        ),

      // Last week's emails (for trend calculation)
      db
        .select({ count: sql<number>`count(*)` })
        .from(rawEvents)
        .where(
          and(
            eq(rawEvents.userId, userId),
            eq(rawEvents.provider, "gmail"),
            gte(rawEvents.occurredAt, twoWeeksAgo),
            sql`${rawEvents.occurredAt} < ${oneWeekAgo}`
          )
        ),
    ]);

    // Calculate email volume insights
    const emailVolume = this.calculateEmailVolumeInsights(
      totalEmails,
      thisWeekEmails,
      lastWeekEmails
    );

    // Get top contacts by email frequency
    const topContacts = await this.getTopContacts(userId, db, oneWeekAgo);

    // Generate insights patterns based on data
    const patterns = this.generateInsightPatterns(emailVolume, topContacts);

    return {
      patterns,
      emailVolume,
      topContacts,
    };
  }

  /**
   * Calculate email volume insights with trend analysis
   */
  private static calculateEmailVolumeInsights(
    totalEmails: Array<{ count: number }>,
    thisWeekEmails: Array<{ count: number }>,
    lastWeekEmails: Array<{ count: number }>
  ): EmailVolumeInsight {
    const total = totalEmails[0]?.count || 0;
    const thisWeek = thisWeekEmails[0]?.count || 0;
    const lastWeek = lastWeekEmails[0]?.count || 0;

    let trend: "up" | "down" | "stable" = "stable";
    if (thisWeek > lastWeek * 1.1) trend = "up";
    else if (thisWeek < lastWeek * 0.9) trend = "down";

    return {
      total,
      thisWeek,
      trend,
    };
  }

  /**
   * Get top contacts by email frequency with contact details
   */
  private static async getTopContacts(
    userId: string,
    db: Awaited<ReturnType<typeof getDb>>,
    oneWeekAgo: Date
  ): Promise<TopContact[]> {
    // Get top contacts by email frequency
    const topContactsQuery = await db
      .select({
        contactId: rawEvents.contactId,
        count: sql<number>`count(*)`,
      })
      .from(rawEvents)
      .where(
        and(
          eq(rawEvents.userId, userId),
          eq(rawEvents.provider, "gmail"),
          gte(rawEvents.occurredAt, oneWeekAgo)
        )
      )
      .groupBy(rawEvents.contactId)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // Get contact details for top contacts
    const contactIds = topContactsQuery
      .map(r => r.contactId)
      .filter(Boolean) as string[];

    const contactsData = contactIds.length > 0 ? await db
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.userId, userId),
          sql`${contacts.id} = ANY(${contactIds})`
        )
      ) : [];

    // Create typed map for contacts
    type ContactMapValue = typeof contactsData[0];
    const contactsMap = new Map<string, ContactMapValue>();
    contactsData.forEach(c => contactsMap.set(c.id, c));

    return topContactsQuery.map(item => {
      const contact = item.contactId ? contactsMap.get(item.contactId) : undefined;
      const result: TopContact = {
        email: contact?.primaryEmail || "Unknown",
        emailCount: item.count,
      };

      if (contact?.displayName) {
        result.displayName = contact.displayName;
      }

      return result;
    });
  }

  /**
   * Generate insight patterns based on email data analysis
   */
  private static generateInsightPatterns(
    emailVolume: EmailVolumeInsight,
    topContacts: TopContact[]
  ): string[] {
    const patterns: string[] = [];

    if (emailVolume.thisWeek > 0) {
      patterns.push(`You've received ${emailVolume.thisWeek} emails this week`);
    }

    if (emailVolume.trend === "up") {
      patterns.push("Email volume is trending upward - consider setting up better filters");
    } else if (emailVolume.trend === "down") {
      patterns.push("Email volume has decreased - might be a good time to reach out to clients");
    }

    const firstContact = topContacts[0];
    if (firstContact && firstContact.emailCount > 5) {
      patterns.push(`${firstContact.displayName || firstContact.email} has been your most active contact this week`);
    }

    if (emailVolume.total > 100) {
      patterns.push("Consider setting up automated email processing to save time");
    }

    return patterns;
  }
}