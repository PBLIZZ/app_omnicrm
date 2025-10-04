/**
 * Contacts AI Service
 *
 * AI-powered contact operations:
 * - AI insights and analysis
 * - Contact enrichment with AI
 * - Bulk enrichment operations
 */

import { generateContactInsights } from "@/server/ai/contacts/generate-contact-insights";
import {
  askAIAboutContact,
  type ContactAIInsightResponse,
} from "@/server/ai/contacts/ask-ai-about-contact";
import { ContactsRepository } from "@repo";
import { listContactsService, type ContactWithLastNote } from "@/server/services/contacts.service";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { AppError } from "@/lib/errors/app-error";

// ============================================================================
// TYPES
// ============================================================================

const validStages = [
  "Prospect",
  "New Client",
  "Core Client",
  "Referring Client",
  "VIP Client",
  "Lost Client",
  "At Risk Client",
] as const;

type ValidStage = (typeof validStages)[number];

export interface EnrichmentOptions {
  batchSize?: number;
  delayMs?: number;
}

export interface EnrichmentResult {
  enrichedCount: number;
  totalRequested: number;
  message: string;
  errors?: string[];
}

export interface EnrichmentProgress {
  current?: number;
  total?: number;
  percentage?: number;
  message: string;
  type?: string;
  contactId?: string;
  contactName?: string;
  error?: string;
  lifecycleStage?: string;
  tags?: string[];
  confidenceScore?: number;
  enrichedCount?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function isValidStage(value: string): value is ValidStage {
  return validStages.includes(value as ValidStage);
}

function validateLifecycleStage(lifecycleStage: string): ValidStage {
  return isValidStage(lifecycleStage) ? lifecycleStage : "Prospect";
}

// ============================================================================
// AI INSIGHTS
// ============================================================================

/**
 * Ask AI about a specific contact
 * Returns insights or error state (never throws to caller)
 */
export async function askAIAboutContactService(
  userId: string,
  contactId: string,
): Promise<ContactAIInsightResponse> {
  // Validate parameters
  if (!userId?.trim()) {
    throw new AppError("userId must be a non-empty string", "INVALID_INPUT", "validation", false);
  }

  if (!contactId?.trim()) {
    throw new AppError(
      "contactId must be a non-empty string",
      "INVALID_INPUT",
      "validation",
      false,
    );
  }

  try {
    return await askAIAboutContact(userId, contactId);
  } catch (error) {
    await logger.error(
      "Failed to ask AI about contact",
      {
        operation: "ask_ai_about_contact",
        additionalData: { userId, contactId },
      },
      error instanceof Error ? error : new Error(String(error)),
    );

    // Return error state instead of throwing (AI is optional feature)
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

// ============================================================================
// CONTACT ENRICHMENT
// ============================================================================

/**
 * Enrich all contacts with AI insights
 */
export async function enrichAllContacts(
  userId: string,
  options: EnrichmentOptions = {},
): Promise<EnrichmentResult> {
  const { batchSize = 1000, delayMs = 200 } = options;

  // Get all contacts (service throws on error)
  let allContacts: ContactWithLastNote[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await listContactsService(userId, {
      page,
      pageSize: batchSize,
      sort: "displayName",
      order: "asc",
    });

    allContacts = allContacts.concat(result.items);
    hasMore = result.items.length === batchSize;
    page++;
  }

  const totalContacts = allContacts.length;

  if (totalContacts === 0) {
    return {
      enrichedCount: 0,
      totalRequested: 0,
      message: "No contacts found to enrich",
    };
  }

  let enrichedCount = 0;
  const errors: string[] = [];
  const db = await getDb();

  // Process each contact
  for (const contact of allContacts) {
    try {
      // Skip if no email
      if (!contact.primaryEmail) {
        errors.push(`${contact.displayName}: No email address to analyze`);
        continue;
      }

      // Generate AI insights
      const insights = await generateContactInsights(userId, contact.primaryEmail, {
        forceRefresh: true,
      });

      // Update contact
      await db
        .update(contacts)
        .set({
          lifecycleStage: validateLifecycleStage(insights.lifecycleStage),
          tags: insights.tags || [],
          confidenceScore: insights.confidenceScore?.toString() || null,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contact.id));

      enrichedCount++;

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      const errorMessage = `${contact.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
      errors.push(errorMessage);

      await logger.error(
        "Failed to enrich individual contact",
        {
          operation: "contact_enrichment",
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            contactId: contact.id,
            contactName: contact.displayName,
          },
        },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  await logger.info("Contact enrichment completed", {
    operation: "contact_enrichment_all",
    additionalData: {
      userId: userId.slice(0, 8) + "...",
      totalContacts,
      enrichedCount,
      errorCount: errors.length,
    },
  });

  return {
    enrichedCount,
    totalRequested: totalContacts,
    errors: errors.length > 0 ? errors : undefined,
    message: `Successfully enriched ${enrichedCount} of ${totalContacts} contacts with AI insights`,
  };
}

/**
 * Enrich all contacts with streaming progress updates
 */
export async function* enrichAllContactsStreaming(
  userId: string,
  options: EnrichmentOptions = {},
): AsyncGenerator<EnrichmentProgress, void, unknown> {
  try {
    const { batchSize = 1000, delayMs = 200 } = options;

    // Get all contacts (service throws on error)
    let allContacts: ContactWithLastNote[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await listContactsService(userId, {
        page,
        pageSize: batchSize,
        sort: "displayName",
        order: "asc",
      });

      allContacts = allContacts.concat(result.items);
      hasMore = result.items.length === batchSize;
      page++;
    }

    const totalContacts = allContacts.length;
    let enrichedCount = 0;

    yield {
      type: "start",
      total: totalContacts,
      message: "Starting AI enrichment...",
    };

    if (totalContacts === 0) {
      yield {
        type: "complete",
        enrichedCount: 0,
        total: 0,
        message: "No contacts found to enrich",
      };
      return;
    }

    const db = await getDb();

    for (const contact of allContacts) {
      try {
        yield {
          type: "progress",
          contactId: contact.id,
          contactName: contact.displayName,
          enrichedCount,
          message: "Enriching contact...",
          total: totalContacts,
        };

        if (!contact.primaryEmail) {
          const errorMsg = `${contact.displayName}: No email address to analyze`;
          yield {
            type: "error",
            contactId: contact.id,
            contactName: contact.displayName,
            error: errorMsg,
            message: errorMsg,
          };
          continue;
        }

        const insights = await generateContactInsights(userId, contact.primaryEmail, {
          forceRefresh: true,
        });

        await db
          .update(contacts)
          .set({
            lifecycleStage: validateLifecycleStage(insights.lifecycleStage),
            tags: insights.tags || [],
            confidenceScore: insights.confidenceScore?.toString() || null,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, contact.id));

        enrichedCount++;

        yield {
          type: "enriched",
          contactId: contact.id,
          contactName: contact.displayName,
          lifecycleStage: insights.lifecycleStage,
          tags: insights.tags,
          confidenceScore: insights.confidenceScore,
          enrichedCount,
          message: "Contact enriched successfully",
          total: totalContacts,
        };

        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        const errorMessage = `Failed to enrich ${contact.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;

        yield {
          type: "error",
          contactId: contact.id,
          contactName: contact.displayName,
          error: errorMessage,
          message: errorMessage,
        };

        await logger.error(
          "Failed to enrich individual contact",
          {
            operation: "contact_enrichment_streaming",
            additionalData: {
              userId: userId.slice(0, 8) + "...",
              contactId: contact.id,
              contactName: contact.displayName,
            },
          },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    yield {
      type: "complete",
      enrichedCount,
      total: totalContacts,
      message: `Successfully enriched ${enrichedCount} of ${totalContacts} contacts with AI insights`,
    };
  } catch (error) {
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };

    await logger.error(
      "Streaming contact enrichment failed",
      {
        operation: "contact_enrichment_streaming",
        additionalData: { userId: userId.slice(0, 8) + "..." },
      },
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Enrich specific contacts by IDs
 */
export async function enrichContactsByIds(
  userId: string,
  contactIds: string[],
  options: EnrichmentOptions = {},
): Promise<EnrichmentResult> {
  const { delayMs = 200 } = options;

  // Get contacts from repo (unwrap or throw)
  const result = await ContactsRepository.getContactsByIds(userId, contactIds);

  if (!result.success) {
    throw new AppError(result.error.message, result.error.code, "database", false);
  }

  const contactsToEnrich = result.data;

  if (contactsToEnrich.length === 0) {
    return {
      enrichedCount: 0,
      totalRequested: contactIds.length,
      message: "No contacts found to enrich",
    };
  }

  let enrichedCount = 0;
  const errors: string[] = [];

  for (const contact of contactsToEnrich) {
    try {
      if (!contact.primaryEmail) {
        errors.push(`${contact.displayName}: No email address to analyze`);
        continue;
      }

      const insights = await generateContactInsights(userId, contact.primaryEmail, {
        forceRefresh: true,
      });

      // Update via repo
      const updateResult = await ContactsRepository.updateContact(userId, contact.id, {
        lifecycleStage: validateLifecycleStage(insights.lifecycleStage),
        tags: insights.tags,
        confidenceScore: insights.confidenceScore?.toString(),
      });

      if (!updateResult.success) {
        throw new AppError(updateResult.error.message, updateResult.error.code, "database", false);
      }

      enrichedCount++;

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      const errorMsg = `${contact.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
      errors.push(errorMsg);

      await logger.error(
        "Failed to enrich individual contact",
        {
          operation: "contact_enrichment_bulk",
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            contactId: contact.id,
            contactName: contact.displayName,
          },
        },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  await logger.info("Bulk contact enrichment completed", {
    operation: "contact_enrichment_bulk",
    additionalData: {
      userId: userId.slice(0, 8) + "...",
      requestedCount: contactIds.length,
      enrichedCount,
      errorCount: errors.length,
    },
  });

  return {
    enrichedCount,
    totalRequested: contactIds.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `Successfully enriched ${enrichedCount} of ${contactIds.length} contact${contactIds.length === 1 ? "" : "s"} with AI insights`,
  };
}

/**
 * Check if contact needs enrichment
 */
export async function contactNeedsEnrichment(userId: string, contactId: string): Promise<boolean> {
  try {
    const result = await ContactsRepository.getContactById(userId, contactId);

    if (!result.success || !result.data) {
      return false;
    }

    const contact = result.data;
    return !contact.lifecycleStage || !contact.tags || !contact.confidenceScore;
  } catch (error) {
    await logger.warn("Failed to check if contact needs enrichment", {
      operation: "contact_enrichment_check",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        contactId,
      },
    });
    return false;
  }
}

/**
 * Get enrichment statistics
 */
export async function getEnrichmentStats(userId: string): Promise<{
  totalContacts: number;
  enrichedContacts: number;
  needsEnrichment: number;
  enrichmentPercentage: number;
}> {
  try {
    const result = await listContactsService(userId, {
      page: 1,
      pageSize: 10000,
      sort: "displayName",
      order: "asc",
    });

    const allContacts = result.items;
    const totalContacts = allContacts.length;
    const enrichedContacts = allContacts.filter(
      (contact) =>
        contact.lifecycleStage &&
        contact.tags &&
        Array.isArray(contact.tags) &&
        contact.confidenceScore,
    ).length;
    const needsEnrichment = totalContacts - enrichedContacts;
    const enrichmentPercentage =
      totalContacts > 0 ? Math.round((enrichedContacts / totalContacts) * 100) : 0;

    return {
      totalContacts,
      enrichedContacts,
      needsEnrichment,
      enrichmentPercentage,
    };
  } catch (error) {
    await logger.error(
      "Failed to get enrichment stats",
      {
        operation: "contact_enrichment_stats",
        additionalData: { userId: userId.slice(0, 8) + "..." },
      },
      error instanceof Error ? error : new Error(String(error)),
    );

    return {
      totalContacts: 0,
      enrichedContacts: 0,
      needsEnrichment: 0,
      enrichmentPercentage: 0,
    };
  }
}
