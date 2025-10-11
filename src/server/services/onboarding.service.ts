// ===== src/server/services/onboarding.service.ts =====
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { optimizePhoto, validatePhotoFile } from "@/lib/utils/photo-optimization";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";
import { randomUUID } from "crypto";
import {
  GenerateTokenRequestSchema,
  GenerateTokenResponseSchema,
  OnboardingSubmitRequestSchema,
  OnboardingSubmitResponseSchema,
} from "@/server/db/business-schemas/onboarding";
import { createOnboardingRepository, type ClientData, type ConsentData } from "@repo";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";
import z from "zod";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
});

export interface ClientIpData {
  ip: string;
  userAgent: string;
}

const MAX_FILE_SIZE = 512 * 1024;

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new AppError(`Missing env: ${key}`, "CONFIG_ERROR", "system", false);
  return value;
}

/**
 * Check rate limit
 */
export async function checkRateLimitService(clientId: string): Promise<boolean> {
  try {
    const { success } = await ratelimit.limit(clientId);
    return success;
  } catch (error) {
    console.warn("Rate limit check failed:", error);
    return true; // Allow on error
  }
}

/**
 * Extract client IP from headers
 */
export function extractClientIpData(headers: {
  "x-forwarded-for"?: string | null;
  "x-real-ip"?: string | null;
  "user-agent"?: string | null;
}): ClientIpData {
  let ip = "127.0.0.1"; // Default fallback

  const forwardedFor = headers["x-forwarded-for"];
  const realIp = headers["x-real-ip"];

  if (forwardedFor) {
    const ips = forwardedFor
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (ips[0]) ip = ips[0];
  } else if (realIp) {
    ip = realIp.trim();
  }

  // Clean IP
  ip = ip.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  if (!ip || ip === ":") ip = "127.0.0.1";

  return {
    ip,
    userAgent: headers["user-agent"] || "unknown",
  };
}

/**
 * Process onboarding submission
 */
