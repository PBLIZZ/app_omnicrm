// Central DB entrypoint for server-side code.
// Re-exports the lazily initialized Drizzle client backed by node-postgres.
// This removes the prior Neon dependency and works with Supabase Postgres.

export { db } from "@/server/db/client";
