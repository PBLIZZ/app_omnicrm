import { ok, err } from "@/server/http/responses";
import { getServerUserId } from "@/server/auth/user";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(): Promise<ReturnType<typeof ok> | ReturnType<typeof err>> {
  if (env.NODE_ENV === "production") {
    return err(404, "not_found");
  }
  try {
    // Debug: Show what cookies we have
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(
      (c) => c.name.includes("sb") || c.name.includes("supabase"),
    );

    logger.warn(
      "[DEBUG] All cookies",
      { cookieNames: allCookies.map((c) => c.name) },
      "api/debug/user/GET",
    );
    logger.warn(
      "[DEBUG] Supabase cookies",
      { cookieNames: supabaseCookies.map((c) => c.name) },
      "api/debug/user/GET",
    );

    const userId = await getServerUserId();
    return ok({
      userId,
      debug: {
        totalCookies: allCookies.length,
        supabaseCookies: supabaseCookies.length,
        cookieNames: allCookies.map((c) => c.name),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = (error as { status?: number })?.status ?? 500;

    // Debug info only in non-production environments
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    logger.warn(
      "[DEBUG] Auth failed, cookies available",
      { cookieNames: allCookies.map((c) => c.name) },
      "api/debug/user/GET",
    );

    return err(
      status,
      message,
      {
        totalCookies: allCookies.length,
        cookieNames: allCookies.map((c) => c.name),
      },
      { file: "api/debug/user/route.ts" },
    );
  }
}
