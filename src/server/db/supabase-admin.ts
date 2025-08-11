// Service-role client for RLS-bypassing writes (raw_events, embeddings, ai_insights).
import { createClient } from "@supabase/supabase-js";
import { log } from "@/server/log";

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
const _supaAdmin = isTest
  ? null
  : createClient(adminUrl || "", adminKey || "", {
      auth: { persistSession: false },
    });

// Allow-list of tables that the service role may write to.
const ALLOWED_TABLES = new Set(["raw_events", "interactions", "ai_insights", "embeddings"]);

type TableName = string;

export const supaAdminGuard = {
  // Minimal helpers for guarded writes; extend as needed.
  async insert(table: TableName, values: unknown) {
    if (!ALLOWED_TABLES.has(table)) throw new Error("admin_write_forbidden");
    if (isTest) {
      // In tests, we do not perform real writes; return empty result.
      return [] as unknown[];
    }
    const { data, error } = await _supaAdmin!.from(table).insert(values).select();
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
    return data;
  },
  async upsert(
    table: TableName,
    values: Record<string, unknown> | Array<Record<string, unknown>>,
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) {
    if (!ALLOWED_TABLES.has(table)) throw new Error("admin_write_forbidden");
    if (isTest) {
      // In tests, no-op and return empty result
      return [] as unknown[];
    }
    const upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};
    if (options?.onConflict) upsertOptions.onConflict = options.onConflict;
    if (options?.ignoreDuplicates !== undefined)
      upsertOptions.ignoreDuplicates = options.ignoreDuplicates;

    const { data, error } = await _supaAdmin!
      .from(table)
      .upsert(values as Record<string, unknown> | Array<Record<string, unknown>>, upsertOptions)
      .select();
    if (error) {
      log.warn(
        {
          op: "supa_admin_upsert",
          table,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
        "admin_upsert_failed",
      );
      throw new Error("admin_upsert_failed");
    }
    return data;
  },
  async update(table: TableName, match: Record<string, unknown>, values: unknown) {
    if (!ALLOWED_TABLES.has(table)) throw new Error("admin_write_forbidden");
    if (isTest) {
      // In tests, no-op and return empty result
      return [] as unknown[];
    }
    const { data, error } = await _supaAdmin!.from(table).update(values).match(match).select();
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
    return data;
  },
};
