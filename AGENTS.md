# Repository Guidelines

## Architecture Patterns (October 2025)

**Complete reference**: See `docs/REFACTORING_PATTERNS_OCT_2025.md` for detailed patterns.

### Layered Architecture

- **Repository Layer** (`packages/repo/src/`): Constructor injection with `DbClient`, throws generic `Error`, returns `null` for "not found"
- **Service Layer** (`src/server/services/`): Functional patterns, acquires `DbClient` via `getDb()`, wraps errors as `AppError` with status codes
- **Route Layer** (`src/app/api/`): Uses `handleAuth`, `handleGetWithQueryAuth` from `@/lib/api`
- **OAuth Route Layer** (`src/app/api/google/`): Direct function handlers for OAuth flows with proper redirect handling
- **Business Schemas** (`src/server/db/business-schemas/`): Pure Zod validation, no transforms
- **Database Types** (`src/server/db/schema.ts`): Single source of truth using Drizzle `$inferSelect` and `$inferInsert`

### Deprecated Patterns (DO NOT USE)

- ❌ `DbResult<T>` wrapper - Use direct throws
- ❌ Static repository methods - Use constructor injection
- ❌ Manual `NextRequest`/`NextResponse` - Use standardized handlers
- ❌ Manual `Response.json()` - Use handlers from `@/lib/api`

## Project Structure & Module Organization

- `src/app` hosts Next.js routes and server actions; each folder maps to a route tree.
- `src/components` centralizes reusable UI, with `src/lib` utilities and `src/server` Supabase data access.
- `packages/repo` holds repository classes with constructor injection pattern.
- Tests live in `src/__tests__` for unit coverage and `e2e/` for Playwright; static assets sit in `public/`.
- `scripts/` stores operational tooling (migrations, backfills), and Supabase configuration stays under `supabase/`.

## Build, Test, and Development Commands

- `pnpm dev` starts the Next.js dev server on port 3000 with hot reload.
- `pnpm build` compiles the production bundle; `pnpm start` serves it locally.
- `pnpm typecheck` runs the build TS config; `pnpm lint` enforces ESLint with caching.
- `pnpm test` executes Vitest in run mode; `pnpm test:watch` keeps the watcher alive.
- `pnpm e2e:setup` seeds auth fixtures, while `pnpm e2e` runs Playwright; use `pnpm e2e:full` for setup plus execution.

## Coding Style & Naming Conventions

- TypeScript is mandatory; prefer functional React components, hooks, and explicit prop typing.
- Prettier enforces 100-character lines, double quotes, semicolons, and trailing commas; run `pnpm format` before PRs.
- ESLint (`eslint.config.mjs`) layers Next.js and repo-specific rules; `pnpm lint:fix` handles minor cleanups.
- Name React components and files with PascalCase, hooks with `use*`, and server modules with descriptive kebab-case folders.

## Testing Guidelines

- Unit and integration specs use Vitest with a JSDOM environment; name files `*.test.ts` or `*.test.tsx`.
- `pnpm test` produces V8 coverage in `coverage/`; keep failure snapshots current before pushing.
- UI flow tests live in `e2e/`; run `pnpm e2e:full` (setup + run) before merging customer-facing changes.

## Commit & Pull Request Guidelines

- Commit messages must follow Conventional Commits; commitlint blocks merges on invalid types or scopes.
- Keep each commit focused, include lint and format updates, and rebase feature branches before opening PRs.
- PRs need a clear summary, testing checklist (e.g., `pnpm test`), linked issues, UI evidence when relevant, and an explicit note when Supabase migrations are included.

## Environment & Security Tips

- Copy `.env.example` to `.env.local`, keep secrets out of git, and rotate any leaked keys immediately.
- Use `docker-compose up` for local service parity and avoid editing generated Supabase types directly.
