import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { AvatarService } from "@/server/services/avatar.service";

const ParamsSchema = z.object({ clientId: z.string().uuid() });

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ clientId: string }> },
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const params = await context.params;
    const { clientId } = ParamsSchema.parse(params);

    // Get contact avatar data
    const avatarData = await AvatarService.getContactAvatarData(clientId, userId);

    if (!avatarData) {
      return new NextResponse("Client not found", { status: 404 });
    }

    // Generate avatar result
    const result = await AvatarService.generateAvatar(avatarData, clientId);

    if (result.type === "redirect") {
      return NextResponse.redirect(result.content, { status: 302 });
    }

    return new NextResponse(result.content, {
      status: 200,
      headers: result.headers || {},
    });
  } catch (error) {
    console.error("GET /api/omni-clients/[clientId]/avatar error:", error);
    return new NextResponse("Avatar unavailable", { status: 500 });
  }
}
