import { z } from "zod";
import { getContactAvatarData, generateAvatar } from "@/server/services/contacts.service";
import { AvatarUploadResponseSchema } from "@/server/db/business-schemas/contacts";
import { handleFileUpload } from "@/lib/api-edge-cases";

/**
 * Avatar API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleFileUpload for POST
 * ✅ Manual handling for GET (binary response)
 */

const ParamsSchema = z.object({ contactId: z.string().uuid() });

interface RouteParams {
  params: {
    contactId: string;
  };
}

/**
 * GET /api/contacts/[contactId]/avatar - Get contact avatar
 */
export async function GET(
  _request: Request,
  context: { params: { contactId: string } },
): Promise<Response> {
  try {
    // Manually handle auth and params for this special case (binary response)
    const { getServerUserId } = await import("@/server/auth/user");
    const userId = await getServerUserId();
    const { contactId } = ParamsSchema.parse(context.params);

    // Get contact avatar data
    const avatarData = await getContactAvatarData(contactId, userId);

    if (!avatarData) {
      return new Response("Contact not found", { status: 404 });
    }

    // Generate avatar result
    const result = await generateAvatar(avatarData, contactId);

    if (result.type === "redirect") {
      return Response.redirect(result.content, 302);
    }

    return new Response(result.content, {
      status: 200,
      headers: result.headers || {},
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid contact ID", { status: 400 });
    }

    console.error("GET /api/contacts/[contactId]/avatar error:", error);
    return new Response("Avatar unavailable", { status: 500 });
  }
}

/**
 * POST /api/contacts/[contactId]/avatar - Upload contact avatar
 */
export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  const handler = handleFileUpload(
    AvatarUploadResponseSchema,
    async (formData, _userId): Promise<{ success: boolean; url: string; message: string }> => {
      const file = formData.get("avatar");

      if (!file || !(file instanceof File)) {
        throw new Error("No avatar file provided");
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
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
        url: `https://placeholder.com/avatar/${params.contactId}`,
        message: "Avatar upload functionality coming soon",
      };
    },
  );

  return handler(request);
}
