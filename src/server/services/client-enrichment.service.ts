/**
 * Client Enrichment Service
 *
 * Consolidates all client enrichment business logic for API routes:
 * - /api/omni-clients/enrich
 * - /api/omni-clients/bulk-enrich
 *
 * Provides methods for individual and bulk client enrichment with AI insights,
 * wellness stages, and tags. Supports both streaming and non-streaming operations.
 */

import { ContactIntelligenceService } from "@/server/services/contact-intelligence.service";
import { ContactsRepository } from "@repo";
import { listContactsService } from "@/server/services/contacts.service";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

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
  type: 'start' | 'progress' | 'enriched' | 'error' | 'complete';
  contactId?: string;
  contactName?: string;
  stage?: string;
  tags?: string[];
  confidenceScore?: number;
  enrichedCount?: number;
  total?: number;
  error?: string;
  message?: string;
}

export class ClientEnrichmentService {
  private static readonly DEFAULT_BATCH_SIZE = 10;
  private static readonly DEFAULT_DELAY_MS = 200;

  /**
   * Enrich all clients for a user with AI insights
   */
  static async enrichAllClients(
    userId: string,
    options: EnrichmentOptions = {}
  ): Promise<EnrichmentResult> {
    const { batchSize = 1000, delayMs = this.DEFAULT_DELAY_MS } = options;

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
        const insights = await ContactIntelligenceService.generateContactInsights(
          userId,
          contact.primaryEmail,
        );

        // Update the contact in the database with the insights
        await db
          .update(contacts)
          .set({
            stage: insights.stage,
            tags: JSON.stringify(insights.tags),
            confidenceScore: insights.confidenceScore.toString(),
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, contact.id));

        // Create an AI note if there's meaningful content
        if (insights.noteContent && insights.noteContent.length > 50) {
          await ContactIntelligenceService.createAINote(
            contact.id,
            userId,
            insights.noteContent,
          );
        }

        enrichedCount++;

        // Add delay to avoid overwhelming the AI service
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        const errorMessage = `${contact.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMessage);

        await logger.error("Failed to enrich individual client", {
          operation: "client_enrichment",
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            contactId: contact.id,
            contactName: contact.displayName,
            error: error instanceof Error ? error.message : String(error),
          },
        }, ensureError(error));
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
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully enriched ${enrichedCount} of ${totalContacts} contacts with AI insights`,
    };
  }

  /**
   * Enrich all clients with streaming progress updates
   */
  static async *enrichAllClientsStreaming(
    userId: string,
    options: EnrichmentOptions = {}
  ): AsyncGenerator<EnrichmentProgress, void, unknown> {
    try {
      const { batchSize = 1000, delayMs = this.DEFAULT_DELAY_MS } = options;

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
          const insights = await ContactIntelligenceService.generateContactInsights(
            userId,
            contact.primaryEmail,
          );

          // Update the contact in the database with the insights
          await db
            .update(contacts)
            .set({
              stage: insights.stage,
              tags: JSON.stringify(insights.tags),
              confidenceScore: insights.confidenceScore.toString(),
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, contact.id));

          // Create an AI note if there's meaningful content
          if (insights.noteContent && insights.noteContent.length > 50) {
            await ContactIntelligenceService.createAINote(
              contact.id,
              userId,
              insights.noteContent,
            );
          }

          enrichedCount++;

          // Send enriched event
          yield {
            type: "enriched",
            contactId: contact.id,
            contactName: contact.displayName,
            stage: insights.stage,
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

          await logger.error("Failed to enrich individual client", {
            operation: "client_enrichment_streaming",
            additionalData: {
              userId: userId.slice(0, 8) + "...",
              contactId: contact.id,
              contactName: contact.displayName,
              error: error instanceof Error ? error.message : String(error),
            },
          }, ensureError(error));
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

      await logger.error("Streaming client enrichment failed", {
        operation: "client_enrichment_streaming",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
      }, ensureError(error));
    }
  }

  /**
   * Enrich specific clients by IDs
   */
  static async enrichClientsByIds(
    userId: string,
    clientIds: string[],
    options: EnrichmentOptions = {}
  ): Promise<EnrichmentResult> {
    const { delayMs = this.DEFAULT_DELAY_MS } = options;

    // Get contacts to enrich with their emails using repository
    const clientsToEnrich = await ContactsRepository.getContactsByIds(userId, clientIds);

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
        const insights = await ContactIntelligenceService.generateContactInsights(
          userId,
          client.primaryEmail,
        );

        // Update the client with AI insights using repository
        await ContactsRepository.updateContact(userId, client.id, {
          stage: insights.stage,
          tags: insights.tags,
          confidenceScore: insights.confidenceScore?.toString(),
        });

        // Create an AI note if there's meaningful content
        if (insights.noteContent && insights.noteContent.length > 50) {
          await ContactIntelligenceService.createAINote(
            client.id,
            userId,
            insights.noteContent,
          );
        }

        enrichedCount++;

        // Add delay to avoid overwhelming the AI service
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        const errorMsg = `${client.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMsg);

        await logger.error("Failed to enrich individual client", {
          operation: "client_enrichment_bulk",
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            clientId: client.id,
            clientName: client.displayName,
            error: error instanceof Error ? error.message : String(error),
          },
        }, ensureError(error));
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
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully enriched ${enrichedCount} of ${clientIds.length} client${clientIds.length === 1 ? "" : "s"} with AI insights`,
    };
  }

  /**
   * Check if a client needs enrichment (missing stage, tags, or confidence score)
   */
  static async clientNeedsEnrichment(userId: string, clientId: string): Promise<boolean> {
    try {
      const client = await ContactsRepository.getContactById(userId, clientId);
      if (!client) return false;

      // Client needs enrichment if it's missing key AI-generated fields
      return !client.stage || !client.tags || !client.confidenceScore;
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
  static async getEnrichmentStats(userId: string): Promise<{
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
        client => client.stage && client.tags && client.confidenceScore
      ).length;
      const needsEnrichment = totalClients - enrichedClients;
      const enrichmentPercentage = totalClients > 0 ? Math.round((enrichedClients / totalClients) * 100) : 0;

      return {
        totalClients,
        enrichedClients,
        needsEnrichment,
        enrichmentPercentage,
      };
    } catch (error) {
      await logger.error("Failed to get enrichment stats", {
        operation: "client_enrichment_stats",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          error: error instanceof Error ? error.message : String(error),
        },
      }, ensureError(error));

      return {
        totalClients: 0,
        enrichedClients: 0,
        needsEnrichment: 0,
        enrichmentPercentage: 0,
      };
    }
  }
}