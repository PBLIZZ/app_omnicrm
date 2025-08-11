// Service-role client for RLS-bypassing writes (raw_events, embeddings, ai_insights).
import { createClient } from "@supabase/supabase-js";

const isTest = process.env.NODE_ENV === "test";

// Bare admin client (RLS bypass). In tests, avoid initializing a real client.
const _supaAdmin = isTest
  ? null
  : createClient(process.env["NEXT_PUBLIC_SUPABASE_URL"]!, process.env["SUPABASE_SECRET_KEY"]!, {
      auth: { persistSession: false },
    });

// Allow-list of tables that the service role may write to.
const ALLOWED_TABLES = new Set(["raw_events", "interactions", "ai_insights", "embeddings"]);

type TableName = string;

export const supaAdminGuard = {
  // Minimal helpers for guarded writes; extend as needed.
  async insert(table: TableName, values: unknown) {
    if (!ALLOWED_TABLES.has(table)) throw new Error("admin_write_forbidden");
    if (isTest) return [] as unknown[];
    const { data, error } = await _supaAdmin!.from(table).insert(values).select();
    if (error) throw new Error("admin_insert_failed");
    return data;
  },
  async upsert(
    table: TableName,
    values: Record<string, unknown> | Array<Record<string, unknown>>,
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) {
    if (!ALLOWED_TABLES.has(table)) throw new Error("admin_write_forbidden");
    if (isTest) return [] as unknown[];
    const upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};
    if (options?.onConflict) upsertOptions.onConflict = options.onConflict;
    if (options?.ignoreDuplicates !== undefined)
      upsertOptions.ignoreDuplicates = options.ignoreDuplicates;

    const { data, error } = await _supaAdmin!
      .from(table)
      .upsert(values as Record<string, unknown> | Array<Record<string, unknown>>, upsertOptions)
      .select();
    if (error) throw new Error("admin_upsert_failed");
    return data;
  },
  async update(table: TableName, match: Record<string, unknown>, values: unknown) {
    if (!ALLOWED_TABLES.has(table)) throw new Error("admin_write_forbidden");
    if (isTest) return [] as unknown[];
    const { data, error } = await _supaAdmin!.from(table).update(values).match(match).select();
    if (error) throw new Error("admin_update_failed");
    return data;
  },
};
