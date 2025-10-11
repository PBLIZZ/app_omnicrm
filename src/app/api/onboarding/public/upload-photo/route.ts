// ===== src/app/api/onboarding/public/upload-photo/route.ts =====
import { processPhotoUploadService } from "@/server/services/onboarding.service";
import { PhotoUploadResponseSchema } from "@/server/db/business-schemas/onboarding";

/**
 * POST /api/onboarding/public/upload-photo
 *
 * Special case: FormData endpoint (can't use handlePublic - it expects JSON)
 * FormData: { token, file } → Sharp optimize → Upload → Return path
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const file = formData.get("file") as File;

    if (!token || !file) {
      return Response.json({ error: "Missing token or file" }, { status: 400 });
    }

    const result = await processPhotoUploadService({ token, file });
    const validated = PhotoUploadResponseSchema.parse(result);

    return Response.json(validated);
  } catch (error) {
    console.error("Photo upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
