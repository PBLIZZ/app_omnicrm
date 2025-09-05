// Service-role client for RLS-bypassing writes (raw_events, embeddings, ai_insights).
import { createClient } from "@supabase/supabase-js";
import { log } from "@/lib/log";

// PostgreSQL/Supabase error interface
interface PostgresError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
}

// Type guard to check if an error is a PostgreSQL error
function isPostgresError(error: unknown): error is PostgresError {
  if (!(error instanceof Error)) return false;

  const errorObj = error as Record<string, unknown>;
  return (
    typeof errorObj.code === "string" ||
    typeof errorObj.details === "string" ||
    typeof errorObj.hint === "string"
  );
}
import type {
  AiInsight,
  NewAiInsight,
  Embedding,
  NewEmbedding,
  Interaction,
  NewInteraction,
  RawEvent,
  NewRawEvent,
} from "@/server/db/schema";

const isTest = process.env.NODE_ENV === "test";

// Bare admin client (RLS bypass). In tests, avoid initializing a real client.
const adminUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const adminKey = process.env["SUPABASE_SECRET_KEY"];
if (!isTest && (!adminUrl || !adminKey)) {
  log.warn(
    { op: "supa_admin_init", hasUrl: Boolean(adminUrl), hasKey: Boolean(adminKey) },
    "missing_supabase_admin_env",
  );
}
// Only initialize the service-role client when both URL and KEY are present, and not in tests.
// This prevents build-time failures during Next.js page data collection when secrets are not set.
const supaAdmin =
  !isTest && adminUrl && adminKey
    ? createClient(adminUrl, adminKey, { auth: { persistSession: false } })
    : null;

// Allow-list of tables that the service role may write to.
export const ALLOWED_TABLES = ["raw_events", "interactions", "ai_insights", "embeddings"] as const;
export type AllowedTable = (typeof ALLOWED_TABLES)[number];

type InsertRow<T extends AllowedTable> = T extends "raw_events"
  ? NewRawEvent
  : T extends "interactions"
    ? NewInteraction
    : T extends "ai_insights"
      ? NewAiInsight
      : T extends "embeddings"
        ? NewEmbedding
        : never;

type SelectRow<T extends AllowedTable> = T extends "raw_events"
  ? RawEvent
  : T extends "interactions"
    ? Interaction
    : T extends "ai_insights"
      ? AiInsight
      : T extends "embeddings"
        ? Embedding
        : never;

export const supaAdminGuard = {
  async insert<T extends AllowedTable>(
    table: T,
    values: InsertRow<T> | InsertRow<T>[],
  ): Promise<Array<SelectRow<T>>> {
    if (!ALLOWED_TABLES.includes(table)) throw new Error("admin_write_forbidden");
    if (isTest) return [] as Array<SelectRow<T>>;
    if (!supaAdmin) {
      log.warn({ op: "supa_admin_use", table }, "admin_client_unavailable");
      throw new Error("admin_client_unavailable");
    }
    const { data, error } = await supaAdmin.from(table).insert(values as never);
    if (error) {
      log.warn(
        {
          op: "supa_admin_insert",
          table,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
        "admin_insert_failed",
      );
      throw new Error("admin_insert_failed");
    }
    return (data ?? []) as Array<SelectRow<T>>;
  },

  async upsert<T extends AllowedTable>(
    table: T,
    values: InsertRow<T> | Array<InsertRow<T>>,
  ): Promise<Array<SelectRow<T>>> {
    if (!ALLOWED_TABLES.includes(table)) throw new Error("admin_write_forbidden");
    if (isTest) return [] as Array<SelectRow<T>>;
    if (!supaAdmin) {
      log.warn({ op: "supa_admin_use", table }, "admin_client_unavailable");
      throw new Error("admin_client_unavailable");
    }

    // Try upsert with ignoreDuplicates first, fall back to insert on PGRST204
    try {
      const { data, error } = await supaAdmin
        .from(table)
        .upsert(values as never, { ignoreDuplicates: true });

      if (error) {
        // If this is a PGRST204 error (No Content), fall back to insert
        if (error.code === "PGRST204") {
          log.info({ op: "supa_admin_upsert_fallback", table }, "falling_back_to_insert");
          return await this.insert(table, values);
        }
        throw error;
      }
      return (data ?? []) as Array<SelectRow<T>>;
    } catch (error) {
      log.warn(
        {
          op: "supa_admin_upsert",
          table,
          error: error instanceof Error ? error.message : String(error),
          errorCode: isPostgresError(error) ? error.code : undefined,
          errorDetails: isPostgresError(error) ? error.details : undefined,
          errorHint: isPostgresError(error) ? error.hint : undefined,
          fullError: error,
        },
        "admin_upsert_failed",
      );
      throw new Error(
        `admin_upsert_failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  async update<T extends AllowedTable>(
    table: T,
    match: Partial<SelectRow<T>>,
    values: Partial<SelectRow<T>>,
  ): Promise<Array<SelectRow<T>>> {
    if (!ALLOWED_TABLES.includes(table)) throw new Error("admin_write_forbidden");
    if (isTest) return [] as Array<SelectRow<T>>;
    if (!supaAdmin) {
      log.warn({ op: "supa_admin_use", table }, "admin_client_unavailable");
      throw new Error("admin_client_unavailable");
    }
    const { data, error } = await supaAdmin
      .from(table)
      .update(values as never)
      .match(match as never);
    if (error) {
      log.warn(
        {
          op: "supa_admin_update",
          table,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
        "admin_update_failed",
      );
      throw new Error("admin_update_failed");
    }
    return (data ?? []) as Array<SelectRow<T>>;
  },
};
