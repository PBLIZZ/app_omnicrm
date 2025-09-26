/**
 * GET/PUT /api/google/prefs — Google sync preferences management
 *
 * Manages user preferences for Google Gmail and Calendar sync operations.
 * Replaces the deprecated /api/settings/sync/prefs endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleIntegrationService } from "@/server/services/google-integration.service";
import { UserSyncPrefsUpdateSchema } from "@/lib/validation/schemas";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const prefs = await GoogleIntegrationService.getSyncPreferences(userId);
    return NextResponse.json(prefs);
  } catch (error) {
    console.error("GET /api/google/prefs error:", error);
    return NextResponse.json({
      error: "Failed to get Google sync preferences"
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const validation = UserSyncPrefsUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: validation.error.issues
      }, { status: 400 });
    }

    // Use service to build clean update object and process the update
    const updateData = GoogleIntegrationService.buildCleanUpdateObject(validation.data);
    await GoogleIntegrationService.updateSyncPreferences(userId, updateData);
    return NextResponse.json({});
  } catch (error: unknown) {
    console.error("PUT /api/google/prefs error:", error);
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
}