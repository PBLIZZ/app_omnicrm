/**
 * GET/PUT /api/google/prefs — Google sync preferences management
 *
 * Manages user preferences for Google Gmail and Calendar sync operations.
 * Replaces the deprecated /api/settings/sync/prefs endpoint.
 */
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { GoogleIntegrationService } from "@/server/services/google-integration.service";
import { UserSyncPrefsUpdateSchema } from "@/lib/validation/schemas";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_prefs_get" },
})(async ({ userId, requestId }) => {
  try {
    const prefs = await GoogleIntegrationService.getSyncPreferences(userId);
    return NextResponse.json(prefs);
  } catch (error: unknown) {
    return NextResponse.json({
      error: "Failed to get Google sync preferences"
    }, { status: 500 });
  }
});

export const PUT = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_prefs_update" },
  validation: {
    body: UserSyncPrefsUpdateSchema,
  },
})(async ({ userId, validated, requestId }) => {
  try {
    await GoogleIntegrationService.updateSyncPreferences(userId, validated.body);
    return NextResponse.json({});
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Check for validation errors from the service
    if (errorMessage.includes("cannot be changed after initial sync")) {
      return NextResponse.json({
        error: errorMessage
      }, { status: 400 });
    }

    return NextResponse.json({
      error: "Failed to update Google sync preferences"
    }, { status: 500 });
  }
});