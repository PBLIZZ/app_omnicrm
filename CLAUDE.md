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

### Database Management

- `npx drizzle-kit pull` - Pull current database schema to schema.ts (RECOMMENDED)
- `npx drizzle-kit generate` - Generate migration files when schema.ts matches database
- `npx drizzle-kit migrate` - Apply pending migrations to database
- `npx drizzle-kit studio` - Launch Drizzle Studio for database inspection
- `npx drizzle-kit introspect` - Legacy command, use `pull` instead

### Testing

- `pnpm test` - Run Vitest unit tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm e2e` - Run Playwright end-to-end tests
- `pnpm e2e:debug` - Run E2E tests in debug mode
- `pnpm e2e:setup` - Set up E2E authentication
- `pnpm e2e:full` - Run setup + E2E tests
- `pnpm lint:strict` - Run strict ESLint with zero warnings

### Additional Utility Commands

- `pnpm types:db` - Generate TypeScript types from Supabase database
- `pnpm types:verify` - Verify database types are up to date
- `pnpm lint:architecture` - Validate architectural patterns and conventions
- `pnpm verify:db-imports` - Check for correct database import patterns
- `pnpm verify:dto-usage` - Validate DTO usage across codebase
- `pnpm ci:full` - Run complete CI pipeline (typecheck, lint, test, architecture)

### Recommended Development Flow

Always run these commands before committing:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

### Troubleshooting

#### OmniClients Table Column Visibility

If columns are missing from the OmniClients table (especially the Notes column), clear the localStorage cache:

1. Open browser developer tools (F12)
2. Go to Application tab > Local Storage
3. Delete the key: `omni-clients-column-visibility`
4. Refresh the page

The table will reset to default column visibility with Notes column enabled.

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **ORM**: Drizzle
- **Auth**: Supabase Auth with Google OAuth
- **Styling**: Tailwind CSS v4 + shadcn components
- **Testing**: Vitest (unit) + Playwright (E2E)
- **State Management**: TanStack React Query
- **AI**: OpenRouter integration for LLM features, Anthropic for chat and openai for Insights. Need to switch to an embeddings model for embeddings.

### Database Philosophy

#### Hybrid Migration Strategy (Updated)

- **Drizzle Kit configured**: Uses `drizzle.config.ts` with strict mode and supabase prefix
- **Schema introspection**: Run `npx drizzle-kit introspect` to capture current database state
- **Selective migrations**: Use `npx drizzle-kit generate` for simple column/table additions
- **Manual SQL for complex changes**: RLS policies, extensions, complex indexes, and structural changes
- **Use MCP Server Tools**: Prefer MCP Tools for database management over RAW SQL QUERIES where available.
- **NEVER use `drizzle-kit push`**: Always use the migration workflow to prevent data loss
- **Comprehensive backups**: Use MCP Supabase server for full schema/data backup before changes
- **Schema sync**: Keep `src/server/db/schema.ts` as the source of truth for application types

#### Migration Workflow (CORRECTED)

1. **Database-first approach**: Make all schema changes in Supabase SQL editor first
2. **Introspect after changes**: Run `npx drizzle-kit pull` to update schema.ts
3. **Generate safe migrations**: `npx drizzle-kit generate` works safely when schema matches DB
4. **Review migration SQL**: Always inspect generated SQL before applying
5. **Apply incremental changes**: Use `npx drizzle-kit migrate` for approved changes
6. **Keep schema.ts synchronized**: Re-run `pull` after any manual SQL changes

#### What Goes Where (UPDATED)

- **Drizzle Kit safe for**: Simple column additions, table creation, basic constraints when schema is synchronized
- **Manual SQL for**: Complex indexes, RLS policies, extensions, structural changes
- **Schema.ts**: Must exactly match database via `drizzle-kit pull` - is source of truth for TypeScript types
- **Key insight**: `drizzle-kit generate` only becomes destructive when schema.ts is out of sync with database

#### Root Cause Analysis

**The Issue**: Drizzle generated destructive migrations because our `schema.ts` file was aspirational (contained future fields) rather than reflecting current database state.

**The Solution**: Use `npx drizzle-kit pull` to introspect database and generate accurate schema.ts file that matches reality.

**Result**: `npx drizzle-kit generate` now correctly reports "No schema changes, nothing to migrate" instead of creating destructive operations.

### Project Structure

```bash
src/
├── app/                    # Next.js App Router
│   ├── (authorisedRoute)/ # Protected routes (dashboard, contacts, calendar, messages)
│   ├── (auth)/            # Public routes (login, register)
│   ├── api/               # API routes (thin handlers)
│   └── layout.tsx         # Root layout with auth
├── components/            # React components
│   ├── contacts/          # Contact-specific components
│   ├── google/           # Google integration components
│   ├── layout/           # Layout components (sidebar, nav)
│   └── ui/               # shadcn/ui components
├── server/               # Business logic & services
│   ├── ai/               # AI/LLM functionality
│   ├── auth/             # Authentication utilities
│   ├── db/               # Database client & schema
│   ├── google/           # Google APIs integration
│   ├── jobs/             # Background job processing
│   └── sync/             # Data synchronization
├── hooks/                # Shared React hooks
└── lib/                  # Shared utilities
```

### Key Architecture Principles

1. **Thin API routes**: All business logic lives in `src/server/` modules
2. **Service boundaries**: Clear separation between API handlers and business logic
3. **User-scoped data**: Every table includes `user_id` for multi-tenancy
4. **Background jobs**: Async processing for AI insights, sync, and embeddings
5. **Type safety**: Strict TypeScript with comprehensive error handling
6. **Result<T, E> pattern**: Use `Result` type for error handling (see `src/lib/utils/result.ts`)

### Result Pattern for Error Handling

The codebase uses a `Result<T, E>` pattern for explicit error handling:

```typescript
import { Result, ok, err } from "@/lib/utils/result";

