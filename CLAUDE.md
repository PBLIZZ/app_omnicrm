# CLAUDE.md

## Architecture Overview

### Layered Architecture (October 2025 - Complete)

The codebase follows a strict layered architecture pattern. See `docs/REFACTORING_PATTERNS_OCT_2025.md` for complete implementation patterns.

**✅ All Domains Use Standardized Patterns:**

- **Repository Layer**: Constructor injection with `DbClient`, throws generic `Error` on failures
- **Service Layer**: Functional patterns, acquires `DbClient` via `getDb()`, wraps errors as `AppError` with status codes
- **Route Layer**: Uses standardized handlers from `@/lib/api` (`handleAuth`, `handleGetWithQueryAuth`)
- **Business Schemas**: Pure Zod validation schemas in `src/server/db/business-schemas/`
- **Database Types**: Single source of truth in `src/server/db/schema.ts` using `$inferSelect` and `$inferInsert`

### Layered Architecture Pattern

**Current Standard (October 2025):**

See `docs/REFACTORING_PATTERNS_OCT_2025.md` for complete examples. Quick reference:

```typescript
// 1. REPOSITORY LAYER (packages/repo/src/*.repo.ts)
export class ContactsRepository {
  constructor(private readonly db: DbClient) {}

  async createContact(userId: string, data: CreateContact): Promise<Contact> {
    const [contact] = await this.db
      .insert(contacts)
      .values({ ...data, userId })
      .returning();
    if (!contact) throw new Error("Insert returned no data");
    return contact;
  }
}

export function createContactsRepository(db: DbClient): ContactsRepository {
  return new ContactsRepository(db);
}

// 2. SERVICE LAYER (src/server/services/*.service.ts)
export async function createContactService(
  userId: string,
  input: CreateContactBody
): Promise<Contact> {
  const db = await getDb();
  const repo = createContactsRepository(db);

  try {
    return await repo.createContact(userId, input);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create contact",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}

// 3. ROUTE HANDLER (src/app/api/contacts/route.ts)
export const POST = handleAuth(
  CreateContactBodySchema,
  ContactSchema,
  async (data, userId) => {
    return await createContactService(userId, data);
  }
);
```

**Key Architectural Principles:**

1. **Repositories**: Constructor injection with `DbClient`, throw generic `Error` on failures, return `null` for "not found"
2. **Services**: Acquire `DbClient` via `getDb()`, use factory functions to create repos, wrap errors as `AppError` with status codes
3. **Routes**: Use `handleAuth()` or `handleGetWithQueryAuth()`, handlers automatically catch `AppError` and convert to HTTP responses
4. **Business Schemas**: Pure Zod validation in `src/server/db/business-schemas/`, no transforms
5. **Database Types**: Single source of truth in `src/server/db/schema.ts` using `$inferSelect` and `$inferInsert`

**❌ Deprecated Patterns (DO NOT USE):**

- `DbResult<T>` wrapper - Removed, use direct throws
- Static repository methods - Use constructor injection
- Manual `NextRequest`/`NextResponse` - Use standardized handlers
- Manual `Response.json()` - Use handlers from `@/lib/api`

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **ORM**: Drizzle
- **Auth**: Supabase Auth with Google OAuth
- **Styling**: Tailwind CSS v4 + shadcn components
- **Testing**: Vitest (unit) + Playwright (E2E)
- **State Management**: TanStack React Query
- **AI**: OpenRouter integration for LLM features.

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
- `threads` & `messages` - Chat/conversation system
- `raw_events` - Event ingestion from external sources
- `sync_audit` - Audit trail for sync operations
- `ai_quotas` & `ai_usage` - AI usage tracking and limits

### Google Integration

- OAuth flow handles Gmail and Calendar access
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
- We use pnpm for package management.

### Layout & UI Architecture

#### Sidebar Layout System

The application uses a **floating sidebar** layout built with shadcn/ui sidebar components. Key architectural details:

**Main Layout Structure:**

- `MainLayout.tsx` - Root layout wrapper with `SidebarProvider`
- `Sidebar` component with `variant="floating"` and `collapsible="icon"`
- Full viewport height with proper header offset handling

**Critical Height Fix Applied:**
The sidebar was updated to be properly full-height by modifying the sidebar container CSS:

```typescript
// Fixed in /src/components/ui/sidebar.tsx line 224
"fixed top-16 bottom-0 z-10 hidden h-[calc(100vh-4rem)] w-(--sidebar-width)";
```

