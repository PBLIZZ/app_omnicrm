import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OnboardingTrackingService } from "@/server/services/onboarding-tracking.service";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = (await req.json()) as unknown;
    const trackAccessData = OnboardingTrackingService.validateTrackAccessRequest(body);

    // Extract client IP data from headers
    const clientIpData = OnboardingTrackingService.extractClientIpData({
      "x-forwarded-for": req.headers.get("x-forwarded-for"),
      "x-real-ip": req.headers.get("x-real-ip"),
      "user-agent": req.headers.get("user-agent"),
    });

    // Track access using service
    const result = await OnboardingTrackingService.trackTokenAccess(trackAccessData, clientIpData);

    return NextResponse.json({
      ok: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Track access error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request data",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
