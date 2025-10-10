import { sql } from "drizzle-orm";
import type { DbClient } from "@/server/db/client";

/**
 * HealthRepository
 *
 * Lightweight data-access helpers for infrastructure health checks.
 */
export class HealthRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Execute a simple database ping to verify connectivity.
   *
   * Throws if the query fails or times out at the connection layer.
   */
  async pingDatabase(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }
}

export function createHealthRepository(db: DbClient): HealthRepository {
  return new HealthRepository(db);
}
