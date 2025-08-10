/*
 Custom migration runner for applying generated SQL from drizzle/*.sql
 - Rejects any DROP TABLE unless ALLOW_DESTRUCTIVE=true is provided in env
 - Applies statements sequentially and logs each statement
*/

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

type DatabaseConfig = {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
};

function getDatabaseConfig(): DatabaseConfig {
  // Prefer DATABASE_URL if present; fall back to individual env vars
  const { DATABASE_URL } = process.env;
  if (DATABASE_URL && DATABASE_URL.trim().length > 0) {
    return { connectionString: DATABASE_URL };
  }
  const host = process.env.PGHOST;
  const port = process.env.PGPORT ? Number(process.env.PGPORT) : undefined;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;
  return { host, port, user, password, database };
}

function isLocalDatabase(cfg: DatabaseConfig): boolean {
  // Heuristics: localhost, 127.0.0.1, ::1, or docker-style host.docker.internal
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "host.docker.internal"]);
  if (cfg.connectionString) {
    try {
      const url = new URL(cfg.connectionString);
      return localHosts.has(url.hostname) || url.hostname.endsWith(".local");
    } catch {
      return false;
    }
  }
  if (!cfg.host) return false;
  return localHosts.has(cfg.host) || cfg.host.endsWith(".local");
}

function readGeneratedSqlFiles(dir: string): Array<{ file: string; sql: string }> {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.map((file) => ({ file, sql: fs.readFileSync(path.join(dir, file), "utf8") }));
}

function explodeSqlStatements(sql: string): string[] {
  // Very conservative split on semicolons that end a line; ignores semicolons inside single quotes
  const statements: string[] = [];
  let current = "";
  let inSingle = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const prev = i > 0 ? sql[i - 1] : "";
    if (ch === "'" && prev !== "\\") {
      inSingle = !inSingle;
    }
    if (ch === ";" && !inSingle) {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = "";
    } else {
      current += ch;
    }
  }
  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}

function assertNoForbiddenDrops(sql: string) {
  const allowDestructive = process.env.ALLOW_DESTRUCTIVE === "true";
  if (allowDestructive) return;
  const dropTableRegex = /\bDROP\s+TABLE\b/i;
  const dropColumnRegex = /\bALTER\s+TABLE[\s\S]*?\bDROP\s+COLUMN\b/i;
  if (dropTableRegex.test(sql) || dropColumnRegex.test(sql)) {
    throw new Error(
      "Refusing to run destructive SQL (DROP). Set ALLOW_DESTRUCTIVE=true to override. Statement: " + sql,
    );
  }
}

async function run() {
  const cfg = getDatabaseConfig();

  // Guard: only allow local DBs by default
  const allowRemote = process.env.ALLOW_REMOTE_DB === "true";
  if (!isLocalDatabase(cfg) && !allowRemote) {
    throw new Error(
      "Refusing to run migrations on a non-local database. Set ALLOW_REMOTE_DB=true to override.",
    );
  }

  const drizzleDir = path.resolve(process.cwd(), "drizzle");
  const files = readGeneratedSqlFiles(drizzleDir);
  if (files.length === 0) {
    console.log("No generated migrations found in ./drizzle");
    return;
  }

  const client = new Client(cfg.connectionString ? { connectionString: cfg.connectionString } : cfg);
  await client.connect();
  try {
    for (const { file, sql } of files) {
      console.log(`Applying file: ${file}`);
      const statements = explodeSqlStatements(sql);
      for (const stmt of statements) {
        assertNoForbiddenDrops(stmt);
        console.log("SQL>", stmt);
        await client.query(stmt);
      }
    }
    console.log("Migration complete.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});


