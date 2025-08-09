// Tell TS we're in a test environment without adding global types to typecheck
// Vitest will provide globals at runtime.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("DATABASE_DOCTRINE compliance", () => {
  const repoRoot = path.resolve(__dirname, "../../../../");

  it("drizzle.config.ts uses schema.app.ts and outputs to drizzle_app/", () => {
    const cfgPath = path.join(repoRoot, "drizzle.config.ts");
    const contents = fs.readFileSync(cfgPath, "utf8");
    expect(contents).toMatch(/schema:\s*"\.\/src\/server\/db\/schema\.app\.ts"/);
    expect(contents).toMatch(/out:\s*"\.\/drizzle_app"/);
  });

  it("schema barrel re-exports introspected and app", () => {
    const barrelPath = path.join(repoRoot, "src/server/db/schema.ts");
    const contents = fs.readFileSync(barrelPath, "utf8");
    expect(contents).toMatch(/export \* from "\.\/schema\.introspected"/);
    expect(contents).toMatch(/export \* from "\.\/schema\.app"/);
  });

  it("package.json has db scripts set up correctly", () => {
    const pkgPath = path.join(repoRoot, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    expect(pkg.scripts["db:introspect"]).toBe("drizzle-kit introspect");
    expect(pkg.scripts["db:sync"]).toContain(
      "cp drizzle_app/schema.ts src/server/db/schema.introspected.ts",
    );
    expect(pkg.scripts["db:sync"]).toContain(
      "cp drizzle_app/relations.ts src/server/db/relations.introspected.ts",
    );
    expect(pkg.scripts["db:gen"]).toBe("drizzle-kit generate");
    expect(pkg.scripts["db:push"]).toBe("drizzle-kit push");
  });

  it(".eslintignore ignores archived drizzle outputs", () => {
    const ignorePath = path.join(repoRoot, ".eslintignore");
    const contents = fs.readFileSync(ignorePath, "utf8");
    expect(contents).toMatch(/^drizzle\/\*\*/m);
    expect(contents).toMatch(/^drizzle_app\/\*\*/m);
  });

  it("jobs table has RLS policies declared in SQL", () => {
    const sqlPath = path.join(repoRoot, "supabase/sql/02_rls_core_tables.sql");
    const contents = fs.readFileSync(sqlPath, "utf8");
    expect(contents).toMatch(/alter table public\.jobs enable row level security/i);
    expect(contents).toMatch(/create policy jobs_select_own/i);
    expect(contents).toMatch(/create policy jobs_insert_own/i);
    expect(contents).toMatch(/create policy jobs_update_own/i);
    expect(contents).toMatch(/create policy jobs_delete_own/i);
  });

  it("vector extension and embedding index exist", () => {
    const sqlPath = path.join(repoRoot, "supabase/sql/01_extensions_and_vector.sql");
    const contents = fs.readFileSync(sqlPath, "utf8");
    expect(contents).toMatch(/create extension if not exists vector/i);
    expect(contents).toMatch(/add column if not exists embedding vector\(1536\)/i);
    expect(contents).toMatch(/create index if not exists embeddings_vec_idx/i);
  });

  it("introspected schema contains auth.users reference (either mapped or direct)", () => {
    const schemaIntroPath = path.join(repoRoot, "src/server/db/schema.introspected.ts");
    const contents = fs.readFileSync(schemaIntroPath, "utf8");
    // Accept either explicit auth schema mapping or a direct reference produced by introspection
    const hasAuthSchema =
      /pgSchema\("auth"\)/.test(contents) && /auth\.table\("users"\)/.test(contents);
    const hasDirectUsersRef = /foreignColumns:\s*\[users\.id\]/.test(contents);
    expect(hasAuthSchema || hasDirectUsersRef).toBe(true);
  });

  it("drizzle_app migrations do not drop core tables (if present)", () => {
    const migDir = path.join(repoRoot, "drizzle_app");
    if (!fs.existsSync(migDir)) return; // allow passing when no migrations generated yet
    const coreTables = [
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
    const files = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql"));
    for (const file of files) {
      const contents = fs.readFileSync(path.join(migDir, file), "utf8");
      for (const t of coreTables) {
        expect(contents).not.toMatch(new RegExp(`DROP\\s+TABLE[\n\r\s]+.*${t}`, "i"));
      }
    }
  });
});
