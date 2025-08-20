# OmniCRM

AI‑first CRM built with Next.js and Supabase. This README gives a quick overview and links to deeper docs.

**Test edit for Claude PR review workflow verification.**

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

- Docs index: docs/README.md
- Security overview: SECURITY.md
- API overview: docs/api/README.md
- Ops/deploy: docs/ops/README.md
- Database doctrine: docs/database/README.md
- Roadmap: docs/roadmap/README.md
- Testing/QA: docs/qa/README.md

For AI‑assistant specific guidance, see `CLAUDE.md`.
