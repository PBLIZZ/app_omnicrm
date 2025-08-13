# OmniCRM AI - Complete Development Checklist

## From Zero to Production Sequential Task List Overview

This checklist consolidates all tasks from the planning documents into a single, sequential workflow. Each task is atomic and clearly indicates whether it should be performed by a human [HUMAN] or coding agent [AGENT].

**Target Users:** Yoga teachers, massage therapists, wellness practitioners  
**Core Value:** AI-first CRM with multimodal chat assistant for business management  
**Budget Constraint:** €50-100/month for AI and infrastructure

---

## PHASE 0: PROJECT FOUNDATION

### 0.1 Repository Setup

- [x] [HUMAN] Create GitHub repository `app_omnicrm` with MIT license and .gitignore
- [x] [HUMAN] Clone repository locally
- [x] [AGENT] Initialize Next.js 15 app in existing folder

  ```bash
  npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias="@/*"
  ```

  _Choose NO for Turbopack when prompted_

- [x] [AGENT] Create base folder structure:
  - `src/server/db`
  - `src/server/jobs`
  - `src/lib`
  - `src/app/api/health`
- [x] [AGENT] Add health check endpoint at `/api/health`
  - Return: `{ ok: true, ts: new Date().toISOString() }`
- [x] [HUMAN] Test local development server (`pnpm dev`)
- [x] [HUMAN] Commit and push: "chore: init Next.js app and health endpoint"

### 0.2 Supabase Project Setup

- [x] [HUMAN] Create new Supabase project (free tier)
- [x] [HUMAN] Enable pgvector extension: `create extension if not exists vector;`
- [x] [HUMAN] Copy project credentials (URL, publishable key, secret key, DB password)
- [x] [HUMAN] Set up cost guardrails and budget alerts (≤€50/month)

### 0.3 Environment Configuration

- [x] [AGENT] Create `.env.local` and `.env.example` with Supabase credentials
- [x] [AGENT] Configure DATABASE_URL (pooled 6543) and DIRECT_URL (direct 5432)
- [x] [AGENT] Add LLM provider API keys (OpenRouter/OpenAI)
- [x] [AGENT] Ensure `.env.local` is gitignored
- [x] [HUMAN] Commit and push: "chore: supabase env templates + budget guardrails"

---

## PHASE 0.5: SAFETY, QUALITY, CI & OBSERVABILITY (2-4 HRS)

### 0.5.1 TypeScript Strict + ESLint + Prettier

- [x] [AGENT] Enable TypeScript strict mode in `tsconfig.json`:
  - `"strict": true`
  - `"noUncheckedIndexedAccess": true`
  - `"noImplicitOverride": true`
  - `"noPropertyAccessFromIndexSignature": true`
  - `"exactOptionalPropertyTypes": true`
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": false`
- [x] [AGENT] Configure ESLint with Next.js core web vitals + TypeScript rules
- [x] [AGENT] Install and configure Prettier with sensible defaults
- [x] [AGENT] Install unused-imports ESLint plugin for cleanup
- [x] [HUMAN] Commit: "chore(lint): enable TS strict, ESLint, Prettier"

### 0.5.2 Unit Tests (Vitest + RTL) & E2E (Playwright)

- [x] [AGENT] Install testing dependencies:

  ```bash
  pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8
  pnpm add -D @playwright/test
  ```

- [x] [AGENT] Configure Vitest with jsdom environment and coverage
- [x] [AGENT] Create `vitest.setup.ts` with testing-library/jest-dom
- [x] [AGENT] Add example unit test at `src/app/__tests__/health.test.tsx`
- [x] [AGENT] Configure Playwright with webServer pointing to dev server
- [x] [AGENT] Create example E2E test for health endpoint at `e2e/health.spec.ts`
- [x] [AGENT] Add npm scripts: `test`, `test:watch`, `e2e`, `typecheck`, `lint`, `format`
- [x] [HUMAN] Commit: "test: add vitest + playwright baselines"

