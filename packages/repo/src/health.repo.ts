import { sql } from "drizzle-orm";
import type { DbClient } from "@/server/db/client";

/**
 * HealthRepository
 *
 * Lightweight data-access helpers for infrastructure health checks.
 */
export class HealthRepository {
  /**
   * Execute a simple database ping to verify connectivity.
   *
   * Throws if the query fails or times out at the connection layer.
   */
  static async pingDatabase(db: DbClient): Promise<void> {
    await db.execute(sql`select 1`);
  }
}

