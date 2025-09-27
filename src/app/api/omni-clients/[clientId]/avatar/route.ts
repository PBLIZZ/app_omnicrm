import { z } from "zod";
import { NextRequest } from "next/server";
import { AvatarService } from "@/server/services/avatar.service";
import { AvatarUploadResponseSchema } from "@/server/db/business-schemas/contacts";
import { handleFileUpload } from "@/lib/api-edge-cases";

/**
 * Avatar API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleFileUpload for POST
 * ✅ Manual handling for GET (binary response)
 */

const ParamsSchema = z.object({ clientId: z.string().uuid() });

interface RouteParams {
  params: {
    clientId: string;
  };
}

/**
 * GET /api/omni-clients/[clientId]/avatar - Get client avatar
 */
export async function GET(
  _request: Request,
  context: { params: { clientId: string } },
): Promise<Response> {
  try {
    // Manually handle auth and params for this special case (binary response)
    const { getServerUserId } = await import("@/server/auth/user");
    const userId = await getServerUserId();
    const { clientId } = ParamsSchema.parse(context.params);

    // Get contact avatar data
    const avatarData = await AvatarService.getContactAvatarData(clientId, userId);

    if (!avatarData) {
      return new Response("Client not found", { status: 404 });
    }

    // Generate avatar result
    const result = await AvatarService.generateAvatar(avatarData, clientId);

    if (result.type === "redirect") {
      return Response.redirect(result.content, 302);
    }

    return new Response(result.content, {
      status: 200,
      headers: result.headers || {},
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid client ID", { status: 400 });
    }

    console.error("GET /api/omni-clients/[clientId]/avatar error:", error);
    return new Response("Avatar unavailable", { status: 500 });
  }
}

/**
 * POST /api/omni-clients/[clientId]/avatar - Upload client avatar
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const handler = handleFileUpload(
    AvatarUploadResponseSchema,
    async (formData, userId) => {
      const file = formData.get('avatar') as File;

      if (!file) {
        throw new Error("No avatar file provided");
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Allowed types: JPEG, PNG, GIF, WebP");
      }

      // Validate file size (5MB max)
      const maxFileSize = 5 * 1024 * 1024;
      if (file.size > maxFileSize) {
        throw new Error("File too large. Maximum size: 5MB");
      }

      // TODO: Implement avatar upload logic in AvatarService
      // For now, return a placeholder response
      return {
        success: true,
        url: `https://placeholder.com/avatar/${params.clientId}`,
        message: "Avatar upload functionality coming soon"
      };
    }
  );

  return handler(request);
}
