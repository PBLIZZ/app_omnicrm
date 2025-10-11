/**
 * Contacts AI Service
 *
 * Consolidates all AI-powered contact operations including:
 * - AI insights and analysis (contact-ai-actions.service.ts)
 * - Contact enrichment with AI (contact-enrichment.service.ts)
 *
 * This replaces 2 separate AI service files with a single, focused service.
 */

import { generateContactInsights } from "@/server/ai/contacts/generate-contact-insights";
import {
  askAIAboutContact,
  type ContactAIInsightResponse,
} from "@/server/ai/contacts/ask-ai-about-contact";
import { ContactsRepository } from "@repo";
import { listContactsService } from "@/server/services/contacts.service";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { isErr } from "@/lib/utils/result";
import { ErrorHandler } from "@/lib/errors/app-error";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EnrichmentOptions {
  streaming?: boolean;
  batchSize?: number;
  delayMs?: number;
}

export interface EnrichmentResult {
  enrichedCount: number;
  totalRequested: number;
  errors?: string[];
  message: string;
}

export interface EnrichmentProgress {
  type: "start" | "progress" | "enriched" | "error" | "complete";
  contactId?: string;
  contactName?: string;
  lifecycleStage?: string;
  tags?: string[];
  confidenceScore?: number;
  enrichedCount?: number;
  total?: number;
  error?: string;
  message?: string;
}

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateLifecycleStage(lifecycleStage: string): ValidStage {
  return validStages.includes(lifecycleStage as ValidStage)
    ? (lifecycleStage as ValidStage)
    : "Prospect";
}

// ============================================================================
// AI INSIGHTS OPERATIONS
// ============================================================================

/**
 * Ask AI about a specific contact
 */