### 0.5.3 Git Hooks (Husky + lint-staged + commitlint)

- [x] [AGENT] Install and initialize Husky:

  ```bash
  pnpm add -D husky lint-staged @commitlint/config-conventional @commitlint/cli
  pnpm exec husky init
  ```

- [x] [AGENT] Configure commitlint with conventional commits
- [x] [AGENT] Set up lint-staged for TypeScript and JSON files
- [x] [AGENT] Create pre-commit hook to run lint-staged
- [x] [AGENT] Create commit-msg hook to run commitlint
- [x] [HUMAN] Commit: "chore(git): husky + lint-staged + commitlint"

### 0.5.4 GitHub Actions (CI)

- [x] [AGENT] Create `.github/workflows/ci.yml` with jobs:
  - Install dependencies with pnpm
  - Run typecheck, lint, unit tests, E2E tests
  - Use Node 20 and pnpm cache
  - Trigger on push to main and pull requests
- [x] [AGENT] Create `.github/workflows/codeql.yml` for security scanning:
  - JavaScript/TypeScript analysis
  - Weekly scheduled runs
  - Proper permissions for security events
- [x] [HUMAN] Commit and push: "ci: add CI and CodeQL workflows"

### 0.5.5 Docker (Local Dev)

- [x] [AGENT] Create `Dockerfile.dev` with Node 20 Alpine:
  - Install Playwright dependencies for E2E in container
  - Set up pnpm and install dependencies
  - Expose port 3000 for development
- [x] [AGENT] Create `docker-compose.yml`:
  - Mount source code with node_modules volume
  - Configure environment variables from `.env.local`
- [x] [HUMAN] Test Docker setup: `docker compose up --build`
- [x] [HUMAN] Commit: "chore(docker): add dev Dockerfile and compose"

### 0.5.6 Security & Headers (Fast Wins)

- [x] [AGENT] Create `src/middleware.ts` with basic security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [x] [AGENT] Add `.npmrc` with `engine-strict=true` to prevent lockfile drift
- [x] [HUMAN] Commit: "chore(security): add baseline headers and engine strict"

### 0.5.7 Observability (Zero-Cost Baseline)

- [x] [AGENT] Install and configure Pino logger:

  ```bash
  pnpm add pino pino-pretty
  ```

- [x] [AGENT] Create `src/server/log.ts` with pretty transport for development
- [x] [AGENT] Add simple error boundary at `src/app/error.tsx`
- [x] [AGENT] Add pnpm audit step to CI (non-blocking warning)
- [x] [AGENT] Ensure `.env*.` is properly gitignored and `.env.example` is up to date
- [x] [HUMAN] Commit: "chore(obs): add basic logger and error boundary"

### 0.5.8 Guardian Checks (Safety Rails)

- [x] [AGENT] Add npm audit check to CI workflow (non-blocking)
- [x] [AGENT] Verify environment variable hygiene (gitignore, example file)
- [x] [AGENT] Add basic input validation examples using Zod
- [x] [HUMAN] Commit: "chore(security): audit step and env hygiene"
- [ ] [AGENT] **URGENT**: Security audit findings require immediate attention (CRITICAL vulnerabilities discovered)

**Definition of Done (Phase 0.5):**

- [x] TypeScript strict enabled; ESLint + Prettier configured
- [x] Unit tests (Vitest) and E2E (Playwright) run locally and in CI
- [x] Git hooks enforce lint/format + conventional commit messages
- [x] GitHub Actions CI runs: typecheck, lint, unit, e2e, audit
- [x] CodeQL security scanning enabled
- [x] Optional Docker dev environment works
- [x] Security headers in place; structured logging available
- [x] All quality gates pass before moving to database foundation

---

## PHASE 1: DATABASE FOUNDATION

### 1.1 Package Installation

- [x] [AGENT] Install core packages:

  ```bash
  pnpm add drizzle-orm drizzle-kit pg @supabase/supabase-js zod
  pnpm add -D tsx @types/node
  ```

