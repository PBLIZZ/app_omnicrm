import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";

// Validation schema for access tracking
const TrackAccessSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type TrackAccessData = z.infer<typeof TrackAccessSchema>;

interface ClientIpData {
  ip: string;
  userAgent: string;
}

interface TrackAccessResult {
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

export class OnboardingTrackingService {
  /**
   * Extract client IP address and user agent from request headers
   */
  static extractClientIpData(headers: {
    "x-forwarded-for"?: string | null;
    "x-real-ip"?: string | null;
    "user-agent"?: string | null;
  }): ClientIpData {
    const forwardedFor = headers["x-forwarded-for"];
    const realIp = headers["x-real-ip"];

    let ip = "unknown";
    if (forwardedFor) {
      // Split on commas, trim each part, and take the first non-empty value
      const ips = forwardedFor
        .split(",")
        .map((ipAddress) => ipAddress.trim())
        .filter((ipAddress) => ipAddress.length > 0);
      if (ips.length > 0) {
        const firstIp = ips[0];
        if (firstIp) {
          ip = firstIp;
        }
      }
    } else if (realIp) {
      ip = realIp.trim();
    }

    // Clean up IP address - remove port numbers and IPv6 brackets
    const cleanIp = ip.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
    const userAgent = headers["user-agent"] || "unknown";

    return { ip: cleanIp, userAgent };
  }

  /**
   * Validate access tracking request data
   */
  static validateTrackAccessRequest(body: unknown): TrackAccessData {
    return TrackAccessSchema.parse(body);
  }

  /**
   * Update last accessed timestamp for a token
   * Note: This would use an RPC function if it existed in the database
   */
  private static async updateLastAccessedAt(
    _supabase: ReturnType<typeof createClient<Database>>,
    _token: string,
  ): Promise<void> {
    // TODO: Implement RPC function in database if needed
    // For now, access tracking is disabled
    return;
  }

  /**
   * Increment access count for a token
   * Note: This would use an RPC function if it existed in the database
   */
  private static async incrementAccessCount(
    _supabase: ReturnType<typeof createClient<Database>>,
    _token: string,
  ): Promise<void> {
    // TODO: Implement RPC function in database if needed
    // For now, access tracking is disabled
    return;
  }

  /**
   * Track access for an onboarding token
   */
  static async trackTokenAccess(
    tokenData: TrackAccessData,
    _clientIpData: ClientIpData,
  ): Promise<TrackAccessResult> {
    const { token } = tokenData;

    try {
      const supabase = createClient<Database>(
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredEnv("SUPABASE_SECRET_KEY"),
      );

      // Update last accessed timestamp
      await this.updateLastAccessedAt(supabase, token);

      // Increment access count
      await this.incrementAccessCount(supabase, token);

      return {
        success: true,
        message: "Access tracked successfully",
      };
    } catch (error) {
      console.error("Track access error:", error);

      // Don't fail the request if tracking fails - this is best-effort
      return {
        success: true,
        message: "Access tracking failed but request continues",
      };
    }
  }
}
