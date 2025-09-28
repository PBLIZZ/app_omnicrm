/**
 * Health Service
 *
 * Handles system health checks including database connectivity
 */

import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { ok, err, type Result } from "@/lib/utils/result";
import type { HealthResponse } from "@/server/db/business-schemas";

export interface HealthServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export class HealthService {
  /**
   * Check overall system health including database connectivity
   */
  static async getSystemHealth(): Promise<Result<HealthResponse, HealthServiceError>> {
    try {
      const dbStatus = await this.checkDatabaseHealth();

      const healthResponse: HealthResponse = {
        ts: new Date().toISOString(),
        db: dbStatus.success ? dbStatus.data : undefined,
      };

      return ok(healthResponse);
    } catch (error) {
      return err({
        code: "HEALTH_CHECK_FAILED",
        message: "Failed to perform health check",
        details: error,
      });
    }
  }

  /**
   * Check database connectivity with timeout
   */
  private static async checkDatabaseHealth(): Promise<Result<boolean, HealthServiceError>> {
    // If no DATABASE_URL is configured, skip database check
    if (!process.env["DATABASE_URL"]) {
      return ok(false);
    }

    try {
      const db = await getDb();
      const pingPromise = db.execute(sql`select 1`);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database ping timeout")), 250),
      );

      try {
        await Promise.race([pingPromise, timeoutPromise]);
        return ok(true);
      } catch (error) {
        if (error instanceof Error && error.message === "Database ping timeout") {
          return err({
            code: "DB_TIMEOUT",
            message: "Database ping timed out",
            details: { timeout: 250 },
          });
        }

        return err({
          code: "DB_PING_FAILED",
          message: "Database ping failed",
          details: error,
        });
      }
    } catch (error) {
      return err({
        code: "DB_CONNECTION_FAILED",
        message: "Failed to establish database connection",
        details: error,
      });
    }
  }

  /**
   * Check if database is configured
   */
  static isDatabaseConfigured(): boolean {
    return Boolean(process.env["DATABASE_URL"]);
  }

  /**
   * Get basic system information
   */
  static getSystemInfo(): { timestamp: string; env: string } {
    return {
      timestamp: new Date().toISOString(),
      env: process.env["NODE_ENV"] || "development",
    };
  }
}