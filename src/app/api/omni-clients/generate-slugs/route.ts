import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { ContactSlugService } from "@/server/services/contact-slug.service";
import { logger } from "@/lib/observability";

/**
 * Generate Slugs API
 *
 * POST: Generate slugs for all clients that don't have them yet
 * This is a one-time migration endpoint to populate slugs for existing clients
 */
export async function POST(): Promise<NextResponse> {
  let userId: string | undefined;
  try {
    userId = await getServerUserId();
    const result = await ContactSlugService.generateMissingSlugs(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/omni-clients/generate-slugs error:", error);
    await logger.error(
      "Failed to generate client slugs",
      {
        operation: "omni_clients_generate_slugs",
        additionalData: {
          userId: userId ? userId.slice(0, 8) + "..." : "unknown",
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );

    return NextResponse.json({ error: "Failed to generate slugs" }, { status: 500 });
  }
}
