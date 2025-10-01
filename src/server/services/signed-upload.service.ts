import { z } from "zod";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";
import {
  isValidImageType,
  isValidFileSize,
  getOptimizedExtension,
} from "@/lib/utils/photo-validation";

// Validation schema for upload request
const UploadRequestSchema = z.object({
  token: z.string().min(1, "Token is required"),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().int().min(1, "File size must be greater than 0 bytes"),
  contentType: z.string().min(1, "Content type is required"),
});

type UploadRequestData = z.infer<typeof UploadRequestSchema>;

interface TokenValidationResult {
  isValid: boolean;
  userId: string | null;
  error: string | null;
}

interface SignedUploadResult {
  uploadUrl: string;
  filePath: string;
  token: string;
}

// Environment variable validation helper
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

export class SignedUploadService {
  /**
   * Validate upload request data
   */
  static validateUploadRequest(body: unknown): UploadRequestData {
    return UploadRequestSchema.parse(body);
  }

  /**
   * Validate file type and size
   */
  static validateFileUpload(mimeType: string, fileSize: number): void {
    if (!isValidImageType(mimeType)) {
      throw new Error("Invalid image type. Supported types: JPEG, PNG, WebP, GIF");
    }

    if (!isValidFileSize(fileSize)) {
      throw new Error("File size exceeds 512KB limit");
    }
  }

  /**
   * Validate onboarding token and return user information
   */
  static async validateOnboardingToken(token: string): Promise<TokenValidationResult> {
    const supabase = createClient<Database>(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SECRET_KEY"),
    );

    const now = new Date().toISOString();

    // Check if the token exists
    const { data: tokenExists, error: existsError } = await supabase
      .from("onboarding_tokens")
      .select("user_id, disabled, expires_at, used_count, max_uses, created_at")
      .eq("token", token)
      .single();

    if (existsError || !tokenExists) {
      return {
        isValid: false,
        userId: null,
        error: "Token not found",
      };
    }

    // Check individual validation conditions
    if (tokenExists.disabled) {
      return {
        isValid: false,
        userId: null,
        error: "Token is disabled",
      };
    }

    if (tokenExists.expires_at <= now) {
      return {
        isValid: false,
        userId: null,
        error: "Token has expired",
      };
    }

    if (tokenExists.used_count >= tokenExists.max_uses) {
      return {
        isValid: false,
        userId: null,
        error: "Token usage limit exceeded",
      };
    }

    return {
      isValid: true,
      userId: tokenExists.user_id,
      error: null,
    };
  }

  /**
   * Generate file path for storage
   */
  static generateFilePath(userId: string): string {
    const fileId = randomUUID();
    const timestamp = Date.now();
    const extension = getOptimizedExtension();
    return `client-photos/${userId}/${timestamp}-${fileId}.${extension}`;
  }

  /**
   * Create signed upload URL using Supabase Storage
   */
  static async createSignedUploadUrl(filePath: string): Promise<SignedUploadResult> {
    const supabase = createClient<Database>(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SECRET_KEY"),
    );

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("client-photos")
      .createSignedUploadUrl(filePath);

    if (uploadError) {
      console.error("Storage upload URL error:", uploadError);
      throw new Error("Failed to generate upload URL");
    }

    return {
      uploadUrl: uploadData.signedUrl,
      filePath,
      token: uploadData.token,
    };
  }

  /**
   * Process signed upload request - main service method
   */
  static async processSignedUpload(uploadData: UploadRequestData): Promise<SignedUploadResult> {
    const { token, contentType, fileSize } = uploadData;

    // Validate file type and size
    this.validateFileUpload(contentType, fileSize);

    // Validate token and get user information
    const tokenValidation = await this.validateOnboardingToken(token);

    if (!tokenValidation.isValid || !tokenValidation.userId) {
      throw new Error(tokenValidation.error || "Invalid token");
    }

    // Generate file path
    const filePath = this.generateFilePath(tokenValidation.userId);

    // Create signed upload URL
    const uploadResult = await this.createSignedUploadUrl(filePath);

    return uploadResult;
  }
}
