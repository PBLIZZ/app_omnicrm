# OmniCRM DB Rules (Supabase + Drizzle)

## Cheat sheet

- Manual SQL (RLS/vector/one-offs)
  - Edit `supabase/sql/*.sql` → run in Supabase SQL editor
  - Never `pnpm db:push`

### Version your SQL (RLS & extensions)

- Save all sql queries ran in the supabase dashboard as files in `/supabase/sql/*.sql`

## Change the DB manually (SQL in Supabase)

### When you alter tables directly in SQL

1. Apply SQL in Supabase.
2. Save query as SQL file in /supabase/sql
3. MAnually update `src/server/db/schema.ts`
4. Commit: both the sql file and schema.ts

```bash
chore(db): update schema after manual SQL changes
```

**Never run `drizzle-kit push`**

### RLS & extensions (always SQL, never Drizzle)

- Keep all RLS policies and `create extension vector` (and vector indexes) in `/supabase/sql/*.sql`.
- Apply via the Supabase dashboard SQL editor (or a one-off script).
- Commit those `.sql` files so you have an audit trail.
- If you later change table structure manually through SQL → update `src/server/db/schema.ts`

### CI tips

- For build/test jobs, you only need `DATABASE_URL` to be set if you run db commands. If you don't, skip it.

### Naming & conventions

- **Tables**: `snake_case` in DB; Drizzle field names can be `camelCase` mapped to `snake_case`.
- **Indexes**: stable names, e.g., `interactions_contact_timeline_idx`.
- **UUID PKs**: `gen_random_uuid()` default; `created_at`/`updated_at` timestamps.
- **Tenant column**: `user_id uuid not null references auth.users(id)` + index on every tenant-scoped table.

**That's the whole system.**

Follow this and you'll never fight Drizzle again — and your Supabase RLS/vector setup remains safe and versioned. When you're ready, we can jump back to guardrails or Google OAuth next.
