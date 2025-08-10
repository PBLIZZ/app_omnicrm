/*
 Derive table dependency order from Drizzle schema (foreign keys) and emit SQL in that order.

 - Parses `src/server/db/schema.introspected.ts` (and `schema.app.ts` if present)
 - Extracts `pgTable("table_name")` declarations and `foreignColumns: [OtherTable.id]` references
 - Builds a dependency graph: current_table depends on referenced_table
 - Topologically sorts tables so referenced tables come first
 - Reads SQL blocks from `supabase/sql/**/*.sql` for each table's CREATE TABLE
 - Emits CREATE TABLE blocks in dependency order
 - Finally emits any ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY statements found

 Usage:
   pnpm tsx scripts/schema/rebuild-from-drizzle.ts > supabase/sql/zz_rebuild.sql
*/

import fs from "node:fs";
import path from "node:path";

type TableDef = {
  varName: string;
  tableName: string;
};

type SchemaParseResult = {
  tables: TableDef[];
  dependencies: Array<{ fromVar: string; toVar: string }>;
};

function readFileIfExists(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function parseDrizzleSchema(source: string): SchemaParseResult {
  const tables: TableDef[] = [];
  const dependencies: Array<{ fromVar: string; toVar: string }> = [];

  // Match: export const <var> = pgTable("<table_name>",
  const tableRegex = /export\s+const\s+(\w+)\s*=\s*pgTable\(\s*"([^"]+)"/g;
  for (const match of source.matchAll(tableRegex)) {
    const varName = match[1];
    const tableName = match[2];
    tables.push({ varName, tableName });
  }

  // For each table block, find foreign references like foreignColumns: [otherTable.id]
  // Heuristic: search for the callback array section after pgTable(..., (table) => [ ... ])
  const blockRegex = /export\s+const\s+(\w+)\s*=\s*pgTable\([^\)]*?\)\s*,\s*\(table\)\s*=>\s*\[([\s\S]*?)\]\s*\)/g;
  for (const blockMatch of source.matchAll(blockRegex)) {
    const fromVar = blockMatch[1];
    const body = blockMatch[2];
    const fkRefRegex = /foreignColumns\s*:\s*\[(\w+)\.[A-Za-z0-9_]+\]/g;
    for (const ref of body.matchAll(fkRefRegex)) {
      const toVar = ref[1];
      // Record dependency only if it looks like a non-builtin var
      dependencies.push({ fromVar, toVar });
    }
  }

  return { tables, dependencies };
}

function topoSort(tables: TableDef[], deps: Array<{ fromVar: string; toVar: string }>): TableDef[] {
  const varToTable = new Map<string, TableDef>();
  for (const t of tables) varToTable.set(t.varName, t);

  const graph = new Map<string, Set<string>>(); // node -> set of deps
  const inDegree = new Map<string, number>();
  for (const t of tables) {
    graph.set(t.varName, new Set());
    inDegree.set(t.varName, 0);
  }

  for (const { fromVar, toVar } of deps) {
    if (!graph.has(fromVar) || !graph.has(toVar)) continue; // ignore external refs like users
    if (!graph.get(fromVar)!.has(toVar)) {
      graph.get(fromVar)!.add(toVar);
      inDegree.set(fromVar, (inDegree.get(fromVar) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [node, deg] of inDegree) if (deg === 0) queue.push(node);

  const orderedVars: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    orderedVars.push(node);
    for (const [other, depsOfOther] of graph) {
      if (depsOfOther.has(node)) {
        depsOfOther.delete(node);
        inDegree.set(other, (inDegree.get(other) || 0) - 1);
        if ((inDegree.get(other) || 0) === 0) queue.push(other);
      }
    }
  }

  // If cycle remains, append remaining nodes arbitrarily
  for (const t of tables) if (!orderedVars.includes(t.varName)) orderedVars.push(t.varName);

  return orderedVars.map((v) => varToTable.get(v)!).filter(Boolean);
}

function findSqlBlocksForTable(tableName: string, sqlDir: string): string[] {
  const entries = fs.readdirSync(sqlDir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && e.name.endsWith(".sql")).map((e) => e.name);
  const results: string[] = [];
  const createRegex = new RegExp(
    `create\\s+table\\s+if\\s+not\\s+exists\\s+(?:public\\.)?${tableName}\\s*\\([\\s\\S]*?\\);`,
    "i",
  );
  for (const f of files) {
    const full = path.join(sqlDir, f);
    const content = fs.readFileSync(full, "utf8");
    const match = content.match(createRegex);
    if (match) results.push(match[0]);
  }
  return results;
}

function collectAllAlterFkStatements(sqlDir: string): string[] {
  const entries = fs.readdirSync(sqlDir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && e.name.endsWith(".sql")).map((e) => e.name);
  const results: string[] = [];
  const alterRegex = /alter\s+table[\s\S]*?foreign\s+key[\s\S]*?;/gi;
  for (const f of files) {
    const content = fs.readFileSync(path.join(sqlDir, f), "utf8");
    for (const m of content.matchAll(alterRegex)) results.push(m[0]);
  }
  return results;
}

function main() {
  const repoRoot = path.resolve(__dirname, "../../");
  const schemaIntro = readFileIfExists(
    path.join(repoRoot, "src/server/db/schema.introspected.ts"),
  );
  const schemaApp = readFileIfExists(path.join(repoRoot, "src/server/db/schema.app.ts"));
  const { tables: introTables, dependencies: introDeps } = parseDrizzleSchema(schemaIntro);
  const { tables: appTables, dependencies: appDeps } = parseDrizzleSchema(schemaApp);

  const tables = [...introTables, ...appTables];
  const deps = [...introDeps, ...appDeps];

  const ordered = topoSort(tables, deps);

  const sqlDir = path.join(repoRoot, "supabase/sql");
  const lines: string[] = [];
  lines.push("-- Auto-generated by scripts/schema/rebuild-from-drizzle.ts");
  lines.push("-- Dependency-ordered CREATE TABLE statements\n");

  for (const t of ordered) {
    const blocks = findSqlBlocksForTable(t.tableName, sqlDir);
    if (blocks.length === 0) {
      lines.push(`-- NOTE: No CREATE TABLE found for ${t.tableName} in supabase/sql`);
      continue;
    }
    // If multiple definitions exist across files, include all (idempotent via IF NOT EXISTS)
    for (const b of blocks) {
      lines.push(b);
      lines.push("");
    }
  }

  lines.push("\n-- Foreign key constraints (if any found)\n");
  for (const alter of collectAllAlterFkStatements(sqlDir)) {
    lines.push(alter);
    lines.push("");
  }

  process.stdout.write(lines.join("\n"));
}

main();


