/**
 * Storage Service
 *
 * Handles all Supabase storage operations including signed URL generation
 * for file downloads and uploads. Centralizes storage bucket interactions
 * and provides consistent error handling.
 */

import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/db/supabase/server";

export interface SignedUrlResult {
  signedUrl: string | null;
  error?: string;
}

export interface UploadUrlResult {
  signedUrl: string | null;
  path: string;
  error?: string;
}

export class StorageService {
  /**
   * Get signed URL for downloading a file from storage
   */
  static async getFileSignedUrl(filePath: string): Promise<SignedUrlResult> {
    try {
      // If already an absolute URL (e.g., public or already signed), just echo it back
      if (/^https?:\/\//i.test(filePath)) {
        return { signedUrl: filePath };
      }

      // Expected format: bucket/path/to/file.ext
      const normalized = filePath.replace(/^\/+/, "");
      const [bucket, ...rest] = normalized.split("/");
      const pathInBucket = rest.join("/");

      if (!bucket || !pathInBucket) {
        return {
          signedUrl: null,
          error: "filePath must be of the form 'bucket/path/to/file'",
        };
      }

      const client = supabaseServerAdmin ?? supabaseServerPublishable;
      if (!client) {
        return {
          signedUrl: null,
          error: "Supabase client unavailable on server",
        };
      }

      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(pathInBucket, 3600);

      if (error) {
        return {
          signedUrl: null,
          error: "failed_to_create_signed_url",
        };
      }

      return { signedUrl: data?.signedUrl ?? null };
    } catch (error) {
      console.error("Error creating signed URL:", error);
      return {
        signedUrl: null,
        error: "unexpected_error",
      };
    }
  }

  /**
   * Get signed URL for uploading a file to storage
   */
  static async getUploadSignedUrl(
    fileName: string,
    contentType: string,
    folderPath?: string,
    bucket = "contacts"
  ): Promise<UploadUrlResult> {
    try {
      const path = folderPath ? `${folderPath.replace(/^\/+|\/+$/g, "")}/${fileName}` : fileName;

      const client = supabaseServerAdmin ?? supabaseServerPublishable;
      if (!client) {
        return {
          signedUrl: null,
          path,
          error: "Supabase server client not available",
        };
      }

      const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);

      if (error) {
        return {
          signedUrl: null,
          path,
          error: "Failed to create signed upload URL",
        };
      }

      return {
        signedUrl: data?.signedUrl ?? null,
        path,
      };
    } catch (error: unknown) {
      console.error("Error creating signed upload URL:", error);
      return {
        signedUrl: null,
        path: folderPath ? `${folderPath.replace(/^\/+|\/+$/g, "")}/${fileName}` : fileName,
        error: "unexpected_error",
      };
    }
  }
}