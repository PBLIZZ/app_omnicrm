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

## Layered architecture (current pattern)

- Controllers (routes): minimal HTTP plumbing, auth, validation, mapping to service
  - Examples: `src/app/api/contacts/route.ts`, `src/app/api/chat/route.ts`
- Schemas: Zod validation colocated with the route
  - Example: `src/app/api/contacts/schema.ts`
- Services: business orchestration and invariants
  - Examples: `src/server/services/contacts.service.ts`, `src/server/services/chat.service.ts`
- Repositories: Drizzle queries only, typed I/O
  - Example: `src/server/repositories/contacts.repo.ts`
- Providers: external integrations behind stable interfaces
  - Example: `src/server/providers/openrouter.provider.ts`
- Prompts: prompt builders/constants for AI flows
  - Examples: `src/server/prompts/chat.prompt.ts`, `src/server/prompts/embed.prompt.ts`

Notes:

- API routes should not contain Drizzle queries or business logic.
- Environment is centralized in `src/lib/env.ts` (e.g., AI model names, API keys).
