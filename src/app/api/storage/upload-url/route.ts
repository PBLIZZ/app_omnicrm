import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { apiError } from "@/server/api/response";
import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/db/supabase/server";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";

const uploadUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  folderPath: z.string().optional(),
  bucket: z.string().default("contacts"),
});

// POST /api/storage/upload-url
// Body: { fileName: string; contentType: string; folderPath?: string; bucket?: string }
// Returns: { signedUrl: string | null; path: string; error?: string; details?: string }
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "storage_upload_url" },
  validation: {
    body: uploadUrlSchema,
  },
})(async ({ validated, requestId }) => {

  try {
    const { fileName, folderPath, bucket } = validated.body;

    const path = folderPath ? `${folderPath.replace(/^\/+|\/+$/g, "")}/${fileName}` : fileName;

    const client = supabaseServerAdmin ?? supabaseServerPublishable;
    if (!client) {
      return NextResponse.json({ error: "Supabase server client not available" }, { status: 500 });
    }

    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);

    if (error) {
      return NextResponse.json({ error: "Failed to create signed upload URL" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data?.signedUrl ?? null, path });
  } catch (error: unknown) {
    return apiError(
      "Unexpected error creating upload URL",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
