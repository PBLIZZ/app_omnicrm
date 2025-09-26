import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { OnboardingTokenService } from "@/server/services/onboarding-token.service";

// Validation schema for token generation request
const GenerateTokenSchema = z.object({
  hoursValid: z.number().int().min(1).max(168).default(72), // 1 hour to 1 week
  label: z.string().min(1, "Label is required").max(100, "Label too long").optional(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "onboarding_generate_token" },
  validation: {
    body: GenerateTokenSchema,
  },
})(async ({ userId, validated }) => {
  try {
    // Generate onboarding token using service
    const tokenResponse = await OnboardingTokenService.generateOnboardingToken(
      userId,
      validated.body
    );

    return NextResponse.json(tokenResponse);
  } catch (error) {
    console.error("Generate token error:", error);

    if (error instanceof Error && error.message.includes("Failed to create onboarding token")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
