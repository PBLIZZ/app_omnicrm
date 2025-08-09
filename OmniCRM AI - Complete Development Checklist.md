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
- [ ] [AGENT] Add user session management utilities

---

## PHASE 3: BACKGROUND JOBS & PROCESSING

### 3.1 Job Queue System

- [ ] [AGENT] Create job types at `src/server/jobs/types.ts`: "normalize" | "embed" | "insight"
- [ ] [AGENT] Implement enqueue helper at `src/server/jobs/enqueue.ts`
- [ ] [AGENT] Create job runner API at `/api/jobs/runner`
- [ ] [AGENT] Add job status tracking and error handling
- [ ] [HUMAN] Test job processing with manual trigger
- [ ] [HUMAN] Commit and push: "feat(jobs): queue system and runner endpoint"

### 3.2 Data Processing Workers

- [ ] [AGENT] Implement normalize processor (raw_events → interactions)
- [ ] [AGENT] Implement embed processor (text chunking → embeddings via OpenAI/OpenRouter)
- [ ] [AGENT] Implement insight processor (LLM analysis → ai_insights)
- [ ] [AGENT] Add retry logic and exponential backoff
- [ ] [HUMAN] Test each processor individually

---

## PHASE 4: GOOGLE INTEGRATION (MVP - READ-ONLY)

### 4.1 Google OAuth Setup

- [ ] [HUMAN] Create Google Cloud project and OAuth credentials
- [ ] [AGENT] Configure Google OAuth with read-only scopes:
  - `gmail.readonly`
  - `calendar.readonly`
  - `drive.readonly` (optional)
- [ ] [AGENT] Implement OAuth flow and token management
- [ ] [AGENT] Add secure token storage and refresh logic
- [ ] [HUMAN] Test Google authentication and permissions

### 4.2 Data Ingestion Pipeline

- [ ] [AGENT] Implement Gmail sync service (emails → raw_events)
- [ ] [AGENT] Implement Calendar sync service (events → raw_events)
- [ ] [AGENT] Implement Drive sync service (documents → raw_events)
- [ ] [AGENT] Add incremental sync with pagination and rate limiting
- [ ] [AGENT] Create sync status tracking and error handling
- [ ] [HUMAN] Test full ingestion pipeline with real Google account
- [ ] [HUMAN] Commit and push: "feat(sync): Google data ingestion pipeline"

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

---

## PHASE 8: DEPLOYMENT & INFRASTRUCTURE

### 8.1 Vercel Deployment

- [ ] [HUMAN] Create Vercel project linked to GitHub repository
- [ ] [HUMAN] Configure all environment variables in Vercel
- [ ] [HUMAN] Set up automatic deployments on main branch
- [ ] [HUMAN] Configure custom domain (optional)
- [ ] [HUMAN] Test production deployment thoroughly

### 8.2 Production Configuration

- [ ] [HUMAN] Update Supabase auth redirect URLs for production
- [ ] [AGENT] Configure CORS settings for production domains
- [ ] [AGENT] Set up error monitoring and logging
- [ ] [AGENT] Add health checks and uptime monitoring
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
