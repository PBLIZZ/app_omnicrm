# Getting Started

## Prerequisites

- Node 20+
- pnpm 9+

## Setup

```bash
pnpm install
cp docs/ops/env.example .env.local
# Set up local PostgreSQL database (optional, for local development)
pnpm db:setup
pnpm dev
```

Open <http://localhost:3001>

## Useful commands

### Development

- `pnpm dev` – start Next.js dev server on port 3001
- `pnpm build` – build production bundle
- `pnpm start` – start production server on port 3001

### Database

- `pnpm db:setup` – set up local PostgreSQL database
- `pnpm db:start` – start PostgreSQL via Docker Compose
- `pnpm db:stop` – stop Docker Compose services

### Testing

- `pnpm test` – unit/integration tests (Vitest)
- `pnpm test:local` – run tests against local PostgreSQL
- `pnpm e2e` – Playwright end‑to‑end tests (requires `E2E_USER_ID`)

### Code Quality

- `pnpm lint` – ESLint
- `pnpm lint:strict` – ESLint with `--max-warnings=0`
- `pnpm typecheck` – TypeScript

## Docs to read next

- Architecture: docs/architecture/README.md
- API: docs/api/README.md
  - CSRF with curl example: `docs/audits/2025-08-18/api-smoke-tests.md`
  - Debug routes are dev-only and 404 in production
- QA & Testing: docs/qa/README.md
- Operations: docs/ops/README.md
