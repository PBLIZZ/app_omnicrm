import { and, eq } from "drizzle-orm";
import { contacts } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/db/supabase/server";

export interface AvatarData {
  photoUrl: string | null;
  displayName: string;
}

export interface AvatarResult {
  type: "redirect" | "svg";
  content: string;
  headers?: Record<string, string>;
}

const FALLBACK_COLOURS = [
  "#2563EB",
  "#7C3AED",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#10B981",
  "#14B8A6",
  "#0EA5E9",
  "#6366F1",
  "#F59E0B",
];

/**
 * Avatar Service
 * Handles avatar generation, storage URL resolution, and fallback SVG creation
 */
export class AvatarService {
  /**
   * Get contact data for avatar generation
   */
  static async getContactAvatarData(clientId: string, userId: string): Promise<AvatarData | null> {
    const db = await getDb();

    const result = await db
      .select({
        photoUrl: contacts.photoUrl,
        displayName: contacts.displayName,
      })
      .from(contacts)
      .where(and(eq(contacts.id, clientId), eq(contacts.userId, userId)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Generate avatar result (either redirect to photo or SVG fallback)
   */
  static async generateAvatar(
    avatarData: AvatarData,
    clientId: string,
  ): Promise<AvatarResult> {
    const trimmedPhotoUrl = avatarData.photoUrl?.trim();

    if (trimmedPhotoUrl) {
      // Try to resolve photo URL
      const photoResult = await this.resolvePhotoUrl(trimmedPhotoUrl);
      if (photoResult) {
        return {
          type: "redirect",
          content: photoResult,
        };
      }
    }

    // Generate fallback SVG
    const svg = this.buildFallbackSvg(avatarData.displayName, clientId);
    return {
      type: "svg",
      content: svg,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    };
  }

  /**
   * Resolve photo URL to a valid redirect URL
   */
  private static async resolvePhotoUrl(photoUrl: string): Promise<string | null> {
    // Check if it's already a full HTTP URL
    if (/^https?:\/\//i.test(photoUrl)) {
      if (this.isAllowedOrigin(photoUrl)) {
        return photoUrl;
      }
      return null; // Unauthorized origin
    }

    // Try to resolve as Supabase storage path
    const parsedPath = this.parseStoragePath(photoUrl);
    const supabaseClient = supabaseServerAdmin ?? supabaseServerPublishable;

    if (parsedPath && supabaseClient) {
      const { data, error } = await supabaseClient.storage
        .from(parsedPath.bucket)
        .createSignedUrl(parsedPath.path, 60);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    }

    return null;
  }

  /**
   * Check if URL origin is allowed for security
   */
  private static isAllowedOrigin(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const allowedOrigins = [
        process.env["NEXT_PUBLIC_SUPABASE_URL"],
        process.env["VERCEL_URL"] ? `https://${process.env["VERCEL_URL"]}` : undefined,
        process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined,
      ].filter(Boolean);

      return allowedOrigins.some((origin) => origin && urlObj.origin === origin);
    } catch {
      return false;
    }
  }

  /**
   * Parse storage path for Supabase bucket and path
   */
  private static parseStoragePath(photoUrl: string): { bucket: string; path: string } | null {
    const normalized = photoUrl.replace(/^\/+/, "");

    // Handle case where the stored URL already includes the bucket name
    if (normalized.startsWith("client-photos/")) {
      const path = normalized.replace("client-photos/", "");
      return { bucket: "client-photos", path };
    }

    // Handle case where it's just the path within the bucket
    const [bucket, ...rest] = normalized.split("/");
    const path = rest.join("/");

    if (!bucket || !path) {
      return null;
    }

    return { bucket, path };
  }

  /**
   * Build fallback SVG avatar with initials and background color
   */
  private static buildFallbackSvg(displayName: string, seed: string): string {
    const initials = this.extractInitials(displayName);
    const background = this.pickColour(seed || displayName || initials);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${this.escapeXml(
      displayName || "Client",
    )}">
  <rect width="120" height="120" fill="${background}" rx="60"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="52" fill="#FFFFFF" font-weight="600">${initials}</text>
</svg>`;
  }

  /**
   * Extract initials from display name
   */
  private static extractInitials(displayName: string): string {
    const trimmed = displayName.trim();
    if (!trimmed) return "?";

    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) {
      return parts[0]?.slice(0, 1).toUpperCase() ?? "?";
    }

    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    const initials = `${first}${last}`.toUpperCase();
    return initials || "?";
  }

  /**
   * Pick consistent color based on seed string
   */
  private static pickColour(seed: string): string {
    if (!seed) {
      return FALLBACK_COLOURS[0] ?? "#2563EB";
    }

    // Use unsigned 32-bit accumulation to avoid signed overflow
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      const charCode = seed.charCodeAt(index);
      hash = (hash * 31 + charCode) >>> 0; // Use unsigned right shift to ensure unsigned 32-bit
    }

    // Compute safe index using modulo
    const safeIndex = hash % FALLBACK_COLOURS.length;
    return FALLBACK_COLOURS[safeIndex] ?? "#f0fdfa";
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(value: string): string {
    return value.replace(/["'&<>]/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return char;
      }
    });
  }
}