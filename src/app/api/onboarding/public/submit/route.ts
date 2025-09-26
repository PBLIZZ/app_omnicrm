import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OnboardingService } from "@/server/services/onboarding.service";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientId = forwardedFor || realIp || "unknown";

    const { success } = await OnboardingService.checkRateLimit(clientId);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Extract client IP and user agent for consent tracking
    const clientIpData = OnboardingService.extractClientIpData({
      "x-forwarded-for": forwardedFor,
      "x-real-ip": realIp,
      "user-agent": req.headers.get("user-agent"),
    });

    // Parse and validate request
    const body = (await req.json()) as unknown;

    // Debug: Log the received data
    console.log("Received onboarding submission:", JSON.stringify(body, null, 2));

    const submissionData = OnboardingService.validateSubmission(body);

    // Process the onboarding submission using service
    const result = await OnboardingService.processOnboardingSubmission(submissionData, clientIpData);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Submit onboarding error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid form data",
          details: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      // Handle known service errors
      if (error.message.includes("Invalid or expired token")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes("Invalid")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("Failed to complete onboarding")) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
