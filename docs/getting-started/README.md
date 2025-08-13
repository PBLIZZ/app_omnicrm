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
- `pnpm typecheck` – TypeScript

## Docs to read next

- Architecture: docs/architecture/README.md
- API: docs/api/README.md
- QA & Testing: docs/qa/README.md
- Operations: docs/ops/README.md
