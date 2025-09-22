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

    // Build a proper update object without explicit undefined values
    const updateData: Parameters<typeof GoogleIntegrationService.updateSyncPreferences>[1] = {};
    const data = validation.data;

    if (data.gmailQuery !== undefined) updateData.gmailQuery = data.gmailQuery;
    if (data.gmailLabelIncludes !== undefined) updateData.gmailLabelIncludes = data.gmailLabelIncludes;
    if (data.gmailLabelExcludes !== undefined) updateData.gmailLabelExcludes = data.gmailLabelExcludes;
    if (data.gmailTimeRangeDays !== undefined) updateData.gmailTimeRangeDays = data.gmailTimeRangeDays;
    if (data.calendarIncludeOrganizerSelf !== undefined) updateData.calendarIncludeOrganizerSelf = data.calendarIncludeOrganizerSelf;
    if (data.calendarIncludePrivate !== undefined) updateData.calendarIncludePrivate = data.calendarIncludePrivate;
    if (data.calendarTimeWindowDays !== undefined) updateData.calendarTimeWindowDays = data.calendarTimeWindowDays;
    if (data.calendarIds !== undefined) updateData.calendarIds = data.calendarIds;
    if (data.calendarFutureDays !== undefined) updateData.calendarFutureDays = data.calendarFutureDays;
    if (data.driveIngestionMode !== undefined) updateData.driveIngestionMode = data.driveIngestionMode;
    if (data.driveFolderIds !== undefined) updateData.driveFolderIds = data.driveFolderIds;
    if (data.driveMaxSizeMB !== undefined) updateData.driveMaxSizeMB = data.driveMaxSizeMB;
    if (data.initialSyncCompleted !== undefined) updateData.initialSyncCompleted = data.initialSyncCompleted;
    if (data.initialSyncDate !== undefined) updateData.initialSyncDate = data.initialSyncDate;

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