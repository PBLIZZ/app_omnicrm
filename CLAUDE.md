# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `pnpm dev` - Start Next.js development server
- `pnpm build` - Build the Next.js application
- `pnpm start` - Start production server
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

### Testing

- `pnpm test` - Run Vitest unit tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm e2e` - Run Playwright end-to-end tests

### Recommended Development Flow

Always run these commands before committing:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **ORM**: Drizzle (types only, no migrations)
- **Auth**: Supabase Auth with Google OAuth
- **Styling**: Tailwind CSS with shadcn/ui components
- **Testing**: Vitest (unit) + Playwright (E2E)
- **State Management**: TanStack React Query
- **AI**: OpenRouter integration for LLM features

### Database Philosophy

- **SQL-first**: All schema changes are made directly in Supabase SQL editor
- **Manual migrations**: Save all SQL queries in `/supabase/sql/*.sql` files
- **Drizzle for types only**: Schema is defined in `src/server/db/schema.ts` but NEVER use `drizzle-kit push`
- **RLS everywhere**: All tables have user-based Row Level Security policies

### Project Structure

```bash
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (thin handlers)
│   ├── contacts/          # Contact management pages
│   └── layout.tsx         # Root layout with auth
├── components/            # React components
│   ├── contacts/          # Contact-specific components
│   ├── google/           # Google integration components
│   └── ui/               # shadcn/ui components
├── server/               # Business logic & services
│   ├── ai/               # AI/LLM functionality
│   ├── auth/             # Authentication utilities
│   ├── db/               # Database client & schema
│   ├── google/           # Google APIs integration
│   ├── jobs/             # Background job processing
│   └── sync/             # Data synchronization
└── lib/                  # Shared utilities
```

### Key Architecture Principles

1. **Thin API routes**: All business logic lives in `src/server/` modules
2. **Service boundaries**: Clear separation between API handlers and business logic
3. **User-scoped data**: Every table includes `user_id` for multi-tenancy
4. **Background jobs**: Async processing for AI insights, sync, and embeddings
5. **Type safety**: Strict TypeScript with comprehensive error handling

### Database Schema Key Tables

- `contacts` - Contact management with Gmail sync
- `interactions` - Email, calls, meetings, notes
- `ai_insights` - LLM-generated insights and summaries
- `jobs` - Background job queue system
- `user_integrations` - OAuth tokens (encrypted)
- `embeddings` - Vector embeddings for AI features

### Google Integration

- OAuth flow handles Gmail and Calendar access
- Sync preferences stored in `user_sync_prefs`
- Background jobs process Gmail/Calendar data
- All tokens encrypted with `APP_ENCRYPTION_KEY`

### Environment Variables

Required for development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `APP_ENCRYPTION_KEY` (32-byte base64 preferred)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

Production additionally requires:

- `SUPABASE_SECRET_KEY` (service role key)

### Testing Strategy

- **Unit tests**: Vitest with jsdom for components and utilities
- **API tests**: Test files alongside route handlers
- **E2E tests**: Playwright covering user workflows
- **Coverage**: v8 provider with lcov reports

### AI/LLM Features

- OpenRouter integration for multiple model access
- AI guardrails system for content safety
- Background processing for insights and embeddings
- Usage tracking and quota management

### Security Notes

- CSP nonce handling for secure inline scripts
- CSRF protection on mutating routes
- Rate limiting via middleware
- All secrets encrypted at rest
- Row Level Security on all data access
- The database schema is defined in the @src/server/db/schema.ts file. Reference it any time you need to understand the structure of data stored in the database.
- Never make edits to the @src/server/db/schema.ts file. Instead ask the user to run a sql query in the supabase dashboard and once it has ran sucessfully the user will update the @src/server/db/schema.ts file and let you know. THis is for if you need to edit the database. You should treat the @src/server/db/schema.ts as read only.- we use pnpm

## Pull Request Workflow

When adding commits from a feature branch to main, follow this process:

1. **Create feature branch from main**: `git checkout -b feature-name`
2. **Apply commits to feature branch**: Use `git cherry-pick` or apply changes directly
3. **Push feature branch**: `git push -u origin feature-name`
4. **Create PR**: Use `gh pr create` against main branch
5. **Wait for CI tests**: Let GitHub Actions run typecheck, lint, tests, and build
6. **Review and merge**: Only merge after all CI checks pass

**NEVER commit directly to main branch.** Always use the PR process to ensure CI validation.

## Testing Environment

- E2E tests require `.env.local` to be configured with `DATABASE_URL` and `FEATURE_GOOGLE_*` flags
- Use `pnpm e2e` (auto-loads .env.local) or `./scripts/test-e2e.sh` for e2e tests
- Some e2e tests require actual Google OAuth authentication and may skip if not available
- Run `pnpm test` for unit tests, `pnpm e2e` for e2e tests

### OAuth Authentication for E2E Tests

The skipped e2e test requires both Supabase authentication AND Google OAuth tokens.

**Automated setup (recommended):**

1. Add real Google OAuth tokens to `.env.local`:

   ```
   E2E_GOOGLE_ACCESS_TOKEN=your_actual_access_token
   E2E_GOOGLE_REFRESH_TOKEN=your_actual_refresh_token
   ```

2. Run setup: `pnpm e2e:setup` (creates test user + OAuth tokens)
3. Run tests: `pnpm e2e` or `pnpm e2e:full` (setup + tests)

**Manual setup:**

- Run `pnpm dev`, sign in at `/login`, complete OAuth at `/settings/sync`
- Test user: `test-e2e@example.com` / `test-e2e-password-123`

- Never use `any`

- it might take you some effort and time to fix the lint errors properly but when we come sacross issues we need to resolve the underlying cause. It is not acceptable to put a comment, change the config file, add to ignore list, use underscore, or any other short term fix. Do Not Accrue Technical Debt.

- using as avoids typescript rules and is not permitted
- COnsole logs should be replaced with toast if the message is for the user and logged to log.txt Rule Number One is not to create technical debt. Do not leave comments in the code fo routstanding work instead raise an issuie and post it to the project board on github.
- ensure separation of concerns and prefer composable components to monolithic ones and incorporate error boundaries throughout the codebase
- use pnpm to dev build test etc
