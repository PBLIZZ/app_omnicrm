/**
 * Storage Service
 *
 * Handles all Supabase storage operations including signed URL generation
 * for file downloads and uploads. Centralizes storage bucket interactions
 * and provides consistent error handling.
 *
 * Features:
 * - Single file signed URL generation
 * - Batch signed URL generation (optimized for table views)
 * - Photo access audit logging (HIPAA/GDPR compliance)
 */

import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/db/supabase/server";
import { getDb } from "@/server/db/client";
import { photoAccessAudit } from "@/server/db/schema";

export interface SignedUrlResult {
  signedUrl: string | null;
  error?: string;
}

export interface UploadUrlResult {
  signedUrl: string | null;
  path: string;
  error?: string;
}

export interface BatchSignedUrlResult {
  urls: Record<string, string | null>;
  errors?: Record<string, string>;
}

export interface PhotoAccessAuditParams {
  userId: string;
  contactId: string;
  photoPath: string;
  ipAddress?: string;
  userAgent?: string;
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

      console.log("[StorageService] Creating signed URL:", {
        originalPath: filePath,
        normalized,
        bucket,
        pathInBucket,
        hasAdmin: !!supabaseServerAdmin,
        hasPublishable: !!supabaseServerPublishable,
      });

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

      console.log("[StorageService] Using client:", supabaseServerAdmin ? "ADMIN" : "PUBLISHABLE");

      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(pathInBucket, 3600);

      if (error) {
        console.error("[StorageService] Supabase Storage API error:", {
          errorObject: error,
          errorName: error.name,
          errorMessage: error.message,
          errorStatus: error.status,
          errorStatusCode: error.statusCode,
          bucket,
          pathInBucket,
          fullError: JSON.stringify(error, null, 2),
        });
        return {
          signedUrl: null,
          error: `failed_to_create_signed_url: ${error.message || error.name || "unknown"}`,
        };
      }

      console.log("[StorageService] Successfully created signed URL");
      return { signedUrl: data?.signedUrl ?? null };
    } catch (error) {
      console.error("[StorageService] Unexpected error creating signed URL:", error);
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
    _contentType: string,
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

  /**
   * Batch generate signed URLs for multiple files
   * Optimized for table views where multiple photos need URLs at once
   *
   * @param filePaths - Array of file paths in format "bucket/path/to/file.ext"
   * @param expiresIn - Expiration time in seconds (default: 14400 = 4 hours)
   * @returns Map of filePath -> signedUrl
   */
  static async getBatchSignedUrls(
    filePaths: string[],
    expiresIn = 14400
  ): Promise<BatchSignedUrlResult> {
    const urls: Record<string, string | null> = {};
    const errors: Record<string, string> = {};

    if (filePaths.length === 0) {
      return { urls, errors };
    }

    try {
      const client = supabaseServerAdmin ?? supabaseServerPublishable;
      if (!client) {
        filePaths.forEach(path => {
          urls[path] = null;
          errors[path] = "Supabase client unavailable";
        });
        return { urls, errors };
      }

      // Group paths by bucket for efficient batch processing
      const pathsByBucket = new Map<string, { original: string; inBucket: string }[]>();

      for (const filePath of filePaths) {
        // Skip already absolute URLs
        if (/^https?:\/\//i.test(filePath)) {
          urls[filePath] = filePath;
          continue;
        }

        const normalized = filePath.replace(/^\/+/, "");
        const [bucket, ...rest] = normalized.split("/");
        const pathInBucket = rest.join("/");

        if (!bucket || !pathInBucket) {
          urls[filePath] = null;
          errors[filePath] = "Invalid path format";
          continue;
        }

        if (!pathsByBucket.has(bucket)) {
          pathsByBucket.set(bucket, []);
        }
        pathsByBucket.get(bucket)?.push({ original: filePath, inBucket: pathInBucket });
      }

      // Process each bucket
      for (const [bucket, paths] of pathsByBucket) {
        try {
          // Supabase supports batch signed URL creation
          const { data, error } = await client.storage
            .from(bucket)
            .createSignedUrls(
              paths.map(p => p.inBucket),
              expiresIn
            );

          if (error) {
            paths.forEach(({ original }) => {
              urls[original] = null;
              errors[original] = error.message || "Failed to create signed URL";
            });
            continue;
          }

          if (data) {
            data.forEach((result, index) => {
              const original = paths[index]?.original;
              if (original) {
                if (result.error) {
                  urls[original] = null;
                  errors[original] = result.error;
                } else {
                  urls[original] = result.signedUrl;
                }
              }
            });
          }
        } catch (bucketError) {
          paths.forEach(({ original }) => {
            urls[original] = null;
            errors[original] = "Unexpected error processing bucket";
          });
          console.error(`[StorageService] Error processing bucket ${bucket}:`, bucketError);
        }
      }

      return { urls, errors: Object.keys(errors).length > 0 ? errors : undefined };
    } catch (error) {
      console.error("[StorageService] Unexpected error in batch signed URLs:", error);
      filePaths.forEach(path => {
        urls[path] = null;
        errors[path] = "Unexpected error";
      });
      return { urls, errors };
    }
  }

  /**
   * Log photo access for HIPAA/GDPR compliance
   * Called whenever a client photo URL is generated or accessed
   */
  static async logPhotoAccess(params: PhotoAccessAuditParams): Promise<void> {
    try {
      const db = await getDb();
      await db.insert(photoAccessAudit).values({
        id: crypto.randomUUID(),
        userId: params.userId,
        contactId: params.contactId,
        photoPath: params.photoPath,
        accessedAt: new Date(),
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      });
    } catch (error) {
      // Best-effort logging; don't fail the request if audit fails
      console.error("[StorageService] Failed to log photo access:", error);
    }
  }

  /**
   * Batch log photo access for multiple contacts
   * Used when generating batch signed URLs for table views
   */
  static async logBatchPhotoAccess(
    userId: string,
    contactPhotos: Array<{ contactId: string; photoPath: string }>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const db = await getDb();
      const auditRecords = contactPhotos.map(({ contactId, photoPath }) => ({
        id: crypto.randomUUID(),
        userId,
        contactId,
        photoPath,
        accessedAt: new Date(),
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      }));

      await db.insert(photoAccessAudit).values(auditRecords);
    } catch (error) {
      // Best-effort logging; don't fail the request if audit fails
      console.error("[StorageService] Failed to batch log photo access:", error);
    }
  }
}