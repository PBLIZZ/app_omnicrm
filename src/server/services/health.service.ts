/**
 * Health Service
 *
 * Handles system health checks including database connectivity
 */

import { createHealthRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { AppError } from "@/lib/errors/app-error";
import type { HealthResponse } from "@/server/db/business-schemas";

/**
 * Check overall system health including database connectivity
 */
export async function getSystemHealthService(): Promise<HealthResponse> {
  try {
    const dbStatus = await checkDatabaseHealth();

    const healthResponse: HealthResponse = {
      ts: new Date().toISOString(),
      db: dbStatus,
    };

    return healthResponse;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to perform health check",
      "HEALTH_CHECK_FAILED",
      "system",
      false,
    );
  }
}

/**
 * Check database connectivity with timeout
 */
async function checkDatabaseHealth(): Promise<boolean> {
  // If no DATABASE_URL is configured, skip database check
  if (!process.env["DATABASE_URL"]) {
    return false;
  }

  try {
    const db = await getDb();
    const repo = createHealthRepository(db);
    const pingPromise = repo.pingDatabase();
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Database ping timeout")), 250);
    });

    try {
      await Promise.race([pingPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);
      return true;
    } catch (error) {
      if (timer) clearTimeout(timer);
      if (error instanceof Error && error.message === "Database ping timeout") {
        throw new AppError(
          "Database ping timed out",
          "DB_TIMEOUT",
          "database",
          false,
        );
      }

      throw new AppError(
        error instanceof Error ? error.message : "Database ping failed",
        "DB_PING_FAILED",
        "database",
        false,
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Failed to establish database connection",
      "DB_CONNECTION_FAILED",
      "database",
      false,
    );
  }
}

/**
 * Check if database is configured
 */
export function isDatabaseConfiguredService(): boolean {
  return Boolean(process.env["DATABASE_URL"]);
}

/**
 * Get basic system information
 */
export function getSystemInfoService(): { timestamp: string; env: string } {
  return {
    timestamp: new Date().toISOString(),
    env: process.env["NODE_ENV"] ?? "development",
  };
}
