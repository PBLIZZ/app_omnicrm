import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { err, ok } from "@/lib/api/http";

// Strong typing for information_schema.columns rows
type ColumnInfoRow = {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
};

export async function GET(): Promise<Response> {
  try {
    const userId = await getServerUserId();
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

    return ok({
      tableExists: true,
      columns,
      hasSourceId,
      needsMigration: !hasSourceId,
      userId,
    });
  } catch (error) {
    console.error("Schema check error:", error);
    return err(500, "Failed to check schema");
  }
}

export async function POST(): Promise<Response> {
  try {
    const userId = await getServerUserId();
    const db = await getDb();

    // Apply the missing migration
    // console.log("Applying source_id column migration...");

    await db.execute(`
      ALTER TABLE public.raw_events
      ADD COLUMN IF NOT EXISTS source_id TEXT;
    `);

    // console.log("Migration applied successfully");

    // Verify the migration worked
    const columns = (await db.execute(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'raw_events'
      AND table_schema = 'public'
      AND column_name = 'source_id';
    `)) as unknown as ColumnInfoRow[];

    return ok({
      success: true,
      message: "Migration applied successfully",
      sourceIdColumn: columns[0] ?? null,
      userId,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return err(
      500,
      `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
