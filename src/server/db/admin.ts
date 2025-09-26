// Server-side admin database operations using Drizzle with secret key permissions
// This provides RLS-bypassing operations for system processes like sync jobs
import { logger } from "@/lib/observability";
import { getDb } from "./client";
import { rawEvents, interactions, aiInsights, embeddings } from "./schema";

const isTest = process.env.NODE_ENV === "test";

// Allow-listed tables that admin operations can write to
export const ADMIN_ALLOWED_TABLES = [
  "raw_events",
  "interactions",
  "ai_insights",
  "embeddings",
] as const;
export type AdminAllowedTable = (typeof ADMIN_ALLOWED_TABLES)[number];

// Table mapping for Drizzle operations
const tableMap = {
  raw_events: rawEvents,
  interactions,
  ai_insights: aiInsights,
  embeddings,
} as const;

// Type mappings for insert/select operations with proper Drizzle constraint
type AdminInsertRow<T extends AdminAllowedTable> = T extends "raw_events"
  ? typeof rawEvents.$inferInsert
  : T extends "interactions"
    ? typeof interactions.$inferInsert
    : T extends "ai_insights"
      ? typeof aiInsights.$inferInsert
      : T extends "embeddings"
        ? typeof embeddings.$inferInsert
        : never;

type AdminSelectRow<T extends AdminAllowedTable> = T extends "raw_events"
  ? typeof rawEvents.$inferSelect
  : T extends "interactions"
    ? typeof interactions.$inferSelect
    : T extends "ai_insights"
      ? typeof aiInsights.$inferSelect
      : T extends "embeddings"
        ? typeof embeddings.$inferSelect
        : never;

export const drizzleAdminGuard = {
  /**
   * Insert records using Drizzle with secret key permissions
   * Supports camelCase field names that automatically map to snake_case database columns
   */
  async insert<T extends AdminAllowedTable>(
    table: T,
    values: AdminInsertRow<T> | AdminInsertRow<T>[],
  ): Promise<Array<AdminSelectRow<T>>> {
    if (!ADMIN_ALLOWED_TABLES.includes(table)) {
      throw new Error("admin_write_forbidden");
    }
    if (isTest) return [] as Array<AdminSelectRow<T>>;

    try {
      const db = await getDb();
      const drizzleTable = tableMap[table];
      const valuesArray = Array.isArray(values) ? values : [values];

      const result = await db
        .insert(drizzleTable)
        .values(valuesArray as never)
        .returning();

      await logger.info("admin_insert_success", {
        operation: "db_query",
        additionalData: {
          op: "drizzle_admin_insert",
          table,
          recordCount: result.length,
        },
      });

      return result as Array<AdminSelectRow<T>>;
    } catch (error) {
      await logger.warn(
        "admin_insert_failed",
        {
          operation: "db_query",
          additionalData: {
            op: "drizzle_admin_insert",
            table,
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
          },
        },
        error instanceof Error ? error : undefined,
      );
      throw new Error(
        `admin_insert_failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  /**
   * Upsert records using Drizzle with secret key permissions
   * Uses onConflictDoNothing to handle duplicate key violations gracefully
   */
  async upsert<T extends AdminAllowedTable>(
    table: T,
    values: AdminInsertRow<T> | Array<AdminInsertRow<T>>,
  ): Promise<Array<AdminSelectRow<T>>> {
    if (!ADMIN_ALLOWED_TABLES.includes(table)) {
      throw new Error("admin_write_forbidden");
    }
    if (isTest) return [] as Array<AdminSelectRow<T>>;

    try {
      const db = await getDb();
      const drizzleTable = tableMap[table];
      const valuesArray = Array.isArray(values) ? values : [values];

      // Use onConflictDoNothing to gracefully handle duplicates
      const result = await db
        .insert(drizzleTable)
        .values(valuesArray as never)
        .onConflictDoNothing()
        .returning();

      await logger.info("admin_upsert_success", {
        operation: "db_query",
        additionalData: {
          op: "drizzle_admin_upsert",
          table,
          inputCount: valuesArray.length,
          insertedCount: result.length,
          skippedCount: valuesArray.length - result.length,
        },
      });

      return result as Array<AdminSelectRow<T>>;
    } catch (error) {
      await logger.warn(
        "admin_upsert_failed",
        {
          operation: "db_query",
          additionalData: {
            op: "drizzle_admin_upsert",
            table,
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
          },
        },
        error instanceof Error ? error : undefined,
      );
      throw new Error(
        `admin_upsert_failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  /**
   * Batch insert with better error handling for large operations
   * Useful for sync operations that need to insert many records
   */
  async batchInsert<T extends AdminAllowedTable>(
    table: T,
    values: Array<AdminInsertRow<T>>,
    batchSize: number = 100,
  ): Promise<Array<AdminSelectRow<T>>> {
    if (!ADMIN_ALLOWED_TABLES.includes(table)) {
      throw new Error("admin_write_forbidden");
    }
    if (isTest) return [] as Array<AdminSelectRow<T>>;
    if (values.length === 0) return [];

    const results: Array<AdminSelectRow<T>> = [];

    try {
      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);
        const batchResults = await this.upsert(table, batch);
        results.push(...batchResults);

        // Small delay between batches to prevent rate limiting
        if (i + batchSize < values.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      await logger.info("admin_batch_insert_success", {
        operation: "db_query",
        additionalData: {
          op: "drizzle_admin_batch_insert",
          table,
          totalInputs: values.length,
          totalInserted: results.length,
          batchSize,
          batchCount: Math.ceil(values.length / batchSize),
        },
      });

      return results;
    } catch (error) {
      await logger.warn(
        "admin_batch_insert_failed",
        {
          operation: "db_query",
          additionalData: {
            op: "drizzle_admin_batch_insert",
            table,
            error: error instanceof Error ? error.message : String(error),
            processedSoFar: results.length,
            totalInputs: values.length,
          },
        },
        error instanceof Error ? error : undefined,
      );
      throw error;
    }
  },
};
