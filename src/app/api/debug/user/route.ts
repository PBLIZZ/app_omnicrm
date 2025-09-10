import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { cookies } from "next/headers";
import { env } from "@/server/lib/env";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";

export const GET = createRouteHandler({
  auth: true, // Use standard auth now
  rateLimit: { operation: "debug_user" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("debug_user", requestId);

  if (env.NODE_ENV === "production") {
    return api.notFound("Not found");
  }

  try {
    // Debug: Show what cookies we have
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(
      (c) => c.name.includes("sb") || c.name.includes("supabase"),
    );

    await logger.warn("[DEBUG] All cookies", {
      operation: "api/debug/user/GET",
      additionalData: { cookieNames: allCookies.map((c) => c.name) },
    });
    await logger.warn("[DEBUG] Supabase cookies", {
      operation: "api/debug/user/GET",
      additionalData: { cookieNames: supabaseCookies.map((c) => c.name) },
    });

    return api.success({
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
    void logger.warn("[DEBUG] Auth failed, cookies available", {
      operation: "api/debug/user/GET",
      additionalData: { cookieNames: allCookies.map((c) => c.name) },
    });

    const errorCode =
      status >= 500 ? "INTERNAL_ERROR" : status === 401 ? "UNAUTHORIZED" : "VALIDATION_ERROR";

    return api.error(
      message,
      errorCode,
      {
        totalCookies: allCookies.length,
        cookieNames: allCookies.map((c) => c.name),
        file: "api/debug/user/route.ts",
      },
      ensureError(error),
    );
  }
});
