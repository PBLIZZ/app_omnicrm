import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { ensureError } from "@/lib/utils/error-handler";

// Strong typing for information_schema.columns rows
type ColumnInfoRow = {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
};

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "debug_check_schema" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("debug.check_schema", requestId);
  try {
    const db = await getDb();

    // Check if raw_events table has source_id column
    const columns = (await db.execute(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'raw_events'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `)) as unknown as ColumnInfoRow[];

    // Check if source_id column exists
    const hasSourceId = columns.some((col) => col.column_name === "source_id");

    return api.success({
      tableExists: true,
      columns,
      hasSourceId,
      needsMigration: !hasSourceId,
      userId,
    });
  } catch (error) {
    return api.error("Failed to check schema", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "debug_apply_migration" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("debug.apply_migration", requestId);
  try {
    const db = await getDb();

    // Apply the missing migration
    await db.execute(`
      ALTER TABLE public.raw_events
      ADD COLUMN IF NOT EXISTS source_id TEXT;
    `);

    // Verify the migration worked
    const columns = (await db.execute(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'raw_events'
      AND table_schema = 'public'
      AND column_name = 'source_id';
    `)) as unknown as ColumnInfoRow[];

    return api.success({
      success: true,
      message: "Migration applied successfully",
      sourceIdColumn: columns[0] ?? null,
      userId,
    });
  } catch (error) {
    return api.error(
      `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
