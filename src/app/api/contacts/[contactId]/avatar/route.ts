import { z } from "zod";
import { getAuthUserId } from "@/lib/auth-simple";
import { ContactsRepository } from "@repo";
import { ApiError } from "@/lib/api/errors";
/**
 * Avatar API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleFileUpload for POST
 * ✅ Manual handling for GET (binary response)
 */

const ParamsSchema = z.object({ contactId: z.string().uuid() });

/**
 * GET /api/contacts/[contactId]/avatar - Get contact avatar
 *
 * Returns the avatar image for a contact. If the contact has a photoUrl,
 * generates a signed URL from Supabase Storage and redirects to it.
 * Otherwise, returns 404 so the client shows initials fallback.
 * 
 * Note: This endpoint returns redirects, not JSON, so using Response directly is appropriate.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ contactId: string }> },
): Promise<Response> {
  try {
    const userId = await getAuthUserId();
    const params = await context.params;
    const { contactId } = ParamsSchema.parse(params);

    // Get contact from repository
    const result = await ContactsRepository.getContactById(userId, contactId);

    if (!result.success) {
      console.error("Failed to fetch contact:", result.error);
      return new Response("Contact not found", { status: 404 });
    }

    if (!result.data) {
      return new Response("Contact not found", { status: 404 });
    }

    const contact = result.data;

    // Check if contact has a photo URL
    if (!contact.photoUrl) {
      // This is normal for contacts without photos - return 404 so fallback shows
      return new Response("No photo available", { status: 404 });
    }

    // If photoUrl is already a full URL, redirect to it
    if (contact.photoUrl.startsWith("http://") || contact.photoUrl.startsWith("https://")) {
      return Response.redirect(contact.photoUrl, 302);
    }

    // For storage paths (client-photos/userId/...), generate signed URL
    // The photoUrl should be in format: client-photos/{userId}/{timestamp}-{uuid}.webp
    console.log("Generating signed URL for photoUrl:", contact.photoUrl);
    const { StorageService } = await import("@/server/services/storage.service");
    const signedUrlResult = await StorageService.getFileSignedUrl(contact.photoUrl);

    if (signedUrlResult.error || !signedUrlResult.signedUrl) {
      console.error("Failed to generate signed URL for avatar:", {
        photoUrl: contact.photoUrl,
        error: signedUrlResult.error,
      });
      return new Response("Failed to generate signed URL", { status: 500 });
    }

    // Redirect to the signed URL (valid for 1 hour)
    console.log("Redirecting to signed URL:", signedUrlResult.signedUrl);
    return Response.redirect(signedUrlResult.signedUrl, 302);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid contact ID", { status: 400 });
    }

    console.error("GET /api/contacts/[contactId]/avatar error:", error);
    return new Response("Avatar unavailable", { status: 500 });
  }
}

// Schema for POST request body
const AvatarUploadRequestSchema = z.object({
  mimeType: z.string(),
  fileSize: z.number(),
});

const AvatarUploadResponseSchema = z.object({
  success: z.boolean(),
  uploadUrl: z.string(),
  filePath: z.string(),
  message: z.string(),
});

type AvatarUploadResponse = z.infer<typeof AvatarUploadResponseSchema>;

/**
 * POST /api/contacts/[contactId]/avatar - Upload contact avatar
 *
 * Handles avatar upload with the following flow:
 * 1. Validate file type and size
 * 2. Get signed upload URL from Supabase Storage
 * 3. Client uploads file directly to storage
 * 4. Update contact record with photoUrl
 *
 * Note: This endpoint only generates the signed upload URL.
 * The actual file upload happens client-side to Supabase Storage.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ contactId: string }> },
): Promise<Response> {
  const userId = await getAuthUserId();
  const params = await context.params;
  const { contactId } = ParamsSchema.parse(params);
  
  const body = await request.json() as { mimeType?: string; fileSize?: number };
  const data = AvatarUploadRequestSchema.parse(body);
  const { mimeType, fileSize } = data;

  // Verify contact exists and belongs to user
  const contactResult = await ContactsRepository.getContactById(userId, contactId);
  if (!contactResult.success || !contactResult.data) {
    throw new ApiError("Contact not found", 404);
  }

  // Validate using photo validation utilities
  const { isValidImageType, isValidFileSize } = await import("@/lib/utils/photo-validation");

  if (!isValidImageType(mimeType)) {
    throw new ApiError("Invalid file type. Allowed: JPEG, PNG, WebP, GIF", 400);
  }

  if (!isValidFileSize(fileSize)) {
    throw new ApiError("File size exceeds 512KB limit", 400);
  }

  // Generate file path in storage: client-photos/{userId}/{timestamp}-{uuid}.webp
  const { randomUUID } = await import("crypto");
  const { getOptimizedExtension } = await import("@/lib/utils/photo-validation");

  const fileId = randomUUID();
  const timestamp = Date.now();
  const extension = getOptimizedExtension();
  const filePath = `client-photos/${userId}/${timestamp}-${fileId}.${extension}`;

  // Get signed upload URL from Supabase Storage
  const { StorageService } = await import("@/server/services/storage.service");
  const uploadResult = await StorageService.getUploadSignedUrl(
    `${timestamp}-${fileId}.${extension}`,
    mimeType,
    `client-photos/${userId}`,
    "client-photos", // bucket name
  );

  if (uploadResult.error || !uploadResult.signedUrl) {
    console.error("Failed to generate upload URL:", uploadResult.error);
    throw new ApiError("Failed to generate upload URL", 500);
  }

  // Return signed URL for client-side upload
  const result: AvatarUploadResponse = {
    success: true,
    uploadUrl: uploadResult.signedUrl,
    filePath: filePath,
    message: "Upload URL generated. Upload file then call PATCH to update contact.",
  };
  
  const validated = AvatarUploadResponseSchema.parse(result);
  // eslint-disable-next-line no-restricted-syntax -- Legitimate: validated JSON response
  return new Response(JSON.stringify(validated), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

// Schema for PATCH request body
const AvatarUpdateRequestSchema = z.object({
  filePath: z.string().min(1),
});

const AvatarUpdateResponseSchema = z.object({
  success: z.boolean(),
  photoUrl: z.string(),
  message: z.string(),
});

type AvatarUpdateResponse = z.infer<typeof AvatarUpdateResponseSchema>;

/**
 * PATCH /api/contacts/[contactId]/avatar - Update contact with uploaded avatar path
 *
 * Called after the client successfully uploads the file to storage.
 * Updates the contact's photoUrl field with the storage path.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ contactId: string }> },
): Promise<Response> {
  const userId = await getAuthUserId();
  const params = await context.params;
  const { contactId } = ParamsSchema.parse(params);
  
  const body = await request.json() as { filePath?: string };
  const data = AvatarUpdateRequestSchema.parse(body);
  const { filePath } = data;

  // Update contact with photo URL
  const updateResult = await ContactsRepository.updateContact(userId, contactId, {
    photoUrl: filePath,
  });

  if (!updateResult.success) {
    throw new ApiError("Failed to update contact", 500);
  }

  const result: AvatarUpdateResponse = {
    success: true,
    photoUrl: filePath,
    message: "Avatar updated successfully",
  };
  
  const validated = AvatarUpdateResponseSchema.parse(result);
  // eslint-disable-next-line no-restricted-syntax -- Legitimate: validated JSON response
  return new Response(JSON.stringify(validated), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
