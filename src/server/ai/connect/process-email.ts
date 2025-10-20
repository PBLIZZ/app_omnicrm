// New file for processing email intelligence

import { logger } from "@/lib/observability";
import { categorizeEmail } from "@/server/ai/connect/categorize-email";
import { extractWisdom } from "@/server/ai/connect/extract-wisdom";
import { matchToContacts } from "@/server/ai/connect/match-to-contacts";
import type { EmailIntelligence } from "@/server/ai/types/connect-types";
import { getRawEventByIdService } from "@/server/services/raw-events.service";

interface GmailPayload {
  subject: string;
  from: {
    email: string;
    name?: string;
  };
  to: Array<{
    email: string;
  }>;
  // At least one of bodyText or snippet must be present
  bodyText?: string;
  snippet?: string;
}

export async function processEmailIntelligence(
  userId: string,
  rawEventId: string,
): Promise<EmailIntelligence> {
  try {
    const event = await getRawEventByIdService(userId, rawEventId);

    const payload = event.payload as GmailPayload;

    // Validate that at least one of bodyText or snippet is present
    if (!payload.bodyText && !payload.snippet) {
      throw new Error("Gmail payload must contain either bodyText or snippet");
    }

    const emailData = {
      subject: payload.subject,
      bodyText: payload.bodyText ?? payload.snippet ?? "",
      senderEmail: payload.from.email,
      senderName: payload.from.name ?? "",
      recipientEmails: payload.to.map((t) => t.email).filter((email) => email),
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

    const classificationResult = await categorizeEmail(userId, emailData);
    const contactMatchResult = await matchToContacts(userId, emailData);
    const wisdomResult = await extractWisdom(userId, { ...emailData, classification: classificationResult });

    const extractedMetadata: EmailIntelligence["classification"]["extractedMetadata"] = {};
    const metadata = classificationResult.extractedMetadata ?? {};
    if (typeof metadata.senderDomain === "string") {
      extractedMetadata.senderDomain = metadata.senderDomain;
    }
    if (typeof metadata.hasAppointmentLanguage === "boolean") {
      extractedMetadata.hasAppointmentLanguage = metadata.hasAppointmentLanguage;
    }
    if (typeof metadata.hasPaymentLanguage === "boolean") {
      extractedMetadata.hasPaymentLanguage = metadata.hasPaymentLanguage;
    }
    if (typeof metadata.isFromClient === "boolean") {
      extractedMetadata.isFromClient = metadata.isFromClient;
    }
    if (typeof metadata.urgencyLevel === "string" && metadata.urgencyLevel) {
      extractedMetadata.urgencyLevel = metadata.urgencyLevel as
        EmailIntelligence["classification"]["extractedMetadata"]["urgencyLevel"];
    }

    const classification: EmailIntelligence["classification"] = {
      primaryCategory: classificationResult.primaryCategory,
      subCategory: classificationResult.subCategory,
      confidence: classificationResult.confidence,
      businessRelevance: classificationResult.businessRelevance,
      reasoning: classificationResult.reasoning,
      extractedMetadata,
    };

    const contactMatch: EmailIntelligence["contactMatch"] = {};
    if (contactMatchResult.contactId) {
      contactMatch.contactId = contactMatchResult.contactId;
    }
    if (typeof contactMatchResult.confidence === "number") {
      contactMatch.confidence = contactMatchResult.confidence;
    }
    if (Array.isArray(contactMatchResult.matchingFactors) && contactMatchResult.matchingFactors.length > 0) {
      contactMatch.matchingFactors = contactMatchResult.matchingFactors;
    }

    const wisdom: EmailIntelligence["wisdom"] = {
      insights: wisdomResult.keyInsights,
      recommendations: wisdomResult.actionableItems,
      followUpActions: wisdomResult.businessOpportunities,
    };

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
  } catch (error) {
    await logger.error("Failed to process email intelligence", {
      operation: "process_email_intelligence",
      additionalData: {
        userId,
        rawEventId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
