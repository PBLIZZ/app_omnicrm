import { z } from "zod";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";

// Validation schema for token generation request
const GenerateTokenSchema = z.object({
  hoursValid: z.number().int().min(1).max(168).default(72), // 1 hour to 1 week
  label: z.string().min(1, "Label is required").max(100, "Label too long").optional(),
});

export type GenerateTokenData = z.infer<typeof GenerateTokenSchema>;

interface TokenResponse {
  token: string;
  onboardingUrl: string;
  expiresAt: string;
  label: string | null;
}

interface ListTokensOptions {
  limit?: number;
  offset?: number;
}

interface ListTokensResult {
  tokens: Database["public"]["Tables"]["onboarding_tokens"]["Row"][];
}

interface DeleteTokenResult {
  success: boolean;
  message: string;
}

// Environment variable validation helper
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

export class OnboardingTokenService {
  /**
   * Validate token generation request data
   */
  static validateGenerateTokenRequest(body: unknown): GenerateTokenData {
    return GenerateTokenSchema.parse(body);
  }

  /**
   * Generate a secure token string
   */
  static generateSecureToken(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Calculate expiry date from hours
   */
  static calculateExpiryDate(hoursValid: number): Date {
    return new Date(Date.now() + hoursValid * 3600 * 1000);
  }

  /**
   * Generate public URL for the token
   */
  static generatePublicUrl(token: string): string {
    const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3000";
    return `${baseUrl}/onboard/${token}`;
  }

  /**
   * Insert token into database
   */
  static async createToken(
    userId: string,
    token: string,
    expiresAt: Date,
    label?: string
  ): Promise<{
    token: string;
    expires_at: string;
    label: string | null;
  }> {
    const supabase = createClient<Database>(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SECRET_KEY"),
    );

    const { data, error } = await supabase
      .from("onboarding_tokens")
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        max_uses: 1, // Always single use
        label: label || null,
      })
      .select("token, expires_at, label")
      .single();

    if (error) {
      console.error("Token creation error:", error);
      throw new Error("Failed to create onboarding token");
    }

    return data;
  }

  /**
   * Generate new onboarding token - main service method
   */
  static async generateOnboardingToken(
    userId: string,
    tokenData: GenerateTokenData
  ): Promise<TokenResponse> {
    const { hoursValid, label } = tokenData;

    // Generate secure token and expiry date
    const token = this.generateSecureToken();
    const expiresAt = this.calculateExpiryDate(hoursValid);

    // Insert token into database
    const dbResult = await this.createToken(userId, token, expiresAt, label);

    // Generate public URL
    const publicUrl = this.generatePublicUrl(token);

    return {
      token: dbResult.token,
      onboardingUrl: publicUrl,
      expiresAt: dbResult.expires_at,
      label: dbResult.label,
    };
  }

  /**
   * Validate pagination parameters
   */
  static validateListOptions(limit?: string, offset?: string): ListTokensOptions {
    // Validate and set safe defaults
    const validatedLimit = Math.min(
      Math.max(parseInt(limit || "20", 10) || 20, 1),
      100, // max limit
    );
    const validatedOffset = Math.max(parseInt(offset || "0", 10) || 0, 0);

    return {
      limit: validatedLimit,
      offset: validatedOffset,
    };
  }

  /**
   * List tokens for a user with pagination
   */
  static async listUserTokens(
    userId: string,
    options: ListTokensOptions
  ): Promise<ListTokensResult> {
    const { limit = 20, offset = 0 } = options;

    const supabase = createClient<Database>(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SECRET_KEY"),
    );

    const { data: tokens, error } = await supabase
      .from("onboarding_tokens")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Database error:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
        limit,
        offset,
      });
      throw new Error("Failed to fetch tokens");
    }

    return {
      tokens: tokens || [],
    };
  }

  /**
   * Delete a token by ID for a specific user
   */
  static async deleteUserToken(
    userId: string,
    tokenId: string
  ): Promise<DeleteTokenResult> {
    if (!tokenId) {
      throw new Error("Token ID is required");
    }

    const supabase = createClient<Database>(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SECRET_KEY"),
    );

    // Delete the token (only if it belongs to the user)
    const { data: deletedRows, error: deleteError } = await supabase
      .from("onboarding_tokens")
      .delete()
      .eq("id", tokenId)
      .eq("user_id", userId)
      .select();

    if (deleteError) {
      console.error("Database error:", deleteError);
      throw new Error("Failed to delete token");
    }

    if (!deletedRows || deletedRows.length === 0) {
      throw new Error("Token not found");
    }

    return {
      success: true,
      message: "Token deleted successfully",
    };
  }
}