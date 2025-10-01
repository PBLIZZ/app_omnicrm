// Refactored from contact-suggestion.service.ts with AI integration

import { getDb } from "@/server/db/client";
import { contacts, rawEvents } from "@/server/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { parseRawEvent, type ParsedEvent } from "./parse-raw-event";
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

export async function getContactSuggestions(
  userId: string,
  maxSuggestions: number = 20,
): Promise<ContactSuggestion[]> {
  // Validate and clamp maxSuggestions
  const limit = Math.max(1, Math.min(maxSuggestions, 100));

  const existingEmails = await getExistingEmails(userId);
  const recentEvents = await getRecentRawEvents(userId);

  const suggestions = [];

  for (const event of recentEvents) {
    try {
      const parsed: ParsedEvent = await parseRawEvent(userId, event.type, event.content);

      // Process attendees
      for (const attendee of parsed.attendees) {
        if (
          attendee.email &&
          !existingEmails.includes(attendee.email) &&
          !isSystemEmail(attendee.email) &&
          attendee.displayName
        ) {
          suggestions.push(createSuggestionFromAttendee(attendee, event));
        }
      }
    } catch (error) {
      // Log error but continue processing other events
      console.error(`Failed to parse event ${event.id}:`, error);
    }
  }

  // Dedupe and process suggestions
  const deduplicatedSuggestions = deduplicateSuggestions(suggestions);

  // Process wiki for each suggestion if needed
  const processedSuggestions = await Promise.all(
    deduplicatedSuggestions.map(async (suggestion) => {
      // Add wiki processing logic here if needed
      return suggestion;
    }),
  );

  return processedSuggestions.slice(0, limit);
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

async function getRecentRawEvents(
  userId: string,
): Promise<{ id: string; type: "calendar" | "gmail"; content: string; occurredAt: Date }[]> {
  const db = await getDb();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return (await db
    .select({
      id: rawEvents.id,
      type: rawEvents.provider,
      content: rawEvents.payload,
      occurredAt: rawEvents.occurredAt,
    })
    .from(rawEvents)
    .where(and(eq(rawEvents.userId, userId), gte(rawEvents.occurredAt, sixMonthsAgo)))
    .orderBy(desc(rawEvents.occurredAt))) as {
    id: string;
    type: "calendar" | "gmail";
    content: string;
    occurredAt: Date;
  }[];
}

function createSuggestionFromAttendee(
  attendee: { email: string; displayName: string },
  event: { occurredAt: Date; title?: string | null },
): ContactSuggestion {
  // Build suggestion object
  return {
    id: generateSuggestionId(attendee.email),
    displayName: attendee.displayName,
    email: attendee.email,
    eventCount: 1,
    lastEventDate: event.occurredAt
      ? new Date(event.occurredAt).toISOString()
      : new Date().toISOString(),
    eventTitles: [typeof event.title === "string" ? event.title : "Unknown"],
    confidence: "medium",
    source: "calendar_attendee",
  };
}

// Other helpers like isSystemEmail, calculateConfidence, generateSuggestionId remain similar, can be in utils/

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

function deduplicateSuggestions(suggestions: ContactSuggestion[]): ContactSuggestion[] {
  const seen = new Set<string>();
  const deduplicated: ContactSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = suggestion.email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(suggestion);
    }
  }

  return deduplicated;
}