- [x] [AGENT] Configure `drizzle.config.ts` pointing to DIRECT_URL
- [x] [AGENT] Create database client helper at `src/server/db/client.ts`

### 1.2 Core Schema Implementation

- [x] [AGENT] Create `src/server/db/schema.ts` with tables:
  - `contacts` (id, displayName, primaryEmail, primaryPhone, source, timestamps, user_id)
  - `interactions` (id, contactId, type, subject, bodyText, bodyRaw, occurredAt, source, sourceId, timestamps, user_id)
  - `raw_events` (id, provider, payload, contactId, occurredAt, timestamps, user_id)
  - `documents` (id, ownerContactId, title, mime, text, meta, timestamps, user_id)
  - `embeddings` (id, ownerType, ownerId, meta, timestamps, user_id)
  - `ai_insights` (id, subjectType, subjectId, kind, content, model, timestamps, user_id)
  - `jobs` (id, kind, payload, status, attempts, timestamps, user_id)
- [x] [AGENT] Generate and push migrations: `pnpm drizzle-kit generate && pnpm drizzle-kit push`
- [x] [HUMAN] Add vector column and index via Supabase SQL:

  ```sql
  alter table embeddings add column if not exists embedding vector(1536);
  create index if not exists embeddings_vec_idx on embeddings using ivfflat (embedding vector_cosine_ops);
  ```

- [x] [AGENT] Create additional performance indexes:
  - (contact_id, occurred_at desc) on interactions (for timeline queries)
  - (provider, occurred_at) on raw_events (for sync optimization)
- [x] [AGENT] Generate and apply index migration: `pnpm drizzle-kit generate && pnpm drizzle-kit push`
- [x] [HUMAN] Commit and push: "feat(db): minimal AI-first schema and migrations"

### 1.3 Row Level Security Setup

- [x] [AGENT] Create `supabase/rls.sql` with commented RLS policies for all tables
- [x] [HUMAN] Review and apply RLS policies in Supabase
- [x] [HUMAN] Commit and push: "feat(db): RLS policies for tenant isolation"

---

## PHASE 2: AUTHENTICATION & AUTHORIZATION

### 2.1 Supabase Auth Integration

- [x] [AGENT] Create browser client at `src/lib/supabase-browser.ts` (publishable key)
- [x] [AGENT] Create server client at `src/server/supabase.ts` (secret key for admin)
- [x] [AGENT] Implement login page at `src/app/login/page.tsx` with magic link
- [x] [AGENT] Add sign-in/sign-out UI components in header
- [x] [AGENT] Configure auth callbacks at `/auth/callback`
- [x] [HUMAN] Test authentication flow locally
- [x] [HUMAN] Commit and push: "feat(auth): supabase auth wiring + login page"

### 2.2 Multi-tenant Security Validation

- [ ] [HUMAN] Test user isolation with multiple accounts
- [ ] [HUMAN] Verify RLS policies are working correctly
- [x] [AGENT] Add user session management utilities

---

## PHASE 3: BACKGROUND JOBS & PROCESSING

### 3.1 Job Queue System

- [x] [AGENT] Create job types at `src/server/jobs/types.ts`: "normalize" | "embed" | "insight"
- [x] [AGENT] Implement enqueue helper at `src/server/jobs/enqueue.ts`
- [x] [AGENT] Create job runner API at `/api/jobs/runner`
- [x] [AGENT] Add job status tracking and error handling
- [ ] [HUMAN] Test job processing with manual trigger
- [ ] [HUMAN] Commit and push: "feat(jobs): queue system and runner endpoint"

### 3.2 Data Processing Workers

- [x] [AGENT] Implement normalize processor (raw_events → interactions)
- [ ] [AGENT] Implement embed processor (text chunking → embeddings via OpenAI/OpenRouter)
- [ ] [AGENT] Implement insight processor (LLM analysis → ai_insights)
- [ ] [AGENT] Add retry logic and exponential backoff
- [ ] [HUMAN] Test each processor individually

