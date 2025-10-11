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

```bash
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Public auth routes
│   ├── (authorisedRoute)/  # Protected routes (dashboard, contacts, etc.)
│   │    └── Modules/     # Analytics, Connect, Contacts, Reach, Rhythm, Momentum, Settingsetc.
│   └── api/               # API endpoints (thin handlers)
├── components/            # React components (UI + business logic)
│   ├── ui/               # shadcn/ui base components
│   └── [feature]/        # Feature-specific components
├── server/               # Business logic & services
│   ├── ai/               # AI/LLM functionality
│   ├── auth/             # Authentication utilities
│   ├── db/               # Database schema & client
│   │    └── business-schemas/ # Business schemas
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

**See `docs/REFACTORING_PATTERNS_OCT_2025.md` for complete patterns.**

#### Repository Layer Pattern

```typescript
// Constructor injection with DbClient
export class ExampleRepository {
  constructor(private readonly db: DbClient) {}

  async getExample(id: string, userId: string): Promise<Example | null> {
    const rows = await this.db.select()...;
    return rows[0] ?? null; // Returns null for "not found"
  }

  async createExample(data: CreateExample): Promise<Example> {
    const [result] = await this.db.insert().returning();
    if (!result) throw new Error("Insert returned no data"); // Throw generic Error
    return result;
  }
}

// Factory function
export function createExampleRepository(db: DbClient): ExampleRepository {
  return new ExampleRepository(db);
}
```

#### Service Layer Pattern

```typescript
// Functional pattern with getDb() and AppError wrapping
export async function getExampleService(
  userId: string,
  exampleId: string
): Promise<Example | null> {
  const db = await getDb();
  const repo = createExampleRepository(db);

  try {
    return await repo.getExample(exampleId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get example",
      "DB_ERROR",
      "database",
      false,
      500 // Status code
    );
  }
}
```

#### API Route Pattern

```typescript
// Use standardized handlers from @/lib/api
import { handleAuth } from "@/lib/api";
import { ExampleSchema } from "@/server/db/business-schemas";

export const GET = handleAuth(
  z.object({ exampleId: z.string() }),
  ExampleSchema,
  async (data, userId) => {
    const example = await getExampleService(userId, data.exampleId);
    if (!example) {
      throw new AppError("Example not found", "NOT_FOUND", "validation", false, 404);
    }
    return example;
  }
);
```

#### Deprecated Patterns (DO NOT USE)

- ❌ `DbResult<T>` wrapper - Use direct throws
- ❌ Static repository methods - Use constructor injection
- ❌ Manual `NextRequest`/`NextResponse` - Use standardized handlers
- ❌ Manual `Response.json()` - Use handlers from `@/lib/api`

#### TypeScript Safety (Zero Tolerance Policy)

- **Never use `any`** - Always provide proper TypeScript types
- **Never use non-null assertions (`!`)** - Use explicit null checks
- **Never use type assertions (`as`)** - Implement proper type guards
- **Never use ESLint disables** - Fix the underlying issue

## Database-First Workflow

1. **Make schema changes in Supabase SQL editor first**
2. **Save all SQL in `/supabase/sql/*.sql` files**

### Critical Rules

- **NEVER use `drizzle-kit push`** - Always use the migration workflow
- **Manual SQL for**: RLS policies, extensions, complex indexes
- **Keep `schema.ts` as source of truth** for TypeScript types

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
- `google_gmail_sync` / `google_calendar_sync` - External API synchronization

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
// Business schemas in src/server/db/business-schemas/
export const CreateContactBodySchema = z.object({
  displayName: z.string().min(1),
  primaryEmail: z.string().email().optional(),
});

// Infer types
export type CreateContactBody = z.infer<typeof CreateContactBodySchema>;

// Database types from schema.ts
export type Contact = typeof contacts.$inferSelect;
export type CreateContact = typeof contacts.$inferInsert;
```

## Troubleshooting

### Performance

- Use React Query for server state caching
- Implement optimistic updates for better UX
- Background jobs for heavy AI processing
- Proper indexing on database queries