// Return success
return ok(data);

// Return error
return err("Error message");

// Handle Result
const result = await someOperation();
if (!result.ok) {
  return { ok: false, error: result.error };
}
const data = result.value;
```

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
- Never make edits to the @src/server/db/schema.ts file. Instead ask the user to run a sql query in the supabase dashboard and once it has ran sucessfully the user will update the @src/server/db/schema.ts file and let you know. This is for if you need to edit the database. You should treat the @src/server/db/schema.ts as read only.
- We use pnpm for package management.

### Additional Documentation

For deeper technical details, see:
- **Documentation index**: `docs/README.md`
- **API overview**: `docs/api/README.md`
- **Error handling & observability**: `src/lib/observability/README.md`
- **Database doctrine**: `docs/database/README.md`
- **Operations & deployment**: `docs/ops/README.md`
- **Testing & QA**: `docs/qa/README.md`
- **Security overview**: `SECURITY.md`
- **Roadmap**: `docs/roadmap/README.md`

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

## Enhanced Contacts System

### Overview

The Enhanced Contacts Intelligence System represents a complete replacement of the legacy contacts functionality with AI-powered features, smart suggestions, and rich interactive components tailored for wellness businesses.

**Key Documentation**: See `/docs/enhanced-contacts-system.md` for comprehensive technical implementation details.

### Core Features

#### AI-Powered Contact Intelligence

- **OpenAI GPT-5 Integration**: Latest AI model for contact insights generation
- **36 Wellness Tags**: Comprehensive categorization system for yoga, massage, meditation, and wellness services
- **7 Client Lifecycle Stages**: Smart progression tracking from Prospect to VIP Client
- **Confidence Scoring**: AI-generated confidence scores (0.0-1.0) for insight reliability

#### Smart Contact Suggestions

- **Calendar Analysis**: Automatically extracts potential contacts from Google Calendar event attendees
- **Duplicate Prevention**: Intelligent filtering to exclude existing contacts and system emails
- **Bulk Creation**: Create multiple contacts with pre-generated AI insights in one operation
- **Engagement Classification**: Analyzes event patterns to determine contact engagement levels

#### Interactive UI Components

- **Enhanced Data Table**: TanStack Table with shadcn/ui components for high-performance contact management
- **Avatar Column**: Beautiful contact photos with gradient initials fallback
- **AI Action Buttons**: 4 inline action buttons per contact (Ask AI, Send Email, Take Note, Add to Task)
- **Hover Cards**: In-line notes management without leaving the contacts table
- **Real-time Updates**: Optimistic UI with React Query integration

### Technical Architecture

#### Database Connection Pattern

**Critical**: Always use the async `getDb()` pattern for database connections:

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

#### Notes System Architecture

- **Unified Notes Table**: All notes (user-created and AI-generated) stored in dedicated `notes` table
- **Deprecated contacts.notes Field**: No longer used; all note operations use the `notes` table exclusively
- **AI Note Format**: AI-generated insights stored with `[AI Generated]` prefix for clear attribution
- **Full CRUD Operations**: Complete create, read, update, delete functionality through hover cards

#### API Layer Structure

```text
/api/contacts-new/
├── GET/POST /              # List/create contacts
├── GET/POST /suggestions   # Calendar-based suggestions
├── POST /enrich           # AI-enrich existing contacts
└── [contactId]/notes/     # Notes management
    ├── GET/POST           # List/create notes
    └── [noteId]/          # Individual note operations
        ├── PUT/DELETE     # Update/delete notes
