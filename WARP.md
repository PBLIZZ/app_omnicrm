# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Essential Development Commands

### Core Development
- `pnpm dev` - Start Next.js development server on port 3000
- `pnpm build` - Build the Next.js application
- `pnpm start` - Start production server
- `pnpm typecheck` - Run TypeScript type checking (uses tsconfig.build.json)

### Code Quality
- `pnpm lint` - Run ESLint with caching (preferred linting command)
- `pnpm lint:fix` - Auto-fix linting issues in src/
- `pnpm lint:strict` - Production-grade strict linting with zero tolerance
- `pnpm format` - Format code with Prettier

### Testing
- `pnpm test` - Run Vitest unit tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm e2e` - Run Playwright end-to-end tests (requires .env.local)
- `pnpm e2e:setup` - Set up E2E authentication
- `pnpm e2e:full` - Run setup + E2E tests

### Database Management
- `pnpm supabase:types` - Generate TypeScript types from Supabase database
- `pnpm types:local` - Generate types from local Supabase instance
- `npx drizzle-kit pull` - Pull current database schema to schema.ts (RECOMMENDED)
- `npx drizzle-kit generate` - Generate migration files
- `npx drizzle-kit migrate` - Apply migrations to database
- `npx drizzle-kit studio` - Launch Drizzle Studio

### CI Commands
- `pnpm ci:typecheck` - Build types + typecheck
- `pnpm ci:architecture` - Run architecture validation scripts
- `pnpm ci:full` - Complete CI validation (typecheck, lint, test, architecture)

## Project Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19
- **Backend**: Next.js API routes, Supabase (PostgreSQL + Auth)
- **Database**: Drizzle ORM with Supabase PostgreSQL
- **Styling**: Tailwind CSS v4 (config-lite) + shadcn/ui components
- **State Management**: TanStack React Query
- **Testing**: Vitest (unit) + Playwright (E2E) + React Testing Library
- **AI Integration**: OpenAI, Anthropic, OpenRouter for LLM features
- **Package Manager**: pnpm with workspace support

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (authorisedRoute)/  # Protected routes (dashboard, contacts, etc.)
│   ├── (auth)/            # Public auth routes
│   └── api/               # API endpoints (thin handlers)
├── components/            # React components (UI + business logic)
│   ├── ui/               # shadcn/ui base components
│   └── [feature]/        # Feature-specific components
├── server/               # Business logic & services
│   ├── ai/               # AI/LLM functionality
│   ├── auth/             # Authentication utilities
│   ├── db/               # Database schema & client
│   ├── google/           # Google APIs integration
│   ├── jobs/             # Background job processing
│   └── services/         # Business logic services
├── lib/                  # Shared utilities & configuration
│   ├── api/              # API client utilities
│   ├── queries/          # TanStack Query hooks
│   └── validation/       # Zod schemas
└── hooks/                # Custom React hooks

packages/
├── testing/             # Shared testing utilities
└── repo/                # Repository layer abstractions
```

### Key Architecture Patterns

#### Database Connection Pattern (CRITICAL)
Always use the async `getDb()` pattern for database connections:

```typescript
// ✅ Correct Pattern
import { getDb } from "@/server/db/client";

export async function someStorageMethod() {
  const db = await getDb();
  return await db.select().from(table).where(condition);
}

// ❌ Broken Pattern (causes runtime errors)
import { db } from "@/server/db";
const contacts = await db.select().from(contactsTable); // Error: .from is not a function
```

#### API Layer Pattern
All HTTP calls use centralized utilities with automatic CSRF protection:

```typescript
// ✅ Proper API calls with automatic CSRF handling
import { fetchPost } from "@/lib/api";
const data = await fetchPost<ResponseType>("/api/endpoint", payload);

// ❌ Raw fetch (missing CSRF tokens, will fail with 403)
const response = await fetch("/api/endpoint", {
  method: "POST",
  body: JSON.stringify(payload),
});
```

#### TypeScript Safety (Zero Tolerance Policy)
- **Never use `any`** - Always provide proper TypeScript types
- **Never use non-null assertions (`!`)** - Use explicit null checks
- **Never use type assertions (`as`)** - Implement proper type guards
- **Never use ESLint disables** - Fix the underlying issue

## Database Management

### Database-First Workflow
1. **Make schema changes in Supabase SQL editor first**
2. **Save all SQL in `/supabase/sql/*.sql` files**
3. **Run `npx drizzle-kit pull`** to update `src/server/db/schema.ts`
4. **Commit both SQL file and schema.ts changes**

### Critical Rules
- **NEVER use `drizzle-kit push`** - Always use the migration workflow
- **Manual SQL for**: RLS policies, extensions, complex indexes
- **Drizzle for**: Simple table/column additions when schema is synchronized
- **Keep `schema.ts` as source of truth** for TypeScript types

