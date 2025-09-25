import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { contacts } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/db/supabase/server";

const ParamsSchema = z.object({ clientId: z.string().uuid() });

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ clientId: string }> },
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const params = await context.params;
    const { clientId } = ParamsSchema.parse(params);

    const db = await getDb();
    const result = (await db
      .select({
        photoUrl: contacts.photoUrl,
        displayName: contacts.displayName,
      })
      .from(contacts)
      .where(and(eq(contacts.id, clientId), eq(contacts.userId, userId)))
      .limit(1)) as Array<{
      photoUrl: string | null;
      displayName: string;
    }>;

    const record = result[0];

    if (!record) {
      return new NextResponse("Client not found", { status: 404 });
    }

    const trimmedPhotoUrl = record.photoUrl?.trim();

    if (trimmedPhotoUrl) {
      if (/^https?:\/\//i.test(trimmedPhotoUrl)) {
        // Validate URL and check origin for security
        try {
          const url = new URL(trimmedPhotoUrl);
          const allowedOrigins = [
            process.env["NEXT_PUBLIC_SUPABASE_URL"],
            process.env["VERCEL_URL"] ? `https://${process.env["VERCEL_URL"]}` : undefined,
            process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined,
          ].filter(Boolean);

          const isAllowedOrigin = allowedOrigins.some((origin) => origin && url.origin === origin);

          if (!isAllowedOrigin) {
            console.warn(`Blocked redirect to unauthorized origin: ${url.origin}`);
            // Fall through to generate fallback avatar instead of redirecting
          } else {
            return NextResponse.redirect(trimmedPhotoUrl, { status: 302 });
          }
        } catch (error) {
          console.warn(`Invalid photo URL format: ${trimmedPhotoUrl}`, error);
          // Fall through to generate fallback avatar
        }
      }

      // Always parse the storage path for consistent handling
      const parsedPath = parseStoragePath(trimmedPhotoUrl);
      const supabaseClient = supabaseServerAdmin ?? supabaseServerPublishable;

      if (parsedPath && supabaseClient) {
        const { data, error } = await supabaseClient.storage
          .from(parsedPath.bucket)
          .createSignedUrl(parsedPath.path, 60);

        if (!error && data?.signedUrl) {
          return NextResponse.redirect(data.signedUrl, { status: 302 });
        }
      }
    }

    const initialsSvg = buildFallbackSvg(record.displayName ?? "", clientId);
    return new NextResponse(initialsSvg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/omni-clients/[clientId]/avatar error:", error);
    return new NextResponse("Avatar unavailable", { status: 500 });
  }
}

function parseStoragePath(photoUrl: string): { bucket: string; path: string } | null {
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

function buildFallbackSvg(displayName: string, seed: string): string {
  const initials = extractInitials(displayName);
  const background = pickColour(seed || displayName || initials);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${escapeXml(
    displayName || "Client",
  )}">
  <rect width="120" height="120" fill="${background}" rx="60"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="52" fill="#FFFFFF" font-weight="600">${initials}</text>
</svg>`;
}

function extractInitials(displayName: string): string {
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

function pickColour(seed: string): string {
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

function escapeXml(value: string): string {
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
