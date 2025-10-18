# OmniCRM

AI‑first CRM built with Next.js and Supabase. This README gives a quick overview and links to deeper docs.

## Quick start

```bash
pnpm install
cp docs/ops/env.example .env.local
pnpm dev
```

## Repo layout

```text
src/
  app/       # Next.js App Router (API and pages)
  components/# UI components (shadcn + app components)
  server/    # Business logic (auth, db, jobs, ai, google)
docs/        # Project documentation (see below)
supabase/    # SQL files (source of truth for DB changes)
```

## Documentation

### Architecture & Patterns

- **Refactoring Patterns**: `docs/REFACTORING_PATTERNS_OCT_2025.md` - Current architecture standards
- **Layer Architecture Blueprint**: `docs/LAYER_ARCHITECTURE_BLUEPRINT_2025.md` - Complete blueprint
- **API Routes**: `src/app/api/README.md` - API handler patterns (includes OAuth patterns)
- **AI Assistant Guidance**: `CLAUDE.md` - For AI coding assistants
- **Repository Guidelines**: `AGENTS.md` - Quick reference for agents

### Operations & Development

- **Security**: `SECURITY.md` - Security overview
- **Error Handling**: `src/lib/observability/README.md` - Observability patterns
- **Database**: `docs/roadmap/DatabaseDoctrine.md` - Database doctrine
- **Testing**: `docs/qa/README.md` - Testing strategy
- **Roadmap**: `docs/roadmap/README.md` - Feature roadmap
- **Ops/Deploy**: `docs/ops/README.md` - Deployment guide
