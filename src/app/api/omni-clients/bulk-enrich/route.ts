import { and, eq, inArray } from "drizzle-orm";
import { createRouteHandler } from "@/server/api/handler";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { ApiResponseBuilder } from "@/server/api/response";
import { BulkDeleteBodySchema } from "@/lib/validation/schemas/omniClients";
import { ContactIntelligenceService } from "@/server/services/contact-intelligence.service";
import { logger } from "@/lib/observability";

/**
 * OmniClients Bulk Enrich API
 *
 * POST: Enrich multiple clients with AI-generated insights, wellness stages, and tags
 * Uses existing contacts table with UI terminology transformation
 */

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_bulk_enrich" },
  validation: { body: BulkDeleteBodySchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("omni_clients_bulk_enrich", requestId);

  try {
    const dbo = await getDb();
    const { ids } = validated.body;

    // Get contacts to enrich with their emails
    const clientsToEnrich = await dbo
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), inArray(contacts.id, ids)));

    if (clientsToEnrich.length === 0) {
      return api.success({
        enrichedCount: 0,
        message: "No clients found to enrich",
      });
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

        // Update the client with AI insights
        await dbo
          .update(contacts)
          .set({
            stage: insights.stage,
            tags: insights.tags ? JSON.stringify(insights.tags) : null,
            confidenceScore: insights.confidenceScore?.toString(),
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, client.id));

        enrichedCount++;
      } catch (error) {
        const errorMsg = `${client.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMsg);

        await logger.error(
          "Failed to enrich individual OmniClient",
          {
            operation: "omni_clients_bulk_enrich",
            additionalData: {
              userId: userId.slice(0, 8) + "...",
              clientId: client.id,
              clientName: client.displayName,
              errorType: error instanceof Error ? error.constructor.name : typeof error,
            },
          },
          error instanceof Error ? error : undefined,
        );
      }
    }

    await logger.info("Bulk enriched OmniClients", {
      operation: "omni_clients_bulk_enrich",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        requestedCount: ids.length,
        enrichedCount,
        errorCount: errors.length,
      },
    });

    return api.success({
      enrichedCount,
      totalRequested: ids.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully enriched ${enrichedCount} of ${ids.length} client${ids.length === 1 ? "" : "s"} with AI insights`,
    });
  } catch (error) {
    await logger.error(
      "Failed to bulk enrich OmniClients",
      {
        operation: "omni_clients_bulk_enrich",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          requestedIds: validated.body?.ids?.length ?? 0,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );

    return api.error(
      "Failed to enrich clients",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});
