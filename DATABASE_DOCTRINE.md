# OmniCRM DB Rules (Supabase + Drizzle)

## Cheat sheet

- Manual SQL (RLS/vector/one-offs)
  - Edit `supabase/sql/*.sql` → run in Supabase SQL editor → `pnpm db:sync`
  - Never `pnpm db:push` until re-introspect shows "No schema changes".

- App schema (new app tables/columns/indexes)
  - Edit `src/server/db/schema.app.ts` → `pnpm db:gen && pnpm db:push`

- Quick verify
  - `pnpm db:gen` should say "No schema changes." when you didn’t touch `schema.app.ts`.
  - `drizzle.config.ts` must point to `schema.app.ts` and `out: "./drizzle_app"`.

- Bootstrap/repair order (run in Supabase SQL editor)
  1. `supabase/sql/00_core_tables.sql`
  2. `supabase/sql/00_chat_tables.sql`
  3. `supabase/sql/01b_add_user_tenant_columns.sql`
  4. `supabase/sql/01_extensions_and_vector.sql`
  5. `supabase/sql/02_rls_core_tables.sql`
  6. `supabase/sql/03_rls_ai_tables.sql`
  7. `supabase/sql/04_rls_chat_tables.sql`
  8. `supabase/sql/05_guardrails.sql`
  9. `supabase/sql/99_cleanup_drop_jacuzzi_models.sql`

## 0) Folder layout (source of truth separation)

```bash
/src/server/db/
  schema.introspected.ts   # GENERATED from live DB (do not hand-edit)
  schema.app.ts            # Your NEW tables/columns/indexes (Drizzle-managed)
  schema.ts                # Barrel: exports from both
/supabase/sql/
  00_core_tables.sql       # base app tables (idempotent)
  00_chat_tables.sql       # threads/messages/tool_invocations (idempotent)
  01b_add_user_tenant_columns.sql  # add user_id + indexes across core tables
  01_extensions_and_vector.sql     # vector extension + embedding column + vector index
  02_rls_core_tables.sql   # RLS + policies for contacts/interactions/raw_events/documents/jobs
  03_rls_ai_tables.sql     # RLS (read-only) for embeddings/ai_insights
  04_rls_chat_tables.sql   # RLS for threads/messages/tool_invocations
  05_guardrails.sql        # ai_quotas + ai_usage + policies
  99_cleanup_drop_jacuzzi_models.sql  # cleanup for any test tables
 /drizzle_app/              # ⬅︎ migrations folder (code → DB)
```

## 1) Drizzle config (final form)

**drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Migrations created here (clean slate)
  out: "./drizzle_app",
  // ONLY app-managed schema participates in migrations
  schema: "./src/server/db/schema.app.ts",
  dialect: "postgresql",
  dbCredentials: {
    // Use your working pooled/public connection (6543)
    url: process.env.DATABASE_URL!,
  },
  strict: true,
});
```

## 2) One-time setup (you already did most of this)

### Introspect live DB → code

```bash
pnpm drizzle-kit introspect
cp drizzle_app/schema.ts src/server/db/schema.introspected.ts
cp drizzle_app/relations.ts src/server/db/relations.introspected.ts
```

### Create app schema + barrel

```bash
printf '' > src/server/db/schema.app.ts
```

**src/server/db/schema.ts**

```typescript
export * from "./schema.introspected";
export * from "./schema.app";
```

### Version your SQL (RLS & extensions)

- Put all pgvector + RLS/policies in `/supabase/sql/*.sql`
- Apply these in the Supabase SQL editor (do NOT expect Drizzle to manage them).

### Verify clean state

```bash
pnpm drizzle-kit generate
```

**Expect: "No schema changes."**

### Apply SQL in Supabase (one-time bootstrap order)

Run these in the Supabase SQL editor in this order when bootstrapping or repairing a DB:

1. `supabase/sql/00_core_tables.sql`
2. `supabase/sql/00_chat_tables.sql`
3. `supabase/sql/01b_add_user_tenant_columns.sql`
4. `supabase/sql/01_extensions_and_vector.sql`
5. `supabase/sql/02_rls_core_tables.sql`
6. `supabase/sql/03_rls_ai_tables.sql`
7. `supabase/sql/04_rls_chat_tables.sql`
8. `supabase/sql/05_guardrails.sql`
9. `supabase/sql/99_cleanup_drop_jacuzzi_models.sql`

## 3) Daily workflow — choose A or B (never both at once)

### A) You changed the DB manually (SQL in Supabase)

Use this path when you alter tables directly in SQL (e.g., emergency hotfix, admin tweak).

1. Apply SQL in Supabase.
2. Pull DB → code
   ```bash
   pnpm drizzle-kit introspect
   cp drizzle_app/schema.ts src/server/db/schema.introspected.ts
   cp drizzle_app/relations.ts src/server/db/relations.introspected.ts
   ```
3. Commit:
   ```
   chore(db): re-introspect baseline after manual SQL changes
   ```

**Never run `drizzle-kit push` after manual SQL until you re-introspect and see "No schema changes".**

### B) You want Drizzle to add tables/columns/indexes

Use this path for planned app changes.

1. Edit `src/server/db/schema.app.ts` only (add new tables/columns/indexes).
2. Create and apply migration:
   ```bash
   pnpm drizzle-kit generate
   pnpm drizzle-kit push
   ```
3. Commit:
   ```
   feat(db): add <thing> via Drizzle migration
   ```

**Do not touch `schema.introspected.ts` by hand. It remains your baseline mirror of the live DB.**

## 4) RLS & extensions (always SQL, never Drizzle)

- Keep all RLS policies and `create extension vector` (and vector indexes) in `/supabase/sql/*.sql`.
- Apply via the Supabase dashboard SQL editor (or a one-off script).
- Commit those `.sql` files so you have an audit trail.
- If you later change table structure manually through SQL → re-introspect.

## 5) Safety rails (prevent "DROP EVERYTHING")

- **Migrations folder reset**: If Drizzle ever generates a migration that tries to drop baseline tables, delete that migration immediately and move to a clean folder (you're using `drizzle_app/` now — good).
- **Never point schema to `schema.ts` in `drizzle.config.ts`**. It must point to `schema.app.ts` only.
- **PR rule**: Never merge a migration that contains `DROP TABLE` on core tables.

## 6) NPM scripts (quality-of-life)

**package.json**

```json
{
  "scripts": {
    "db:introspect": "drizzle-kit introspect",
    "db:sync": "pnpm db:introspect && cp drizzle_app/schema.ts src/server/db/schema.introspected.ts && cp drizzle_app/relations.ts src/server/db/relations.introspected.ts",
    "db:gen": "drizzle-kit generate",
    "db:push": "drizzle-kit push"
  }
}
```

Also note: `.eslintignore` excludes `drizzle_app/**` to keep lint noise down.

## 7) CI tips

- For build/test jobs, you only need `DATABASE_URL` to be set if you run db commands. If you don't, skip it.
- If you do run migrations in CI (optional), use a dev DB and never your prod Supabase project.

## 8) Naming & conventions

- **Tables**: `snake_case` in DB; Drizzle field names can be `camelCase` mapped to `snake_case`.
- **Indexes**: stable names, e.g., `interactions_contact_timeline_idx`.
- **UUID PKs**: `gen_random_uuid()` default; `created_at`/`updated_at` timestamps.
- **Tenant column**: `user_id uuid not null references auth.users(id)` + index on every tenant-scoped table.

## 9) Quick troubleshooting

- **Drizzle wants to drop columns you created in SQL?** → Re-introspect and copy over the new schema file.
- **Vector column shows USER-DEFINED in dump?** → Keep it managed in SQL; don't model it in Drizzle (or use a custom type if you must).
- **Policies missing "IF NOT EXISTS"?** → Use `DROP POLICY IF EXISTS …; CREATE POLICY …` or a `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN END; $$;` block.

## 10) Example: adding a new table safely

**src/server/db/schema.app.ts**

```typescript
import { pgTable, uuid, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const dev_markers = pgTable("dev_markers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  label: text("label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

Then:

```bash
pnpm db:gen && pnpm db:push
```

**That's the whole system.**

Follow this and you'll never fight Drizzle again — and your Supabase RLS/vector setup remains safe and versioned. When you're ready, we can jump back to guardrails or Google OAuth next.
