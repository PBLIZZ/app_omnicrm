import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// DB Client type for repository pattern
export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

// Singleton DB connection following established pattern
let db: DbClient | null = null;

/**
 * Get database client following the getDb() pattern established in the codebase.
 * This ensures proper connection handling and prevents the "db.from is not a function" errors
 * that occur with the proxy-based db import.
 */
export async function getDb(): Promise<DbClient> {
  if (db) {
    return db;
  }

  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Configure postgres client for Supabase Transaction mode
  const client = postgres(connectionString, {
    prepare: false, // Required for Supabase transaction mode
    max: 10, // Connection pool size
  });

  db = drizzle(client, { schema });
  return db;
}