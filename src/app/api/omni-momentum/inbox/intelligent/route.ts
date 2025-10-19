/**
 * Intelligent Inbox Processing API
 *
 * This endpoint handles intelligent AI processing of inbox items with:
 * - Bulk task splitting
 * - Zone categorization
 * - Project assignment
 * - Hierarchy detection
 * - Background processing queue
 */

import { NextRequest, NextResponse } from "next/server";
import {
  intelligentQuickCaptureService,
  IntelligentQuickCaptureSchema,
} from "@/server/services/enhanced-inbox.service";
import { z } from "zod";

/**
 * POST /api/omni-momentum/inbox/intelligent - Queue for intelligent processing
 */
export async function POST(request: NextRequest) {
  try {
    const { getServerUserId } = await import("@/server/auth/user");
    const { cookies } = await import("next/headers");

    const cookieStore = await cookies();
    const userId = await getServerUserId(cookieStore);

    const body = await request.json();
    const validatedData = IntelligentQuickCaptureSchema.parse(body);

    const result = await intelligentQuickCaptureService(userId, validatedData);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Intelligent inbox processing error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
