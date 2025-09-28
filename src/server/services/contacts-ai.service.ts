/**
 * Contacts AI Service
 *
 * Consolidates all AI-powered contact operations including:
 * - AI insights and analysis (contact-ai-actions.service.ts)
 * - Client enrichment with AI (client-enrichment.service.ts)
 *
 * This replaces 2 separate AI service files with a single, focused service.
 */

import { generateContactInsights } from "@/server/ai/clients/generate-contact-insights";
import {
  askAIAboutContact,
  type ContactAIInsightResponse,
} from "@/server/ai/clients/ask-ai-about-contact";
import { ContactsRepository } from "@repo";
import { listContactsService } from "@/server/services/contacts.service";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { isErr } from "@/lib/utils/result";

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
// CLIENT ENRICHMENT OPERATIONS
// ============================================================================

/**
 * Enrich all clients for a user with AI insights
 */
export async function enrichAllClients(
  userId: string,
  options: EnrichmentOptions = {},
): Promise<EnrichmentResult> {
  const { batchSize = 1000, delayMs = 200 } = options;

  // Get all contacts for the user
  const { items: contactsList } = await listContactsService(userId, {
    page: 1,
    pageSize: batchSize,
    sort: "displayName",
    order: "asc",
  });

  const totalContacts = contactsList.length;
  let enrichedCount = 0;
  const errors: string[] = [];

  if (totalContacts === 0) {
    return {
      enrichedCount: 0,
      totalRequested: 0,
      message: "No clients found to enrich",
    };
  }

  const db = await getDb();

  // Process each contact
  for (const contact of contactsList) {
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
          tags: JSON.stringify(insights.tags),
          confidenceScore: insights.confidenceScore.toString(),
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
        "Failed to enrich individual client",
        {
          operation: "client_enrichment",
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            contactId: contact.id,
            contactName: contact.displayName,
            error: error instanceof Error ? error.message : String(error),
          },
        },
        ensureError(error),
      );
    }
  }

  await logger.info("Client enrichment completed", {
    operation: "client_enrichment_all",
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
 * Enrich all clients with streaming progress updates
 */
export async function* enrichAllClientsStreaming(
  userId: string,
  options: EnrichmentOptions = {},
): AsyncGenerator<EnrichmentProgress, void, unknown> {
  try {
    const { batchSize = 1000, delayMs = 200 } = options;

    // Get all contacts for the user
    const { items: contactsList } = await listContactsService(userId, {
      page: 1,
      pageSize: batchSize,
      sort: "displayName",
      order: "asc",
    });

    const totalContacts = contactsList.length;
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
        message: "No clients found to enrich",
      };
      return;
    }

    const db = await getDb();

    // Process each contact
    for (const contact of contactsList) {
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
            tags: JSON.stringify(insights.tags),
            confidenceScore: insights.confidenceScore.toString(),
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
          "Failed to enrich individual client",
          {
            operation: "client_enrichment_streaming",
            additionalData: {
              userId: userId.slice(0, 8) + "...",
              contactId: contact.id,
              contactName: contact.displayName,
              error: error instanceof Error ? error.message : String(error),
            },
          },
          ensureError(error),
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

    await logger.info("Streaming client enrichment completed", {
      operation: "client_enrichment_streaming",
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
      "Streaming client enrichment failed",
      {
        operation: "client_enrichment_streaming",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
      },
      ensureError(error),
    );
  }
}

/**
 * Enrich specific clients by IDs
 */
export async function enrichClientsByIds(
  userId: string,
  clientIds: string[],
  options: EnrichmentOptions = {},
): Promise<EnrichmentResult> {
  const { delayMs = 200 } = options;

  // Get contacts to enrich with their emails using repository
  const clientsToEnrichResult = await ContactsRepository.getContactsByIds(userId, clientIds);

  if (isErr(clientsToEnrichResult)) {
    throw new Error(`Failed to get clients: ${clientsToEnrichResult.error.message}`);
  }

  const clientsToEnrich = (clientsToEnrichResult as { success: true; data: any[] }).data;

  if (clientsToEnrich.length === 0) {
    return {
      enrichedCount: 0,
      totalRequested: clientIds.length,
      message: "No clients found to enrich",
    };
  }

  let enrichedCount = 0;
  const errors: string[] = [];

  // Process each client
  for (const client of clientsToEnrich) {
    try {
      // Skip clients without email addresses (can't analyze without email for calendar events)
      if (!client.primaryEmail) {
        errors.push(`${client.displayName}: No email address to analyze`);
        continue;
      }

      // Generate AI insights for this client
      const insights = await generateContactInsights(userId, client.primaryEmail, {
        forceRefresh: true,
      });

      // Update the client with AI insights using repository
      await ContactsRepository.updateContact(userId, client.id, {
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
      const errorMsg = `${client.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
      errors.push(errorMsg);

      await logger.error(
        "Failed to enrich individual client",
        {
          operation: "client_enrichment_bulk",
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            clientId: client.id,
            clientName: client.displayName,
            error: error instanceof Error ? error.message : String(error),
          },
        },
        ensureError(error),
      );
    }
  }

  await logger.info("Bulk client enrichment completed", {
    operation: "client_enrichment_bulk",
    additionalData: {
      userId: userId.slice(0, 8) + "...",
      requestedCount: clientIds.length,
      enrichedCount,
      errorCount: errors.length,
    },
  });

  return {
    enrichedCount,
    totalRequested: clientIds.length,
    errors: errors.length > 0 ? errors : [],
    message: `Successfully enriched ${enrichedCount} of ${clientIds.length} client${clientIds.length === 1 ? "" : "s"} with AI insights`,
  };
}

/**
 * Check if a client needs enrichment (missing stage, tags, or confidence score)
 */
export async function clientNeedsEnrichment(userId: string, clientId: string): Promise<boolean> {
  try {
    const clientResult = await ContactsRepository.getContactById(userId, clientId);

    if (isErr(clientResult)) {
      return false;
    }

    const client = (clientResult as { success: true; data: any }).data;
    if (!client) return false;

    // Client needs enrichment if it's missing key AI-generated fields
    return !client.lifecycleStage || !client.tags || !client.confidenceScore;
  } catch (error) {
    await logger.warn("Failed to check if client needs enrichment", {
      operation: "client_enrichment_check",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        clientId,
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
  totalClients: number;
  enrichedClients: number;
  needsEnrichment: number;
  enrichmentPercentage: number;
}> {
  try {
    const { items: allClients } = await listContactsService(userId, {
      page: 1,
      pageSize: 10000, // Get all clients for stats
      sort: "displayName",
      order: "asc",
    });

    const totalClients = allClients.length;
    const enrichedClients = allClients.filter(
      (client) =>
        client &&
        client.lifecycleStage != null &&
        client.tags != null &&
        Array.isArray(client.tags) &&
        client.confidenceScore != null,
    ).length;
    const needsEnrichment = totalClients - enrichedClients;
    const enrichmentPercentage =
      totalClients > 0 ? Math.round((enrichedClients / totalClients) * 100) : 0;

    return {
      totalClients,
      enrichedClients,
      needsEnrichment,
      enrichmentPercentage,
    };
  } catch (error) {
    await logger.error(
      "Failed to get enrichment stats",
      {
        operation: "client_enrichment_stats",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
      },
      ensureError(error),
    );

    return {
      totalClients: 0,
      enrichedClients: 0,
      needsEnrichment: 0,
      enrichmentPercentage: 0,
    };
  }
}
