# Database Doctrine

OmniCRM DB Rules

## Cheat sheet

- Manual SQL
  - Edit `supabase/sql/*.sql` → run in Supabase SQL editor
  - Never `pnpm db:push`

### Version your SQL (RLS & extensions)

- Save all sql queries ran in the supabase dashboard as files in `/supabase/sql/*.sql`

## Change the DB manually (SQL in Supabase)

### When you alter tables directly in SQL

1. Apply SQL in Supabase.
2. Save query as SQL file in /supabase/sql
3. Re-download the database.types.ts file from supabase
4. Manually update `src/server/db/schema.ts`
5. Commit: sql file, database.types.ts, and schema.ts

```bash
git commit . -m "chore(db): update schema after manual SQL changes"
```

**Never run `drizzle-kit push`**

### CI tips

- For build/test jobs, you only need `DATABASE_URL` to be set if you run db commands. If you don't, skip it.