export async function processSubmissionService(
  submissionData: {
    token: string;
    client: ClientData;
    consent: {
      consent_type: "data_processing" | "marketing" | "hipaa" | "photography";
      consent_text_version: string;
      granted: boolean;
      signature_svg?: string | null | undefined;
      signature_image_url?: string | null | undefined;
    };
    photo_path?: string | null | undefined;
    photo_size?: number | null | undefined;
  },
  clientIpData: ClientIpData,
): Promise<{ contactId: string; message: string }> {
  const db = await getDb();
  const repo = createOnboardingRepository(db);

  try {
    // Validate token and get userId
    const tokenValidation = await repo.validateToken(submissionData.token);

    if (!tokenValidation.isValid || !tokenValidation.token) {
      throw new AppError(
        tokenValidation.error || "Invalid token",
        "INVALID_TOKEN",
        "validation",
        false,
      );
    }

    const userId = tokenValidation.token.userId;

    // Prepare consent with IP tracking
    const consentData: ConsentData = {
      ...submissionData.consent,
      signature_svg: submissionData.consent.signature_svg ?? null,
      signature_image_url: submissionData.consent.signature_image_url ?? null,
      ip_address: clientIpData.ip,
      user_agent: clientIpData.userAgent,
    };

    // Submit to database
    const contactId = await repo.createContactWithConsent(
      userId,
      submissionData.token,
      submissionData.client,
      consentData,
      submissionData.photo_path ?? null,
      submissionData.photo_size ?? null,
    );

    return {
      contactId,
      message: "Onboarding completed successfully",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to submit onboarding",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Track token access (best-effort, doesn't fail)
 */
export async function trackAccessService(
  _token: string,
  _clientIpData: ClientIpData,
): Promise<void> {
  // This could call analytics service, log to DB, etc.
  // For now, it's a no-op placeholder

  return;
}

/**
 * Process photo upload for onboarding
 * Flow: Validate token → Validate file → Optimize (Sharp) → Upload → Return path
 */
export async function processPhotoUploadService(data: { token: string; file: File }): Promise<{
  success: boolean;
  filePath: string;
  fileSize: number;
  originalSize: number;
  message: string;
}> {
  const db = await getDb();
  const repo = createOnboardingRepository(db);

  // 1. Validate token
  const validation = await repo.validateToken(data.token);
  if (!validation.isValid || !validation.token?.userId) {
    throw new AppError(validation.error || "Invalid token", "INVALID_TOKEN", "validation", false);
  }

  const userId = validation.token.userId;

  // 2. Validate file
  const fileValidation = validatePhotoFile(data.file);
  if (!fileValidation.valid) {
    throw new AppError(fileValidation.error!, "INVALID_FILE", "validation", false);
  }

  if (data.file.size > MAX_FILE_SIZE) {
    throw new AppError(
      `File size exceeds ${MAX_FILE_SIZE / 1024}KB limit`,
      "FILE_TOO_LARGE",
      "validation",
      false,
    );
  }

  // 3. Optimize photo
  const arrayBuffer = await data.file.arrayBuffer();
  const optimizedBuffer = await optimizePhoto(arrayBuffer);

  // 4. Generate file path
  const fileId = randomUUID();
  const timestamp = Date.now();
  const filePath = `${userId}/${timestamp}-${fileId}.webp`;

  // 5. Upload to storage
  const supabase = createClient<Database>(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SECRET_KEY"),
  );

  const { error: uploadError } = await supabase.storage
    .from("client-photos")
    .upload(filePath, optimizedBuffer, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new AppError("Failed to upload photo", "STORAGE_ERROR", "network", true);
  }

  return {
    success: true,
    filePath: `client-photos/${filePath}`,
    fileSize: optimizedBuffer.length,
    originalSize: arrayBuffer.byteLength,
    message: "Photo uploaded successfully",
  };
}

export interface TokenListOptions {
  limit: number;
  offset: number;
}

/**
 * Generate new onboarding token
 */
export async function generateTokenService(
  userId: string,
  hoursValid: number,
  label?: string,
): Promise<{
  success: boolean;
  token: string;
  expiresAt: string;
  label?: string;
  publicUrl: string;
  message: string;
}> {
  const db = await getDb();
  const repo = createOnboardingRepository(db);

  // Calculate expiry
  const expiresAt = new Date(Date.now() + hoursValid * 3600 * 1000);

  try {
    // Create token
    const token = await repo.createToken(userId, expiresAt, label);
    const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3000";
    const publicUrl = `${baseUrl}/onboard/${token.token}`;

    return {
      success: true,
      token: token.token,
      expiresAt: token.expiresAt.toISOString(),
      ...(token.label && { label: token.label }),
      publicUrl,
      message: "Token created successfully",
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to generate token",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * List user's tokens with pagination
 */
export async function listTokensService(
  userId: string,
  options: TokenListOptions,
): Promise<
  Array<{
    id: string;
    token: string;
    label?: string;
    expiresAt: string;
    createdAt: string;
    isActive: boolean;
    usageCount: number;
  }>
> {
  const db = await getDb();
  const repo = createOnboardingRepository(db);

  try {
    const tokens = await repo.listTokens(userId, options.limit, options.offset);
    const now = new Date().toISOString();

    return tokens.map((token) => ({
      id: token.id,
      token: token.token,
      ...(token.label && { label: token.label }),
      expiresAt: token.expiresAt.toISOString(),
      createdAt: token.createdAt.toISOString(),
      isActive:
        !token.disabled && token.expiresAt.toISOString() > now && token.usedCount < token.maxUses,
      usageCount: token.usedCount,
    }));
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list tokens",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get single token by ID
 */
export async function getTokenByIdService(
  userId: string,
  tokenId: string,
): Promise<{
  id: string;
  token: string;
  label?: string;
  expiresAt: string;
  createdAt: string;
  isActive: boolean;
  usageCount: number;
}> {
  const db = await getDb();
  const repo = createOnboardingRepository(db);

  try {
    const token = await repo.getTokenById(userId, tokenId);

    if (!token) {
      throw new AppError("Token not found", "TOKEN_NOT_FOUND", "validation", false);
    }

    const now = new Date().toISOString();

    return {
      id: token.id,
      token: token.token,
      ...(token.label && { label: token.label }),
      expiresAt: token.expiresAt.toISOString(),
      createdAt: token.createdAt.toISOString(),
      isActive:
        !token.disabled && token.expiresAt.toISOString() > now && token.usedCount < token.maxUses,
      usageCount: token.usedCount,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get token",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Delete token
 */
export async function deleteTokenService(
  userId: string,
  tokenId: string,
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  const repo = createOnboardingRepository(db);

  try {
    const deleted = await repo.deleteToken(userId, tokenId);

    if (!deleted) {
      throw new AppError("Token not found", "TOKEN_NOT_FOUND", "validation", false);
    }

    return { success: true, message: "Token deleted successfully" };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete token",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Validate list options
 */
export function validateListOptions(limit?: string, offset?: string): TokenListOptions {
  return {
    limit: Math.min(Math.max(parseInt(limit ?? "20", 10) || 20, 1), 100),
    offset: Math.max(parseInt(offset ?? "0", 10) || 0, 0),
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GenerateTokenRequest = z.infer<typeof GenerateTokenRequestSchema>;
export type GenerateTokenResponse = z.infer<typeof GenerateTokenResponseSchema>;
export type OnboardingSubmitRequest = z.infer<typeof OnboardingSubmitRequestSchema>;
export type OnboardingSubmitResponse = z.infer<typeof OnboardingSubmitResponseSchema>;
