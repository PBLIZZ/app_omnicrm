import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { BulkDeleteBodySchema } from "@/lib/validation/schemas/omniClients";
import { ClientEnrichmentService } from "@/server/services/client-enrichment.service";

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
  try {
    const { ids } = validated.body;

    const result = await ClientEnrichmentService.enrichClientsByIds(userId, ids);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      error: "Failed to enrich clients"
    }, { status: 500 });
  }
});
