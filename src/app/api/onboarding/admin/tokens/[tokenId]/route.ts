import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { OnboardingTokenService } from "@/server/services/onboarding-token.service";

interface RouteParams {
  params: {
    tokenId: string;
  };
}

// Delete a specific token
export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { tokenId } = params;

    // Get authenticated user ID
    const userId = await getServerUserId();

    // Delete token using service
    const result = await OnboardingTokenService.deleteUserToken(userId, tokenId);

    return NextResponse.json({
      ok: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error("Delete token error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Token ID is required")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("Token not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("Failed to delete token")) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
