# Architecture Notes

- SQL-first schema. Drizzle is used for types and query ergonomics only.
- No migrations in-repo; apply SQL manually in Supabase as needed.
- Clear boundaries:
  - `src/app/api`: thin HTTP handlers
  - `src/server`: services, db, integrations, jobs
- Error shape: use `ok()` / `err()` helpers for consistent envelopes.
- Security: RLS in Supabase; CSRF, CORS, rate limiting in `src/middleware.ts`.

See:

- `docs/architecture/service-boundaries.md`
- `docs/api/contracts.md`
