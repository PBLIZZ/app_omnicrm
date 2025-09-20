import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { ContactSlugService } from "@/server/services/contact-slug.service";
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

  try {
    const result = await ContactSlugService.generateMissingSlugs(userId);
    return NextResponse.json(result);
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

    return NextResponse.json({ error: "Failed to generate slugs" }, { status: 500 });
  }
});
