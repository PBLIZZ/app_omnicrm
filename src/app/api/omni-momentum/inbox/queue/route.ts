/**
 * Inbox Queue API
 *
 * This endpoint handles the queue system for background intelligent processing.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getQueueStatsService,
  isIntelligentProcessingAvailable,
} from "@/server/services/enhanced-inbox.service";
/**
 * GET /api/omni-momentum/inbox/queue - Get queue statistics or status
 */
export async function GET(request: NextRequest) {
  try {
    const { getServerUserId } = await import("@/server/auth/user");
    const { cookies } = await import("next/headers");

    const cookieStore = await cookies();
    await getServerUserId(cookieStore);

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "stats";

    if (action === "status") {
      const isAvailable = await isIntelligentProcessingAvailable();
      return NextResponse.json({
        isAvailable,
        message: isAvailable
          ? "AI processing is available"
          : "AI processing is currently unavailable",
      });
    } else {
      const stats = await getQueueStatsService();
      return NextResponse.json({
        ...stats,
        isAvailable: await isIntelligentProcessingAvailable(),
      });
    }
  } catch (error) {
    console.error("Queue API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