```

### Event Classification Intelligence

The system intelligently extracts structured data from unstructured calendar events:

```typescript
// Pattern extraction from event titles and descriptions
private static extractEventType(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase();

  if (/\b(class|lesson|session)\b/.test(text)) return 'class';
  if (/\b(workshop|seminar|training)\b/.test(text)) return 'workshop';
  if (/\b(appointment|consultation|private)\b/.test(text)) return 'appointment';

  return 'event'; // default
}
```

### CSRF Protection Integration

All API calls use centralized utilities that handle CSRF tokens automatically:

```typescript
// ✅ Proper API calls with automatic CSRF handling
import { fetchPost } from "@/lib/api";
const data = await fetchPost<ResponseType>("/api/contacts-new/suggestions", payload);

// ❌ Raw fetch (missing CSRF tokens, will fail with 403)
const response = await fetch("/api/contacts-new/suggestions", {
  method: "POST",
  body: JSON.stringify(payload),
});
```

### React Query Integration

Optimistic updates with proper error handling and rollback:

```typescript
const createNoteMutation = useMutation({
  mutationFn: (data) => fetchPost("/api/notes", data),
  onMutate: async (newNote) => {
    // Optimistic update
    const previous = queryClient.getQueryData(["notes", contactId]);
    queryClient.setQueryData(["notes", contactId], (old) => [tempNote, ...old]);
    return { previous };
  },
  onError: (error, variables, context) => {
    // Rollback on error
    if (context?.previous) {
      queryClient.setQueryData(["notes", contactId], context.previous);
    }
  },
});
```

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

### Critical Implementation Notes

1. **Database Connections**: Always use `getDb()` pattern, never the proxy-based `db` import
2. **CSRF Protection**: Use `fetchPost()`/`fetchGet()` utilities, never raw `fetch()` calls
3. **Notes Architecture**: Use `notes` table exclusively, ignore `contacts.notes` field
4. **AI Integration**: GPT-5 model with structured JSON responses and proper error handling
5. **Event Classification**: Pattern-based extraction, no database schema changes required

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

## Testing Environment

- E2E tests require `.env.local` to be configured with `DATABASE_URL` and `FEATURE_GOOGLE_*` flags
- Use `pnpm e2e` (auto-loads .env.local) or `./scripts/test-e2e.sh` for e2e tests
- Some e2e tests require actual Google OAuth authentication and may skip if not available
- Run `pnpm test` for unit tests, `pnpm e2e` for e2e tests

### OAuth Authentication for E2E Tests

The skipped e2e test requires both Supabase authentication AND Google OAuth tokens.

**Automated setup (recommended):**

1. Add real Google OAuth tokens to `.env.local`:

   ```typescript
   E2E_GOOGLE_ACCESS_TOKEN = your_actual_access_token;
   E2E_GOOGLE_REFRESH_TOKEN = your_actual_refresh_token;
   ```

2. Run setup: `pnpm e2e:setup` (creates test user + OAuth tokens)
3. Run tests: `pnpm e2e` or `pnpm e2e:full` (setup + tests)

**Manual setup:**

- Run `pnpm dev`, sign in at `/login`, complete OAuth at `/settings/sync`
- Test user: `test-e2e@example.com` / `test-e2e-password-123`

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
- i stopped you becasue when you move files you have to manually update all the broken imports, when i move them the imports update automatically

Codebase Patterns Analysis

Here's a comprehensive overview of the patterns used in your OmniCRM codebase,
organized by categories:

HTTP/API Layer Patterns

✅ Standardized Approach:

-

```typescript