**Key Layout Properties:**

- `top-16` - Positions sidebar below the 4rem (64px) header
- `bottom-0` - Extends sidebar to viewport bottom
- `h-[calc(100vh-4rem)]` - Height calculation accounts for header offset
- Ensures sidebar fills full available height regardless of zoom level

**Responsive Behavior:**

- Desktop: Fixed floating sidebar with icon collapse
- Mobile: Sheet-based overlay sidebar
- Proper handling of header space and footer positioning

**Components Structure:**

- `SidebarHeader` - Brand and navigation toggle
- `SidebarContent` - Route-based navigation (AppSidebarController)
- `SidebarFooter` - User navigation and controls
- `SidebarInset` - Main content area with header and breadcrumbs

#### Interactive UI Components

- **Enhanced Data Table**: TanStack Table with shadcn/ui components for high-performance contact management
- **Avatar Column**: Beautiful contact photos with gradient initials fallback

### Wellness Business Taxonomy

#### 36 Wellness Tags (4 Categories)

- **Services (14)**: Yoga, Massage, Meditation, Pilates, Reiki, Acupuncture, Personal Training, Nutrition Coaching, Life Coaching, Therapy, Workshops, Retreats, Group Classes, Private Sessions
- **Demographics (11)**: Senior, Young Adult, Professional, Parent, Student, Beginner, Intermediate, Advanced, VIP, Local, Traveler
- **Goals & Health (11)**: Stress Relief, Weight Loss, Flexibility, Strength Building, Pain Management, Mental Health, Spiritual Growth, Mindfulness, Athletic Performance, Injury Recovery, Prenatal, Postnatal
- **Engagement Patterns (10)**: Regular Attendee, Weekend Warrior, Early Bird, Evening Preferred, Seasonal Client, Frequent Visitor, Occasional Visitor, High Spender, Referral Source, Social Media Active

#### 7 Client Lifecycle Stages

- **Prospect**: 1-2 events, recent inquiries
- **New Client**: 2-5 events, getting started
- **Core Client**: 6+ events, regular attendance
- **Referring Client**: Evidence of bringing others
- **VIP Client**: High frequency (10+ events) + premium services
- **Lost Client**: No recent activity (60+ days)
- **At Risk Client**: Declining attendance pattern

## Pull Request Workflow

When adding commits from a feature branch to main, follow this process:

1. **Create feature branch from main**: `git checkout -b feature-name`
2. **Apply commits to feature branch**: Use `git cherry-pick` or apply changes directly
3. **Push feature branch**: `git push -u origin feature-name`
4. **Create PR**: Use `gh pr create` against main branch
5. **Wait for CI tests**: Let GitHub Actions run typecheck, lint, tests, and build
6. **Claude review**: Claude will automatically review new PRs, or you can trigger a review by commenting `/claude` on any PR
7. **Review and merge**: Only merge after all CI checks pass and Claude review is complete

**NEVER commit directly to main branch.** Always use the PR process to ensure CI validation.

### Claude Code Review

- **Automatic**: Claude reviews all new PRs and PR updates automatically
- **Manual trigger**: Comment `/claude` on any PR to request a review
- **Review scope**: Claude analyzes code quality, security, performance, and test coverage

### Coding Standards

#### TypeScript Safety (Zero Tolerance Policy)

- **Never use `any`** - Always provide proper TypeScript types
- **Never use non-null assertions (`!`)** - Replace with explicit null checks and error handling
- **Never use type assertions (`as`)** - Implement proper type guards instead
- **Never use ESLint disables** - Fix the underlying issue, not the warning
- **Never use underscore prefixes** - Remove unused code instead of hiding it
- **Fix root causes** - When encountering lint errors, resolve the underlying issue. Do not use comments, config changes, ignore lists, underscores, or other short-term fixes. Do not accrue technical debt.
- **Strict TypeScript** - Configuration enforces strict typing with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`

#### Proper TypeScript Patterns

```typescript
// ❌ NEVER - Dangerous workarounds
const data = response.data!; // Runtime crash risk
const user = obj as User; // Type safety bypass
// eslint-disable-next-line rule-name  // Hiding real issues

// ✅ ALWAYS - Safe, explicit patterns
const data = response.data;
if (!data) {
  throw new Error("Expected data but received null/undefined");
}

