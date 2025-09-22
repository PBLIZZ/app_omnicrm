import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { BulkDeleteBodySchema } from "@/lib/validation/schemas/omniClients";
import { ClientEnrichmentService } from "@/server/services/client-enrichment.service";

/**
 * OmniClients Bulk Enrich API
 *
 * POST: Enrich multiple clients with AI-generated insights, wellness stages, and tags
 * Uses existing contacts table with UI terminology transformation
 */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const validation = BulkDeleteBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: validation.error.issues
      }, { status: 400 });
    }

    const { ids } = validation.data;
    const result = await ClientEnrichmentService.enrichClientsByIds(userId, ids);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/omni-clients/bulk-enrich error:", error);
    return NextResponse.json({ error: "Failed to enrich clients" }, { status: 500 });
  }
}
