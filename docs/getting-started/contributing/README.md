# Contributing

## Coding standards

- TypeScript strict; no `any`
- Prefer small, well‑named functions and modules
- Keep API handlers thin; put logic in `src/server/*`

## Tests

- Add/maintain unit tests for logic and components
- Add API route tests beside handlers
- Add/extend E2E tests for user flows

## Commit conventions

- Conventional commits (feat, fix, chore, docs, test, refactor)
- Lint and tests must pass locally before PR

## PR checklist

- [ ] Types safe, no `any`
- [ ] Added/updated tests
- [ ] Updated relevant docs under `docs/`

## Linting & Formatting

- ESLint: Next.js Flat config (`eslint.config.mjs`), plus project rules.
  - Shadcn UI components under `src/components/ui/**` are ignored.
  - Explicit function return types enforced with relaxed options (typed expressions, HOFs allowed).
  - TypeScript `noImplicitReturns` and `noFallthroughCasesInSwitch` enabled.
- Scripts:
  - `pnpm lint` – Next.js lint
  - `pnpm lint:strict` – ESLint with `--max-warnings=0`
  - `pnpm format` – Prettier write
- Git hooks: husky + lint-staged
  - On staged `*.{ts,tsx,js,jsx}`: ESLint --fix then Prettier
  - On staged `*.{md,json,css,scss,yml,yaml}`: Prettier