---

## PHASE 4: GOOGLE INTEGRATION (MVP - READ-ONLY)

### 4.1 Google API Setup & Configuration

- [x] [HUMAN] Create Google Cloud Console project named after `app_omnicrm`
- [x] [HUMAN] Enable required APIs:
  - Gmail API
  - Google Calendar API
  - People API (optional, for contact profile pictures)
- [x] [HUMAN] Configure OAuth consent screen (External user type)
- [x] [HUMAN] Add OAuth scopes:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/calendar.readonly`
- [x] [HUMAN] Add test user (your email address)
- [x] [HUMAN] Create OAuth client (Web Application) with redirect URIs:
  - `http://localhost:3000/api/google/oauth/callback`
  - `https://<vercel-domain>/api/google/oauth/callback`
- [x] [HUMAN] Add Google credentials to `.env.local` and `.env.example`:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`

### 4.2 OAuth Implementation

- [x] [AGENT] Create OAuth initiation endpoint `src/app/api/google/oauth/route.ts`:
  - Build Google OAuth URL with proper scopes
  - Include `access_type=offline` and `prompt=consent` for refresh tokens
  - Redirect to Google authorization server
- [x] [AGENT] Create OAuth callback handler `src/app/api/google/oauth/callback/route.ts`:
  - Exchange authorization code for tokens
  - Store access and refresh tokens securely in database
  - Handle token exchange errors gracefully
  - Redirect to integrations page on success

### 4.3 Database Schema for Integrations

- [x] [AGENT] Add `user_integrations` table to schema:
  - `user_id` (UUID, foreign key to users)
  - `provider` (text, e.g., "google")
  - `access_token` (text, encrypted)
  - `refresh_token` (text, encrypted)
  - `expiry_date` (timestamp)
  - `created_at`, `updated_at` (timestamps)
  - Primary key: (user_id, provider)
- [x] [AGENT] Generate and push database migration
- [x] [HUMAN] Verify table creation in Supabase

### 4.4 Background Jobs for Data Ingestion

- [x] [AGENT] Add new job types to job system:
  - `"google_gmail_sync"` - Fetch Gmail messages
  - `"google_calendar_sync"` - Fetch Calendar events
- [x] [AGENT] Implement Gmail sync worker:
  - Fetch messages via Gmail API with pagination
  - Store raw JSON responses in `raw_events` table
  - Handle rate limiting and API quotas
  - Support incremental sync with timestamps
- [x] [AGENT] Implement Calendar sync worker:
  - Fetch calendar events via Calendar API
  - Store raw JSON responses in `raw_events` table
  - Handle recurring events and timezone conversion
  - Support incremental sync with timestamps
- [x] [AGENT] Add token refresh logic for expired access tokens

### 4.5 Data Normalization Jobs

- [x] [AGENT] Add normalization job types:
  - `"normalize_google_email"` - Convert Gmail raw events to interactions
  - `"normalize_google_event"` - Convert Calendar raw events to interactions
- [x] [AGENT] Implement email normalization worker:
  - Parse Gmail message JSON → `interactions` table
  - Extract: subject, body, participants, timestamp
  - Set interaction type as "email"
  - Handle attachments and threading
- [x] [AGENT] Implement calendar normalization worker:
  - Parse Calendar event JSON → `interactions` table
  - Extract: title, description, participants, datetime
  - Set interaction type as "meeting"
  - Handle recurring events and cancellations

### 4.6 Integration UI

- [ ] [AGENT] Create integrations page at `/integrations`
- [x] [AGENT] Add "Connect Google" button that redirects to OAuth flow
- [x] [AGENT] Display connection status and last sync timestamp
- [x] [AGENT] Add manual sync trigger button for testing
- [ ] [AGENT] Show sync progress and error states

### 4.7 Testing & Validation

- [ ] [HUMAN] Test complete OAuth flow:
  - Click "Connect Google" → OAuth consent → callback success
  - Verify tokens stored in `user_integrations` table
- [ ] [HUMAN] Test data ingestion:
  - Trigger Gmail sync job → verify `raw_events` populated
  - Trigger Calendar sync job → verify `raw_events` populated
- [ ] [HUMAN] Test data normalization:
  - Run normalization jobs → verify `interactions` table updated
  - Validate email and calendar data appears correctly
- [ ] [HUMAN] Test error handling:
  - Expired tokens → automatic refresh
  - API rate limits → proper backoff
  - Network failures → job retry logic
- [ ] [HUMAN] Commit and push: "feat(google): OAuth and read-only sync pipeline"

**Acceptance Criteria (Phase 4):**

- [ ] User can connect Google account via OAuth
- [ ] Gmail and Calendar data syncs automatically to `raw_events`
- [ ] Raw data normalizes into structured `interactions`
- [ ] Token refresh works automatically
- [ ] Sync status visible in UI
- [ ] All operations are read-only (no writes to Google)

---

## PHASE 5: AI CHAT ASSISTANT (MVP)

### 5.1 Chat Service Backend

- [ ] [AGENT] Create `/api/chat` endpoint with streaming support
- [ ] [AGENT] Implement query analysis and search planning
- [ ] [AGENT] Add hybrid search (SQL + pgvector) over interactions/documents
- [ ] [AGENT] Implement LLM response generation with citations
- [ ] [AGENT] Add conversation context management
- [ ] [HUMAN] Test chat endpoint with sample queries

### 5.2 Read-only Tools Implementation

- [ ] [AGENT] Implement `searchContacts` tool
- [ ] [AGENT] Implement `getContactTimeline` tool
- [ ] [AGENT] Implement `searchEmails` tool
- [ ] [AGENT] Implement `searchCalendar` tool
- [ ] [AGENT] Implement `summarizeThread` tool
- [ ] [AGENT] Add tool result caching and optimization
- [ ] [HUMAN] Test each tool with real data

### 5.3 Chat Persistence Schema

- [ ] [AGENT] Add `threads` table (id, user_id, title, timestamps)
- [ ] [AGENT] Add `messages` table (id, thread_id, role, content, timestamps)
- [ ] [AGENT] Add `tool_invocations` table (id, message_id, tool, args, result, latency)
- [ ] [AGENT] Implement chat history persistence
- [ ] [HUMAN] Commit and push: "feat(chat): AI assistant backend with tools"

---

## PHASE 6: MULTIMODAL & VOICE FEATURES

### 6.1 Voice Input/Output

- [ ] [AGENT] Implement browser microphone capture with WebRTC
- [ ] [AGENT] Add server-side STT using Whisper or provider API
- [ ] [AGENT] Implement server-side TTS with streaming
- [ ] [AGENT] Add voice activity detection and noise reduction
- [ ] [HUMAN] Test voice features across different devices

### 6.2 Multimodal Support

- [ ] [AGENT] Add file upload handling for images/documents
- [ ] [AGENT] Implement text extraction from PDFs and images
- [ ] [AGENT] Add image analysis capabilities for screenshots
- [ ] [AGENT] Index extracted content for semantic search
- [ ] [HUMAN] Test multimodal features with various file types
- [ ] [HUMAN] Commit and push: "feat(multimodal): voice and file processing"

---

## PHASE 7: USER INTERFACE DEVELOPMENT

### 7.1 Core Chat Interface

- [ ] [AGENT] Build responsive chat thread UI component
- [ ] [AGENT] Add message input with microphone button and file upload
- [ ] [AGENT] Implement citations display with source links
- [ ] [AGENT] Add quick action chips ("Next 7 days", "Recent emails", etc.)
- [ ] [AGENT] Add voice reply toggle and audio playback
- [ ] [HUMAN] Test chat UI on desktop and mobile

### 7.2 Contact Management UI

- [ ] [AGENT] Create contact detail pages with timeline view
- [ ] [AGENT] Add contact search and filtering capabilities
- [ ] [AGENT] Implement "Ask about this contact" contextual chat
- [ ] [AGENT] Add contact interaction history visualization
- [ ] [HUMAN] Test contact management workflows

### 7.3 Dashboard and Navigation

- [ ] [AGENT] Build main dashboard with key metrics
- [ ] [AGENT] Add responsive navigation with mobile menu
- [ ] [AGENT] Implement dark/light theme toggle
- [ ] [AGENT] Add loading states and error boundaries
- [ ] [HUMAN] Test full user experience flow
- [ ] [HUMAN] Commit and push: "feat(ui): complete user interface"

### 7.4 Frontend Backlog (from design specs and GitHub issues)

Reference: docs/architecture/frontend/README.md

- Contacts
  - [x] New Contact Dialog (modal) with validation — #25
  - [x] Contact Edit Dialog with change tracking — #26
  - [x] Contacts Filter Sidebar (desktop) — #27
  - [x] Bulk selection and actions for Contacts — #29
  - [x] Complete Contact Management System with CRUD operations
  - [x] Contact search functionality (SECURITY ISSUE IDENTIFIED - needs pattern escaping)
  - [x] Bulk delete operations (SECURITY REVIEW NEEDED - database error disclosure risk)
  - [ ] Finalize Contact List Header (search, filters, bulk actions) — #20
  - [ ] Switch Contacts page to server-driven `fetchContacts` (search/sort/filter/paging) — #36
  - [ ] Virtualized Contact List — #28
  - [ ] Contact List Items + Mobile Swipe Actions — #22
  - [ ] Refactor Filtering and Lifecycle Grouping for Contact List UI — #35
  - [ ] Contacts Import/Export UI — #30
  - [ ] Contacts keyboard shortcuts & a11y pass — #34

- Contact Details
  - [x] Implement Contact Detail Page (`/contacts/[id]`) — #21
  - [x] Interaction Timeline component (Phase 1 placeholder) — #23
  - [x] Contact AI Insights section (Phase 1 placeholder) — #24
  - [ ] Contact AI Chat Panel (context-aware) — #33
  - [ ] Mobile Contact Detail layout & tabs — #32

- Navigation and Mobile
  - [ ] Mobile Bottom Navigation — #31

- Chat UI
  - [ ] Minimal Chat Assistant UI scaffold (Phase 2A slice) — #18

- Settings/Login polish
  - [x] Refactor settings sync UI: use design-system components and toasts — #19
  - [ ] Standardize buttons and loading states across login/settings — #16
  - [ ] Fix accessibility basics on settings/login (Phase 1C) — #17

---

## PHASE 7.5: CRITICAL SECURITY FIXES (AUGUST 2025 AUDIT FINDINGS)

### 7.5.1 Critical Security Vulnerabilities - IMMEDIATE ACTION REQUIRED

- [ ] [AGENT] **CRITICAL**: Secure OpenRouter proxy endpoint (/api/openrouter)
  - Add user authentication requirement
  - Implement comprehensive input validation with Zod schemas
  - Apply AI guardrails to prevent quota bypass and cost exploitation
  - Add rate limiting specific to external AI model access
- [ ] [AGENT] **CRITICAL**: Implement database error sanitization for contact APIs
  - Add database error handling wrapper for all contact endpoints
  - Map internal database errors to safe, generic client messages
  - Implement structured error logging for debugging while protecting production
- [ ] [AGENT] **CRITICAL**: Fix TypeScript compilation error in crypto-edge.ts
  - Resolve BufferSource type casting issue blocking deployments
  - Test build pipeline thoroughly
  - Ensure production deployment capability restored

### 7.5.2 High Priority Security & Performance Fixes

- [ ] [AGENT] **HIGH**: Fix AI rate limiting race conditions
  - Implement atomic rate limiting with Redis or database locks
  - Add proper concurrency handling for quota checks across all AI endpoints
  - Test race condition scenarios with concurrent request simulation
- [ ] [AGENT] **HIGH**: Implement database connection pooling
  - Replace single connection with pg.Pool (10-15 connections per instance)
  - Support 500-1000 concurrent users vs current 50-100 limit
  - Add connection monitoring and health checks
- [ ] [AGENT] **HIGH**: Add PostgreSQL LIKE pattern escaping for contact search
  - Escape special characters (%, \_, \) in search queries
  - Add performance protection against search query exhaustion attacks
  - Validate and sanitize search input with proper regex patterns
- [ ] [AGENT] **HIGH**: Complete Gmail query validation
  - Implement comprehensive query string validation (persistent issue)
  - Add allowlist for safe Gmail query operators
  - Prevent injection through malicious query construction

### 7.5.3 Testing & Quality Improvements

- [ ] [AGENT] **HIGH**: Fix E2E test reliability (8/42 tests failing)
  - Resolve timeout issues affecting multiple test suites
  - Fix CSRF token handling problems in chat tests
  - Improve database state isolation between tests
  - Implement better wait strategies and retry logic
- [ ] [AGENT] **HIGH**: Add comprehensive health endpoint testing
  - Test critical monitoring endpoint (/api/health)
  - Validate database connectivity checks
  - Ensure production readiness verification
- [ ] [AGENT] **MODERATE**: Expand component testing coverage from 13% to 80%
  - Test 34/39 remaining untested components
  - Focus on AuthHeader, ContactEditDialog, NewContactDialog
  - Add accessibility testing coverage

---

## PHASE 8: DEPLOYMENT & INFRASTRUCTURE

### 8.1 Vercel Deployment

- [x] [HUMAN] Create Vercel project linked to GitHub repository
- [x] [HUMAN] Configure all environment variables in Vercel
- [x] [HUMAN] Set up automatic deployments on main branch
- [ ] [HUMAN] Configure custom domain (optional)
- [ ] [HUMAN] Test production deployment thoroughly (BLOCKED by TypeScript build error)

### 8.2 Production Configuration

- [ ] [HUMAN] Update Supabase auth redirect URLs for production
- [ ] [AGENT] Configure CORS settings for production domains
- [ ] [AGENT] Set up error monitoring and logging
- [x] [AGENT] Add health checks and uptime monitoring
- [ ] [HUMAN] Commit and push: "feat(deploy): production configuration"

---

## PHASE 9: COST MANAGEMENT & RATE LIMITING

### 9.1 Usage Tracking System

- [ ] [AGENT] Implement AI quota system with monthly limits
- [ ] [AGENT] Add detailed usage logging for all AI calls
- [ ] [AGENT] Create cost monitoring dashboard
- [ ] [AGENT] Set up automated billing alerts
- [ ] [HUMAN] Configure provider-level spending caps

### 9.2 Rate Limiting Implementation

- [ ] [AGENT] Implement per-user request limits (requests/minute, requests/day)
- [ ] [AGENT] Add token usage tracking and limits
- [ ] [AGENT] Create usage tiers (free: 100 requests/day, premium: unlimited)
- [ ] [AGENT] Add graceful degradation when limits exceeded
- [ ] [HUMAN] Test rate limiting with high usage scenarios
- [ ] [HUMAN] Commit and push: "feat(limits): cost management and rate limiting"

---

## PHASE 10: V1.0 FEATURES (ACTIONS & EXPANSION)

### 10.1 Write-Capable Tools with Approval

- [ ] [AGENT] Implement `draftEmail` tool with preview and approval workflow
- [ ] [AGENT] Implement `createBooking` tool for calendar management
- [ ] [AGENT] Implement `createTask` tool for task management
- [ ] [AGENT] Implement `notify` tool for client notifications
- [ ] [AGENT] Add approval UI for all write actions
- [ ] [HUMAN] Test write capabilities with real accounts

### 10.2 Business Intelligence Features

- [ ] [AGENT] Implement contact segmentation and filtering
- [ ] [AGENT] Add revenue analytics and reporting
- [ ] [AGENT] Create performance dashboards (conversion rates, retention)
- [ ] [AGENT] Add trend analysis and forecasting
- [ ] [HUMAN] Validate analytics with real business data

### 10.3 Marketing and Content Creation

- [ ] [AGENT] Add campaign creation and management tools
- [ ] [AGENT] Implement content generation for emails and social media
- [ ] [AGENT] Create email template system with personalization
- [ ] [AGENT] Add social media scheduling integration
- [ ] [HUMAN] Test marketing features with sample campaigns

### 10.4 Advanced Platform Integrations

- [ ] [AGENT] Add Apple ecosystem integration (Contacts, Calendar)
- [ ] [AGENT] Implement Microsoft 365 integration (Outlook, Teams)
- [ ] [AGENT] Create webhook system for external tool integration
- [ ] [AGENT] Add Zapier/Make.com compatibility
- [ ] [HUMAN] Test integrations with various platforms
- [ ] [HUMAN] Commit and push: "feat(v1): write actions and advanced integrations"

---

## PHASE 11: QUALITY ASSURANCE & OPTIMIZATION

### 11.1 Testing and Validation

- [ ] [AGENT] Add unit tests for core business logic
- [ ] [AGENT] Implement integration tests for API endpoints
- [ ] [AGENT] Create end-to-end tests for critical user flows
- [ ] [AGENT] Add performance testing and optimization
- [ ] [HUMAN] Conduct manual testing across all features

### 11.2 Security and Compliance

- [ ] [HUMAN] Conduct security audit and penetration testing
- [ ] [AGENT] Implement GDPR compliance features (data export, deletion)
- [ ] [AGENT] Add data retention policies and automated cleanup
- [ ] [AGENT] Set up backup and disaster recovery procedures
- [ ] [HUMAN] Review and document security measures

### 11.3 Documentation and Support

- [ ] [AGENT] Create comprehensive user documentation
- [ ] [AGENT] Write API documentation for integrations
- [ ] [AGENT] Document developer setup and deployment procedures
- [ ] [AGENT] Implement in-app help system and onboarding
- [ ] [HUMAN] Commit and push: "docs: comprehensive documentation"

---

## PHASE 12: LAUNCH PREPARATION

### 12.1 Beta Testing Program

- [ ] [HUMAN] Recruit 10-20 beta users (yoga teachers, massage therapists)
- [ ] [AGENT] Implement feedback collection system and analytics
- [ ] [HUMAN] Conduct user interviews and gather feedback
- [ ] [AGENT] Iterate on features based on user feedback
- [ ] [AGENT] Optimize performance based on real usage patterns

### 12.2 Go-to-Market Preparation

- [ ] [HUMAN] Finalize pricing strategy (freemium vs subscription)
- [ ] [AGENT] Create marketing website with landing pages
- [ ] [HUMAN] Prepare launch campaign and content marketing
- [ ] [AGENT] Set up customer support system and knowledge base
- [ ] [HUMAN] Plan launch timeline and success metrics
- [ ] [HUMAN] Commit and push: "feat(launch): go-to-market preparation"

---

## SUCCESS CRITERIA

### MVP (Phase 0-6) Success Metrics

- [ ] User can authenticate and sync Google data
- [ ] Chat assistant answers questions about contacts, emails, calendar
- [ ] Voice input/output works reliably
- [ ] System stays within €50/month budget
- [ ] Response time < 3 seconds for most queries

### V1.0 (Phase 7-12) Success Metrics

- [ ] 50+ active beta users
- [ ] 90%+ uptime in production
- [ ] Average user session > 10 minutes
- [ ] Positive user feedback (4+ stars)
- [ ] Clear path to profitability

---

_This checklist consolidates all tasks from the original planning documents, eliminates redundancy, and provides a clear sequential path from project setup to production launch._
