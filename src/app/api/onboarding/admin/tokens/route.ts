import { NextRequest, NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { OnboardingTokenService } from "@/server/services/onboarding-token.service";

// Get all tokens for the authenticated user
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "admin_tokens_list" },
})(async ({ userId }, req: NextRequest) => {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    // Validate pagination options using service
    const listOptions = OnboardingTokenService.validateListOptions(
      limitParam || undefined,
      offsetParam || undefined
    );

    // Fetch tokens using service
    const result = await OnboardingTokenService.listUserTokens(userId, listOptions);

    return NextResponse.json({
      tokens: result.tokens,
    });
  } catch (error) {
    console.error("Get tokens error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch tokens")) {
        return NextResponse.json(
          {
            error: "Failed to fetch tokens",
            code: "DATABASE_ERROR",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
