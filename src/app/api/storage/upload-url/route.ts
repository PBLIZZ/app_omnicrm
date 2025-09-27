import { handleAuth } from "@/lib/api";
import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/db/supabase/server";
import {
  UploadUrlRequestSchema,
  UploadUrlResponseSchema,
} from "@/server/db/business-schemas";

export const POST = handleAuth(
  UploadUrlRequestSchema,
  UploadUrlResponseSchema,
  async (data, userId) => {
    const { fileName, folderPath, bucket } = data;

    const path = folderPath ? `${folderPath.replace(/^\/+|\/+$/g, "")}/${fileName}` : fileName;

    const client = supabaseServerAdmin ?? supabaseServerPublishable;
    if (!client) {
      throw new Error("Supabase server client not available");
    }

    const { data: uploadData, error } = await client.storage.from(bucket).createSignedUploadUrl(path);

    if (error) {
      throw new Error("Failed to create signed upload URL");
    }

    return {
      signedUrl: uploadData?.signedUrl ?? null,
      path
    };
  }
);
