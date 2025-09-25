// New file for processing email intelligence

import { getDb } from "@/server/db/client";
import { rawEvents } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { categorizeEmail } from "@/server/ai/connect/categorize-email";
import { extractWisdom } from "@/server/ai/connect/extract-wisdom";
import { matchToContacts } from "@/server/ai/connect/match-to-contacts";
import { EmailIntelligence } from "@/server/ai/types/connect-types";

interface GmailPayload {
  subject?: string;
  bodyText?: string;
  snippet?: string;
  from?: { email?: string; name?: string };
  to?: Array<{ email?: string }>;
}

export async function processEmailIntelligence(
  userId: string,
  rawEventId: string,
): Promise<EmailIntelligence> {
  const db = await getDb();

  const rawEvent = await db
    .select()
    .from(rawEvents)
    .where(and(eq(rawEvents.id, rawEventId), eq(rawEvents.userId, userId)))
    .limit(1);

  if (rawEvent.length === 0) {
    throw new Error(`Raw event not found: ${rawEventId}`);
  }

  const event = rawEvent[0];

  if (!event) {
    throw new Error(`Raw event is null or undefined: ${rawEventId}`);
  }

  const payload = event.payload as GmailPayload;

  const emailData = {
    subject: payload.subject ?? "",
    bodyText: payload.bodyText ?? payload.snippet ?? "",
    senderEmail: payload.from?.email ?? "",
    senderName: payload.from?.name ?? "",
    recipientEmails:
      payload.to?.map((t: { email?: string }) => t.email ?? "").filter((email: string) => email) ??
      [],
    occurredAt: event.occurredAt,
  };

  await logger.info("Starting email intelligence processing", {
    operation: "llm_call",
    additionalData: {
      op: "email_intelligence.processing_start",
      userId,
      rawEventId,
      senderEmail: emailData.senderEmail,
    },
  });

  const [classification, contactMatch] = await Promise.all([
    categorizeEmail(userId, emailData),
    matchToContacts(userId, emailData),
  ]);

  const wisdom = await extractWisdom(userId, { ...emailData, classification });

  const intelligence: EmailIntelligence = {
    classification,
    wisdom,
    contactMatch,
    processingMeta: {
      model: "gpt-4o",
      processedAt: new Date(),
      inputTokens: 0,
      outputTokens: 0,
    },
  };

  await logger.info("Email intelligence processing completed", {
    operation: "llm_call",
    additionalData: {
      op: "email_intelligence.processing_complete",
      userId,
      rawEventId,
      category: classification.primaryCategory,
      businessRelevance: classification.businessRelevance,
      contactMatched: Boolean(contactMatch.contactId),
    },
  });

  return intelligence;
}