fetchGet<T>(), fetchPost<T>(), fetchPut<T>(), fetchDelete<T>()

- Centralized API
  utilities
- Never direct fetch() - All HTTP calls go through utilities in src/lib/api.ts
- OkEnvelope Pattern: { ok: true; data: T } | { ok: false; error: string; details?:
  unknown }
- CSRF Protection: Automatic x-csrf-token header injection
- Error Handling: Built-in toast notifications and error boundaries
- Type Safety: Full TypeScript generics for request/response types

  Data Layer Patterns

  ✅ Database Connection:

- getDb() Pattern: Always use await getDb() for database connections
- Never db import: The proxy-based db import causes runtime errors (db.from is not a
  function)
- postgres.js: Uses postgres.js driver (NOT pg)
- Drizzle ORM: All queries use Drizzle with strict type safety
- Connection Pooling: Singleton pattern with lazy initialization
- Configuration: Optimized for Supabase Transaction mode (prepare: false)

  Critical Database Pattern:
  // ✅ Correct
  import { getDb } from "@/server/db/client";
  const db = await getDb();

  // ❌ Broken
  import { db } from "@/server/db";

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

- Centralized Schemas: All in src/lib/schemas/ directory
- Type Inference: type T = z.infer<typeof Schema> - No manual types
- API Validation: Request/response schemas for all endpoints
- Preprocessing: Input sanitization and coercion
- Strict Mode: .strict() on all object schemas
- Error Mapping: Custom error messages and transformations

  Schema Organization:

- src/lib/schemas/index.ts - Central exports
- Individual files: contacts.ts, chat.ts, sync.ts, etc.
- DTO patterns match database schema exactly

  Service Layer Architecture

  ✅ Business Logic Separation:

- Thin API Routes: Controllers in src/app/api/
- Service Layer: Business logic in src/server/services/
- Repository Pattern: Data access in src/server/storage/
- Job Processing: Background tasks in src/server/jobs/

  Service Structure:
  src/server/
  ├── services/     # Business logic
  ├── storage/      # Data repositories
  ├── jobs/         # Background processing
  ├── ai/           # LLM integrations
  └── google/       # External APIs

  Authentication/Encryption Patterns

  ✅ Security Implementation:

- AES-256-GCM: All sensitive data encryption
- HMAC-SHA256: Message authentication and CSRF tokens
- Key Derivation: Master key with labeled sub-keys
- Versioned Format: v1:<iv>:<ciphertext>:<tag> envelope
- OAuth Storage: Encrypted tokens in user_integrations table
- Environment Key: APP_ENCRYPTION_KEY (base64url preferred)

  Encryption Utilities:

- src/lib/crypto.ts - Node.js crypto functions
- src/lib/crypto-edge.ts - Edge runtime compatible
- Auto-detection of encrypted vs plaintext data

  Error Handling Patterns

  ✅ Comprehensive Error Management:

- Toast Notifications: Sonner for user feedback
- Error Boundaries: React error boundaries throughout UI
- API Envelopes: Structured error responses
- Logging: Console errors with context
- Validation Errors: Zod error mapping
- Retry Logic: Built into React Query mutations

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
```

- // User-facing progress/status
  toast.info("Generating AI insights...");

// User-facing errors (they initiated the action)
toast.error("Failed to generate insights");
console.error("AI insights error:", error); // Still log for debugging

// Technical/background errors (they didn't initiate)
logger.debug("Failed to decode message part", error); // Dev console only
