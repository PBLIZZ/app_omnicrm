# Getting Started

## Prerequisites

- Node 20+
- pnpm 9+

## Setup

```bash
pnpm install
cp docs/ops/env.example .env.local
pnpm dev
```

Open <http://localhost:3000>

## Useful commands

- `pnpm dev` – start Next.js dev server
- `pnpm test` – unit/integration tests (Vitest)
- `pnpm e2e` – Playwright end‑to‑end tests (requires `E2E_USER_ID`)
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
