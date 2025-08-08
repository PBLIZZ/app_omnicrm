// src/server/db/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) throw new Error("DATABASE_URL is missing");

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Supabase
});

export const db = drizzle(pool);

export async function dbPing(): Promise<boolean> {
  const r = await pool.query("select 1 as ok");
  return r.rows?.[0]?.ok === 1;
}