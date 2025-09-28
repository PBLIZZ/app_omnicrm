import { z } from "zod";
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
    const avatarDataResult = await AvatarService.getContactAvatarData(clientId, userId);

    if (!avatarDataResult) {
      return new Response("Client not found", { status: 404 });
    }

    // Generate avatar result
    const result = await AvatarService.generateAvatar(avatarDataResult, clientId);

    if (result && typeof result === 'object' && 'type' in result && result.type === "redirect") {
      return Response.redirect(result.content as string, 302);
    }

    const content = result && typeof result === 'object' && 'content' in result ? result.content as string : 'Avatar unavailable';
    const headers = result && typeof result === 'object' && 'headers' in result ? result.headers as Record<string, string> : {};

    return new Response(content, {
      status: 200,
      headers: headers || {},
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
  request: Request,
  { params }: RouteParams
): Promise<Response> {
  const handler = handleFileUpload(
    AvatarUploadResponseSchema,
    async (formData, userId) => {
      const file = formData.get('avatar');

      if (!file || !(file instanceof File)) {
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
