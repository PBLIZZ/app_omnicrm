/**
 * Cron Job for Background Inbox Processing
 *
 * This endpoint runs the background processing for queued inbox items.
 * Should be called by a cron service (like Vercel Cron) twice daily.
 */

import { NextRequest, NextResponse } from "next/server";
import { processAllUsersInboxItems } from "@/server/services/background-processing.service";
import { logger } from "@/lib/observability";

/**
 * POST /api/cron/process-inbox - Process all queued inbox items
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env["CRON_SECRET"];

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await logger.info("Starting background inbox processing", {
      operation: "cron_background_processing",
      additionalData: { timestamp: new Date().toISOString() },
    });

    const result = await processAllUsersInboxItems();

    await logger.info("Background inbox processing completed", {
      operation: "cron_background_processing",
      additionalData: {
        ...result,
        completedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Background processing completed",
      ...result,
    });
  } catch (error) {
    await logger.error("Background inbox processing failed", {
      operation: "cron_background_processing",
      additionalData: { error: error instanceof Error ? error.message : "Unknown error" },
    });

    return NextResponse.json(
      {
        success: false,
        error: "Background processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cron/process-inbox - Health check for cron job
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    message: "Background processing endpoint is ready",
    timestamp: new Date().toISOString(),
  });
}
