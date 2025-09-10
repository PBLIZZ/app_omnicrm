import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { listContactsService } from "@/server/services/contacts.service";
import { ContactIntelligenceService } from "@/server/services/contact-intelligence.service";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * OmniClients AI Enrichment API
 *
 * POST: Enrich all clients with AI-generated insights, wellness stages, and tags
 * Supports both standard and streaming responses
 */

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_enrich" },
})(async ({ userId, requestId }, request) => {
  if (!userId) {
    const api = new ApiResponseBuilder("omni_clients_enrich", requestId);
    return api.error("Authentication required", "UNAUTHORIZED");
  }
  const api = new ApiResponseBuilder("omni_clients_enrich", requestId);

  try {
    const url = new URL(request.url);
    const isStreaming = url.searchParams.get("stream") === "true";

    if (isStreaming) {
      // Return streaming response for real-time progress
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Get all contacts for the user
            const { items: contactsList } = await listContactsService(userId, {
              page: 1,
              pageSize: 1000, // Get all contacts
              sort: "displayName",
              order: "asc",
            });

            const totalContacts = contactsList.length;
            let enrichedCount = 0;
            const errors: string[] = [];

            // Send start event
            const startData = JSON.stringify({
              type: "start",
              total: totalContacts,
              message: "Starting AI enrichment...",
            });
            controller.enqueue(encoder.encode(`data: ${startData}\n\n`));

            const db = await getDb();

            // Process each contact
            for (const contact of contactsList) {
              try {
                // Send progress event
                const progressData = JSON.stringify({
                  type: "progress",
                  contactId: contact.id,
                  contactName: contact.displayName,
                  enrichedCount,
                  total: totalContacts,
                });
                controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));

                // Skip if contact has no email (can't analyze calendar events without email)
                if (!contact.primaryEmail) {
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
                const enrichedData = JSON.stringify({
                  type: "enriched",
                  contactId: contact.id,
                  contactName: contact.displayName,
                  stage: insights.stage,
                  tags: insights.tags,
                  confidenceScore: insights.confidenceScore,
                  enrichedCount,
                  total: totalContacts,
                });
                controller.enqueue(encoder.encode(`data: ${enrichedData}\n\n`));

                // Small delay to avoid overwhelming the AI service
                await new Promise((resolve) => setTimeout(resolve, 200));
              } catch (error) {
                const errorMessage = `Failed to enrich ${contact.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
                errors.push(errorMessage);

                // Send error event
                const errorData = JSON.stringify({
                  type: "error",
                  contactId: contact.id,
                  contactName: contact.displayName,
                  error: errorMessage,
                });
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              }
            }

            // Send complete event
            const completeData = JSON.stringify({
              type: "complete",
              enrichedCount,
              totalContacts,
              errors,
              message: `Successfully enriched ${enrichedCount} of ${totalContacts} contacts with AI insights`,
            });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.close();
          } catch (error) {
            // Send error and close stream
            const errorData = JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Unknown error occurred",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Return standard response - not implemented for non-streaming
      return api.success({
        message: "Use streaming mode (?stream=true) for AI enrichment",
        enrichedCount: 0,
        errors: [],
      });
    }
  } catch (error) {
    return api.error(
      "Failed to enrich omni clients",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
