import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { generateUniqueSlug } from "@/server/utils/generate-unique-slug";
import { logger } from "@/lib/observability";

/**
 * Generate Slugs API
 *
 * POST: Generate slugs for all clients that don't have them yet
 * This is a one-time migration endpoint to populate slugs for existing clients
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_generate_slugs" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("omni_clients_generate_slugs", requestId);

  try {
    const db = await getDb();

    // Find all clients without slugs
    const clientsWithoutSlugs = await db
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), isNull(contacts.slug)));

    if (clientsWithoutSlugs.length === 0) {
      return api.success({
        message: "All clients already have slugs",
        generated: 0,
        errors: [],
      });
    }

    let generatedCount = 0;
    const errors: string[] = [];

    await logger.info("Starting slug generation for clients", {
      operation: "omni_clients_generate_slugs",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        clientCount: clientsWithoutSlugs.length,
      },
    });

    // Generate slugs for each client
    for (const client of clientsWithoutSlugs) {
      try {
        const slug = await generateUniqueSlug(client.displayName, userId, client.id);

        await db
          .update(contacts)
          .set({
            slug,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, client.id));

        generatedCount++;
      } catch (error) {
        const errorMsg = `${client.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMsg);

        await logger.error(
          "Failed to generate slug for client",
          {
            operation: "omni_clients_generate_slugs",
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

    await logger.info("Completed slug generation", {
      operation: "omni_clients_generate_slugs",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        totalClients: clientsWithoutSlugs.length,
        generatedCount,
        errorCount: errors.length,
      },
    });

    return api.success({
      message: `Generated ${generatedCount} slugs successfully`,
      generated: generatedCount,
      total: clientsWithoutSlugs.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    await logger.error(
      "Failed to generate client slugs",
      {
        operation: "omni_clients_generate_slugs",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );

    return api.error(
      "Failed to generate slugs",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});
