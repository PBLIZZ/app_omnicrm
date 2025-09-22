/**
 * GET /api/gmail/insights — AI-powered email insights endpoint
 *
 * Provides AI-generated insights and patterns from Gmail data
 */
import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { rawEvents, contacts } from "@/server/db/schema";

interface Insights {
  patterns?: string[];
  emailVolume?: {
    total: number;
    thisWeek: number;
    trend: "up" | "down" | "stable";
  };
  topContacts?: Array<{
    displayName?: string;
    email: string;
    emailCount: number;
  }>;
}

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
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

    // Calculate trend
    const total = totalEmails[0]?.count || 0;
    const thisWeek = thisWeekEmails[0]?.count || 0;
    const lastWeek = lastWeekEmails[0]?.count || 0;

    let trend: "up" | "down" | "stable" = "stable";
    if (thisWeek > lastWeek * 1.1) trend = "up";
    else if (thisWeek < lastWeek * 0.9) trend = "down";

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

    const contactsMap = new Map();
    contactsData.forEach(c => contactsMap.set(c.id, c));

    const topContacts = topContactsQuery.map(item => ({
      displayName: item.contactId && contactsMap.has(item.contactId)
        ? contactsMap.get(item.contactId)?.displayName
        : undefined,
      email: item.contactId && contactsMap.has(item.contactId)
        ? contactsMap.get(item.contactId)?.primaryEmail || "Unknown"
        : "Unknown",
      emailCount: item.count,
    }));

    // Generate insights patterns based on data
    const patterns: string[] = [];

    if (thisWeek > 0) {
      patterns.push(`You've received ${thisWeek} emails this week`);
    }

    if (trend === "up") {
      patterns.push("Email volume is trending upward - consider setting up better filters");
    } else if (trend === "down") {
      patterns.push("Email volume has decreased - might be a good time to reach out to clients");
    }

    const firstContact = topContacts[0];
    if (firstContact && firstContact.emailCount > 5) {
      patterns.push(`${firstContact.displayName || firstContact.email} has been your most active contact this week`);
    }

    if (total > 100) {
      patterns.push("Consider setting up automated email processing to save time");
    }

    const insights: Insights = {
      patterns,
      emailVolume: {
        total,
        thisWeek,
        trend,
      },
      topContacts,
    };

    return NextResponse.json({ insights });

  } catch (error: unknown) {
    console.error("GET /api/gmail/insights error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    if (errorMessage.includes("unauthorized") || errorMessage.includes("auth")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}