### Key Database Tables
- `contacts` - Contact management with lifecycle stages and AI insights
- `ai_insights` - LLM-generated insights and summaries
- `calendar_events` - Google Calendar sync with attendee extraction
- `jobs` - Background job queue system
- `user_integrations` - Encrypted OAuth tokens
- `notes` - Unified notes system (replaces deprecated contacts.notes)

## Code Quality Standards

### Linting & Formatting
- Use `pnpm lint` (preferred command per user rules)
- ESLint configured with strict TypeScript rules
- Prettier with consistent formatting
- Husky pre-commit hooks enforce quality

### Critical TypeScript Rules
- `@typescript-eslint/no-explicit-any` - No any types
- `@typescript-eslint/no-floating-promises` - Handle all promises
- `@typescript-eslint/consistent-type-imports` - Consistent import style
- `noUncheckedIndexedAccess` - Safe array/object access
- `exactOptionalPropertyTypes` - Strict optional properties

### Tailwind CSS v4 Usage
- Config-lite approach (no traditional config file)
- Uses `@theme inline` in CSS for design tokens
- Breaking changes from v3 - read migration notes before modifying styles
- Custom wellness color palette (emerald, amber, teal scales)

## Testing Strategy

### Unit Testing (Vitest)
- Located in `src/**/*.test.ts` files
- jsdom environment for component testing
- React Testing Library for component tests
- Global test setup in `vitest.setup.ts`

### E2E Testing (Playwright)
- Tests in `e2e/` directory
- Requires `.env.local` configuration
- Automated OAuth setup via `pnpm e2e:setup`
- Test user: `test-e2e@example.com` / `test-e2e-password-123`

### Running Tests
```bash
# Unit tests
pnpm test                    # Run once
pnpm test:watch             # Watch mode

# E2E tests
pnpm e2e:setup              # Setup auth tokens
pnpm e2e                    # Run E2E tests
pnpm e2e:full               # Setup + run tests
```

## AI/LLM Integration

### AI Features
- **OpenAI GPT-5** for contact insights and enrichment
- **Anthropic** for chat functionality
- **OpenRouter** for multiple model access
- **36 Wellness Tags** for comprehensive contact categorization
- **7 Client Lifecycle Stages** for progression tracking

### AI Architecture
- Background job processing for insights and embeddings
- Confidence scoring (0.0-1.0) for AI-generated insights
- Usage tracking and quota management
- AI guardrails system for content safety

## Security & Environment

### Required Environment Variables
```bash
# Core
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
DATABASE_URL=

# Encryption
APP_ENCRYPTION_KEY=                    # 32-byte base64 key

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Production only
SUPABASE_SECRET_KEY=                   # Service role key
```

### Security Features
- Row Level Security (RLS) on all tables
- AES-256-GCM encryption for sensitive data
- CSRF protection via middleware
- Rate limiting on API endpoints
- Encrypted OAuth tokens at rest

## Background Jobs System

### Job Types
- `normalize` - Data normalization
- `embed` - Vector embeddings generation
- `insight` - AI insights generation  
- `sync_gmail` / `sync_calendar` - External API synchronization

### Job Management
- Database-backed job queue in `jobs` table
- Configurable retry logic with exponential backoff
- Job status tracking and monitoring
- Batch processing capabilities

## Development Workflow

### Pre-commit Checklist
```bash
pnpm typecheck && pnpm lint && pnpm test
```

### Pull Request Process
1. Create feature branch from main
2. Make changes and commit
3. Push branch and create PR
4. Wait for CI validation (typecheck, lint, test, build)
5. Review and merge after all checks pass

**NEVER commit directly to main branch** - always use PR process.

## Common Patterns

### React Query Integration
```typescript
const createContactMutation = useMutation({
  mutationFn: (data) => fetchPost("/api/contacts", data),
  onSuccess: () => queryClient.invalidateQueries(["/api/contacts"]),
  onError: (error) => toast.error("Failed: " + error.message)
});
```

### Zod Validation
```typescript
// Define schema
const ContactSchema = z.object({
  displayName: z.string().min(1),
  primaryEmail: z.string().email().optional(),
});

// Infer types
type Contact = z.infer<typeof ContactSchema>;
```

### Error Handling
- Toast notifications for user-facing errors
- Console logging for debugging
- Error boundaries for UI resilience
- Structured error responses via OkEnvelope pattern

## Troubleshooting

### Common Issues
1. **Missing columns in tables**: Clear localStorage cache for table visibility settings
2. **Database connection errors**: Ensure using `getDb()` pattern, not `db` import
3. **CSRF failures**: Use `fetchPost()/fetchGet()` utilities, not raw fetch
4. **Type errors**: Run `pnpm supabase:types` to update database types

### Performance
- Use React Query for server state caching
- Implement optimistic updates for better UX
- Background jobs for heavy AI processing
- Proper indexing on database queries