function isUser(obj: unknown): obj is User {
  return typeof obj === "object" && obj !== null && "id" in obj;
}
if (!isUser(obj)) {
  throw new Error("Invalid user object structure");
}
```

#### Component Architecture

- **Separation of concerns** - Prefer composable components over monolithic ones
- **Error boundaries** - Comprehensive error handling with fallback UI at App, Page, and Component levels
- **Package management** - Use pnpm for all development, build, and test commands
- **No TODO comments** - Raise GitHub issues instead

### UI/UX Patterns

- **Responsive design**: Mobile-first approach with proper breakpoints
- **Loading states**: Implement skeleton components and loading indicators
- **Error boundaries**: Comprehensive error handling with fallback UI
- **Toast notifications**: Use Sonner for user feedback (success, error, info)
- **Mock data**: Use realistic mock data during development for better UX testing
- **Accessibility**: Ensure proper ARIA labels and keyboard navigation

Codebase Patterns Analysis

- CSRF Protection: Automatic x-csrf-token header injection
- Error Handling: Built-in toast notifications and error boundaries
- Type Safety: Full TypeScript generics for request/response types

  Data Layer Patterns

  ✅ Database Connection:

- postgres.js: Uses postgres.js driver (NOT pg)
- Drizzle ORM: All queries use Drizzle with strict type safety

  State Management Patterns

  ✅ React Query Ecosystem:

- TanStack React Query: Primary state management for server state
- Custom Hooks: All API interactions wrapped in custom hooks
- Optimistic Updates: Mutations with rollback on error
- Query Invalidation: Automatic cache invalidation after mutations
- Error Handling: Integrated with toast notifications

  Hook Pattern Example:
  export function useContactActions() {
    return useMutation({
      mutationFn: (data) => fetchPost("/api/contacts-new", data),
      onSuccess: () => queryClient.invalidateQueries(["/api/contacts-new"]),
      onError: (error) => toast.error("Failed: " + error.message)
    });
  }

  Validation Patterns

  ✅ Zod Schemas:

- Centralized Schemas: All in src/server/db/business-schemas/ directory

  Schema Organization:

- src/server/db/business-schemas/index.ts - Central exports
- Individual files: contacts.ts, chat.ts, productivity.ts, etc.

  Service Layer Architecture

  ✅ Business Logic Separation:

- Thin API Routes: Controllers in src/app/api/
- Service Layer: Business logic in src/server/services/
- Repository Pattern: Data access in packages/repo/src/
- Job Processing: Background tasks in src/server/jobs/

  Service Structure:
  src/server/
  ├── services/     # Business logic
  ├── jobs/         # Background processing
  ├── ai/           # LLM integrations
  └── google/       # External APIs

  Authentication/Encryption Patterns

  ✅ Security Implementation:

- AES-256-GCM: All sensitive data encryption
- HMAC-SHA256: Message authentication and CSRF tokens
- Key Derivation: Master key with labeled sub-keys
- Versioned Format: v1:`<iv>:<ciphertext>:<tag>` envelope
- OAuth Storage: Encrypted tokens in user_integrations table
- Environment Key: APP_ENCRYPTION_KEY (base64url preferred)

  Encryption Utilities:

- src/server/utils/crypto.ts - Node.js crypto functions
- src/server/utils/crypto-edge.ts - Edge runtime compatible
- Auto-detection of encrypted vs plaintext data

  File Organization Patterns

  ✅ Directory Structure:
  src/
  ├── app/                    # Next.js App Router
  │   ├── (authorisedRoute)/  # Protected routes
  │   ├── (auth)/            # Public routes
  │   └── api/               # API endpoints
  ├── components/            # React components
  ├── hooks/                 # Custom React hooks
  ├── lib/                   # Utilities & schemas
  └── server/               # Backend services

  Background Job Patterns

  ✅ Job Processing:

- Job Queue: Database-backed job queue in jobs table
- Processors: Separate processor classes for each job type
- Retry Logic: Configurable retry attempts with backoff
- Batch Processing: Support for batch operations
- Status Tracking: Job status monitoring

  Job Types:

- normalize - Data normalization
- embed - Vector embeddings
- insight - AI insights generation
- google_gmail_sync / google_calendar_sync - External API sync

  Component Architecture Patterns

  ✅ UI Components:

- shadcn/ui: Base component library
- Compound Components: Complex UI patterns with multiple parts
- Props Interface: Strict TypeScript interfaces for all props
- Error Boundaries: Component-level error handling
- Loading States: Skeleton components and loading indicators
- pnpm typecheck and pnpm lint are the preferred commands
