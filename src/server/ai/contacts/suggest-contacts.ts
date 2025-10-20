/**
 * Contact Suggestions from Calendar Events
 *
 * Refactored to use calendar_events table instead of parsing raw_events.
 * This is more efficient and leverages already-normalized data.
 *
 * Data flow:
 * 1. Query calendar_events table (last 6 months)
 * 2. Extract attendees from JSONB field
 * 3. Filter out existing contacts and system emails
 * 4. Aggregate by email to count interactions
 * 5. Return suggestions sorted by interaction count
 */

import { getDb } from "@/server/db/client";
import { contacts, interactions } from "@/server/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import crypto from "crypto";

export interface ContactSuggestion {
  id: string;
  displayName: string;
  email: string;
  eventCount: number;
  lastEventDate: string;
  eventTitles: string[];
  confidence: "high" | "medium" | "low";
  source: "calendar_attendee" | "email";
}

// Google Calendar attendee structure
interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
}

export async function getContactSuggestions(
  userId: string,
  maxSuggestions: number = 20,
): Promise<ContactSuggestion[]> {
  // Validate and clamp maxSuggestions
  const limit = Math.max(1, Math.min(maxSuggestions, 100));

  const existingEmails = await getExistingEmails(userId);
  const recentEvents = await getRecentCalendarEvents(userId);

  // Build map of email -> {displayName, events[]}
  const attendeeMap = new Map<
    string,
    { displayName: string; events: Array<{ title: string; date: Date }> }
  >();

  for (const event of recentEvents) {
    // Extract attendees from sourceMeta (calendar event data is stored there)
    const sourceMeta = event.attendees;
    const attendees =
      sourceMeta && typeof sourceMeta === "object" && "attendees" in sourceMeta
        ? (sourceMeta["attendees"] as CalendarAttendee[] | undefined)
        : undefined;

    if (!attendees || !Array.isArray(attendees)) continue;

    for (const attendee of attendees) {
      if (
        !attendee.email ||
        existingEmails.includes(attendee.email) ||
        isSystemEmail(attendee.email)
      ) {
        continue;
      }

      const displayName = attendee.displayName ?? attendee.email.split("@")[0] ?? "Unknown";

      if (!attendeeMap.has(attendee.email)) {
        attendeeMap.set(attendee.email, { displayName, events: [] });
      }

      const attendeeData = attendeeMap.get(attendee.email);
      if (attendeeData) {
        attendeeData.events.push({
          title: event.title,
          date: event.startTime,
        });
      }
    }
  }

  // Convert map to suggestions
  const suggestions: ContactSuggestion[] = Array.from(attendeeMap.entries()).map(
    ([email, data]) => ({
      id: generateSuggestionId(email),
      displayName: data.displayName,
      email,
      eventCount: data.events.length,
      lastEventDate: data.events[0]?.date.toISOString() ?? new Date().toISOString(),
      eventTitles: data.events.map((e) => e.title),
      confidence: calculateConfidence(data.events.length),
      source: "calendar_attendee" as const,
    }),
  );

  // Sort by event count (most interactions first)
  suggestions.sort((a, b) => b.eventCount - a.eventCount);

  return suggestions.slice(0, limit);
}

// Helpers (extracted)
async function getExistingEmails(userId: string): Promise<string[]> {
  const db = await getDb();
  const existing = await db
    .select({ email: contacts.primaryEmail })
    .from(contacts)
    .where(eq(contacts.userId, userId));
  return existing.map((c) => c.email).filter(Boolean) as string[];
}

async function getRecentCalendarEvents(userId: string): Promise<
  Array<{
    id: string;
    title: string;
    startTime: Date;
    attendees: unknown; // This is actually sourceMeta containing calendar event data
  }>
> {
  const db = await getDb();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const events = await db
    .select({
      id: interactions.id,
      title: interactions.subject,
      startTime: interactions.occurredAt,
      attendees: interactions.sourceMeta, // sourceMeta contains calendar event data including attendees
    })
    .from(interactions)
    .where(
      and(
        eq(interactions.userId, userId),
        eq(interactions.type, "calendar"),
        gte(interactions.occurredAt, sixMonthsAgo),
      ),
    )
    .orderBy(desc(interactions.occurredAt));

  return events.map((event) => ({
    ...event,
    title: event.title ?? "Untitled Event",
  }));
}

function calculateConfidence(eventCount: number): "high" | "medium" | "low" {
  if (eventCount >= 5) return "high";
  if (eventCount >= 2) return "medium";
  return "low";
}

function isSystemEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;

  const normalizedEmail = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) return false;

  const [localPart, domain] = normalizedEmail.split("@");

  if (!localPart || !domain) return false;

  // Common system email patterns
  const systemPatterns = [
    "no-reply",
    "noreply",
    "donotreply",
    "mailer-daemon",
    "postmaster",
    "admin",
    "support-bounces",
    "bounce",
    "nobody",
    "daemon",
  ];

  const systemDomains = ["noreply.com", "no-reply.com", "mailer-daemon.com", "postmaster.com"];

  return (
    systemPatterns.some((pattern) => localPart.includes(pattern)) || systemDomains.includes(domain)
  );
}

function generateSuggestionId(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const hash = crypto.createHash("sha256").update(normalizedEmail).digest("hex").substring(0, 8);
  return `sug-${hash}`;
}
