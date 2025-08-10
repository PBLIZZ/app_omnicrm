/*
 Simple DB sanity check: verifies presence of expected core tables.
*/
import { Client } from "pg";

const EXPECTED_TABLES = [
  "contacts",
  "interactions",
  "raw_events",
  "documents",
  "embeddings",
  "ai_insights",
  "jobs",
  "threads",
  "messages",
  "tool_invocations",
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client(
    connectionString ? { connectionString } : undefined,
  );
  await client.connect();
  try {
    const res = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const names = new Set(res.rows.map((r) => r.table_name));
    const missing = EXPECTED_TABLES.filter((t) => !names.has(t));
    if (missing.length > 0) {
      throw new Error(
        `Missing expected tables: ${missing.join(", ")}. Run migrations or check your schema.`,
      );
    }
    console.log("DB check passed.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});