export async function askAIAboutContactService(
  userId: string,
  contactId: string,
): Promise<ContactAIInsightResponse> {
  // Validate parameters
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("userId must be a non-empty string");
  }

  if (!contactId || typeof contactId !== "string" || contactId.trim().length === 0) {
    throw new Error("contactId must be a non-empty string");
  }

  try {
    return await askAIAboutContact(userId, contactId);
  } catch (error) {
    logger.error(
      "Failed to ask AI about contact",
      {
        operation: "ask_ai_about_contact",
        additionalData: { userId, contactId },
      },
      error instanceof Error ? error : new Error(String(error)),
    );

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
// CONTACT ENRICHMENT OPERATIONS
// ============================================================================

/**
 * Enrich all contacts for a user with AI insights
 */
export async function enrichAllContacts(
  userId: string,
  options: EnrichmentOptions = {},
): Promise<EnrichmentResult> {
  const { batchSize = 1000, delayMs = 200 } = options;

  // Get all contacts for the user by iterating through all pages
  let allContacts: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await listContactsService(userId, {
      page,
      pageSize: batchSize,
      sort: "displayName",
      order: "asc",
    });

    if (result.success) {
      allContacts = allContacts.concat(result.data.items);
      // Calculate hasMore based on items length vs pageSize
      hasMore = result.data.items.length === batchSize;
    } else {
      hasMore = false;
    }
    page++;
  }

  const totalContacts = allContacts.length;
  let enrichedCount = 0;
  const errors: string[] = [];

  if (totalContacts === 0) {
    return {
      enrichedCount: 0,
      totalRequested: 0,
      message: "No contacts found to enrich",
    };
  }

  const db = await getDb();

  // Process each contact
  for (const contact of allContacts) {
    try {
      // Skip if contact has no email (can't analyze calendar events without email)
      if (!contact.primaryEmail) {
        errors.push(`${contact.displayName}: No email address to analyze`);
        continue;
      }

      // Generate AI insights using the contact intelligence service
      const insights = await generateContactInsights(userId, contact.primaryEmail, {
        forceRefresh: true,
      });

      // Update the contact in the database with the insights
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

      // Add delay to avoid overwhelming the AI service
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
            error: error instanceof Error ? error.message : String(error),
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
    errors: errors.length > 0 ? errors : [],
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

    // Get all contacts for the user by iterating through all pages
    let allContacts: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await listContactsService(userId, {
        page,
        pageSize: batchSize,
        sort: "displayName",
        order: "asc",
      });

      if (result.success) {
        allContacts = allContacts.concat(result.data.items);
        // Calculate hasMore based on items length vs pageSize
        hasMore = result.data.items.length === batchSize;
      } else {
        hasMore = false;
      }
      page++;
    }

    const totalContacts = allContacts.length;
    let enrichedCount = 0;
    const errors: string[] = [];

    // Send start event
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

    // Process each contact
    for (const contact of allContacts) {
      try {
        // Send progress event
        yield {
          type: "progress",
          contactId: contact.id,
          contactName: contact.displayName,
          enrichedCount,
          total: totalContacts,
        };

        // Skip if contact has no email (can't analyze calendar events without email)
        if (!contact.primaryEmail) {
          const errorMsg = `${contact.displayName}: No email address to analyze`;
          errors.push(errorMsg);
          yield {
            type: "error",
            contactId: contact.id,
            contactName: contact.displayName,
            error: errorMsg,
          };
          continue;
        }

        // Generate AI insights using the contact intelligence service
        const insights = await generateContactInsights(userId, contact.primaryEmail, {
          forceRefresh: true,
        });

        // Update the contact in the database with the insights
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

        // Send enriched event
        yield {
          type: "enriched",
          contactId: contact.id,
          contactName: contact.displayName,
          lifecycleStage: insights.lifecycleStage,
          tags: insights.tags,
          confidenceScore: insights.confidenceScore,
          enrichedCount,
          total: totalContacts,
        };

        // Add delay to avoid overwhelming the AI service
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        const errorMessage = `Failed to enrich ${contact.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMessage);

        // Send error event
        yield {
          type: "error",
          contactId: contact.id,
          contactName: contact.displayName,
          error: errorMessage,
        };

        await logger.error(
          "Failed to enrich individual contact",
          {
            operation: "contact_enrichment_streaming",
            additionalData: {
              userId: userId.slice(0, 8) + "...",
              contactId: contact.id,
              contactName: contact.displayName,
              error: error instanceof Error ? error.message : String(error),
            },
          },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    // Send complete event
    yield {
      type: "complete",
      enrichedCount,
      total: totalContacts,
      message: `Successfully enriched ${enrichedCount} of ${totalContacts} contacts with AI insights`,
    };

    await logger.info("Streaming contact enrichment completed", {
      operation: "contact_enrichment_streaming",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        totalContacts,
        enrichedCount,
        errorCount: errors.length,
      },
    });
  } catch (error) {
    // Send error and close stream
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };

    await logger.error(
      "Streaming contact enrichment failed",
      {
        operation: "contact_enrichment_streaming",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
      },
      ErrorHandler.fromError(error),
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

  // Get contacts to enrich with their emails using repository
  const contactsToEnrichResult = await ContactsRepository.getContactsByIds(userId, contactIds);

  if (isErr(contactsToEnrichResult)) {
    throw new Error(`Failed to get contacts: ${contactsToEnrichResult.error.message}`);
  }

  const contactsToEnrich = (contactsToEnrichResult as { success: true; data: any[] }).data;

  if (contactsToEnrich.length === 0) {
    return {
      enrichedCount: 0,
      totalRequested: contactIds.length,
      message: "No contacts found to enrich",
    };
  }

  let enrichedCount = 0;
  const errors: string[] = [];

  // Process each contact
  for (const contact of contactsToEnrich) {
    try {
      // Skip clients without email addresses (can't analyze without email for calendar events)
      if (!contact.primaryEmail) {
        errors.push(`${contact.displayName}: No email address to analyze`);
        continue;
      }

      // Generate AI insights for this contact
      const insights = await generateContactInsights(userId, contact.primaryEmail, {
        forceRefresh: true,
      });

      // Update the contact with AI insights using repository
      await ContactsRepository.updateContact(userId, contact.id, {
        lifecycleStage: validateLifecycleStage(insights.lifecycleStage),
        tags: insights.tags,
        confidenceScore: insights.confidenceScore?.toString(),
      });

      enrichedCount++;

      // Add delay to avoid overwhelming the AI service
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
            error: error instanceof Error ? error.message : String(error),
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
    errors: errors.length > 0 ? errors : [],
    message: `Successfully enriched ${enrichedCount} of ${contactIds.length} contact${contactIds.length === 1 ? "" : "s"} with AI insights`,
  };
}

/**
 * Check if a contact needs enrichment (missing stage, tags, or confidence score)
 */
export async function contactNeedsEnrichment(userId: string, contactId: string): Promise<boolean> {
  try {
    const contactResult = await ContactsRepository.getContactById(userId, contactId);

    if (isErr(contactResult)) {
      return false;
    }

    const contact = (contactResult as { success: true; data: any }).data;
    if (!contact) return false;

    // Contact needs enrichment if it's missing key AI-generated fields
    return !contact.lifecycleStage || !contact.tags || !contact.confidenceScore;
  } catch (error) {
    await logger.warn("Failed to check if contact needs enrichment", {
      operation: "contact_enrichment_check",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        contactId: contactId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return false;
  }
}

/**
 * Get enrichment statistics for a user
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
      pageSize: 10000, // Get all contacts for stats
      sort: "displayName",
      order: "asc",
    });

    if (!result.success) {
      return {
        totalContacts: 0,
        enrichedContacts: 0,
        needsEnrichment: 0,
        enrichmentPercentage: 0,
      };
    }

    const allContacts = result.data.items;

    const totalContacts = allContacts.length;
    const enrichedContacts = allContacts.filter(
      (contact: any) =>
        contact &&
        contact.lifecycleStage != null &&
        contact.tags != null &&
        Array.isArray(contact.tags) &&
        contact.confidenceScore != null,
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
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
      },
      ErrorHandler.fromError(error),
    );

    return {
      totalContacts: 0,
      enrichedContacts: 0,
      needsEnrichment: 0,
      enrichmentPercentage: 0,
    };
  }
}
