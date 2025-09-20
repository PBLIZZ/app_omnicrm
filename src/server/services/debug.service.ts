import { cookies } from "next/headers";
import { logger } from "@/lib/observability";

interface DebugInfo {
  userId: string;
  debug: {
    totalCookies: number;
    supabaseCookies: number;
    cookieNames: string[];
    environment: string;
    timestamp: string;
  };
}

interface AuthFailureDebugInfo {
  error: string;
  debug: {
    totalCookies: number;
    cookieNames: string[];
    file: string;
    timestamp: string;
  };
}

export class DebugService {
  /**
   * Get debug information for authenticated user
   */
  static async getUserDebugInfo(userId: string): Promise<DebugInfo> {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(
      (c) => c.name.includes("sb") || c.name.includes("supabase"),
    );

    await logger.warn("[DEBUG] User debug info requested", {
      operation: "debug_service.get_user_info",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        totalCookies: allCookies.length,
        supabaseCookies: supabaseCookies.length,
      },
    });

    await logger.warn("[DEBUG] All cookies", {
      operation: "debug_service.get_user_info",
      additionalData: { cookieNames: allCookies.map((c) => c.name) },
    });

    await logger.warn("[DEBUG] Supabase cookies", {
      operation: "debug_service.get_user_info",
      additionalData: { cookieNames: supabaseCookies.map((c) => c.name) },
    });

    return {
      userId,
      debug: {
        totalCookies: allCookies.length,
        supabaseCookies: supabaseCookies.length,
        cookieNames: allCookies.map((c) => c.name),
        environment: process.env.NODE_ENV || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get debug information for authentication failures
   */
  static async getAuthFailureDebugInfo(error: unknown): Promise<AuthFailureDebugInfo> {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = (error as { status?: number })?.status ?? 500;

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    await logger.warn("[DEBUG] Auth failed, cookies available", {
      operation: "debug_service.auth_failure",
      additionalData: {
        error: message,
        status,
        cookieNames: allCookies.map((c) => c.name),
      },
    });

    return {
      error: message,
      debug: {
        totalCookies: allCookies.length,
        cookieNames: allCookies.map((c) => c.name),
        file: "debug.service.ts",
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get environment information
   */
  static async getEnvironmentInfo(): Promise<{
    environment: string;
    nodeVersion: string;
    timestamp: string;
    features: Record<string, boolean>;
  }> {
    const features = {
      googleIntegration: !!(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]),
      supabaseIntegration: !!(process.env["NEXT_PUBLIC_SUPABASE_URL"] && process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"]),
      openaiIntegration: !!process.env["OPENAI_API_KEY"],
      anthropicIntegration: !!process.env["ANTHROPIC_API_KEY"],
      encryptionEnabled: !!process.env["APP_ENCRYPTION_KEY"],
    };

    await logger.info("[DEBUG] Environment info requested", {
      operation: "debug_service.environment_info",
      additionalData: {
        environment: process.env.NODE_ENV || "unknown",
        features,
      },
    });

    return {
      environment: process.env.NODE_ENV || "unknown",
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      features,
    };
  }

  /**
   * Get system health information
   */
  static async getSystemHealth(): Promise<{
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: string;
    status: "healthy" | "degraded" | "unhealthy";
  }> {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Simple health check based on memory usage
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    let status: "healthy" | "degraded" | "unhealthy";

    if (memoryUsagePercent < 70) {
      status = "healthy";
    } else if (memoryUsagePercent < 90) {
      status = "degraded";
    } else {
      status = "unhealthy";
    }

    await logger.info("[DEBUG] System health check", {
      operation: "debug_service.system_health",
      additionalData: {
        uptime,
        memoryUsagePercent,
        status,
      },
    });

    return {
      uptime,
      memory: memoryUsage,
      timestamp: new Date().toISOString(),
      status,
    };
  }

  /**
   * Validate debug access (development only)
   */
  static validateDebugAccess(): { allowed: boolean; reason?: string } {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      return {
        allowed: false,
        reason: "Debug endpoints are disabled in production",
      };
    }

    return { allowed: true };
  }

  /**
   * Log debug request for audit purposes
   */
  static async logDebugRequest(
    userId: string,
    operation: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await logger.info(`[DEBUG] ${operation} requested`, {
      operation: `debug_service.${operation}`,
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Get cookie analysis for debugging authentication issues
   */
  static async analyzeCookies(): Promise<{
    total: number;
    supabaseRelated: string[];
    authRelated: string[];
    sessionRelated: string[];
    timestamp: string;
  }> {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    const supabaseRelated = allCookies
      .filter((c) => c.name.includes("sb") || c.name.includes("supabase"))
      .map((c) => c.name);

    const authRelated = allCookies
      .filter((c) => c.name.includes("auth") || c.name.includes("token"))
      .map((c) => c.name);

    const sessionRelated = allCookies
      .filter((c) => c.name.includes("session") || c.name.includes("sess"))
      .map((c) => c.name);

    const analysis = {
      total: allCookies.length,
      supabaseRelated,
      authRelated,
      sessionRelated,
      timestamp: new Date().toISOString(),
    };

    await logger.info("[DEBUG] Cookie analysis", {
      operation: "debug_service.analyze_cookies",
      additionalData: analysis,
    });

    return analysis;
  }
}