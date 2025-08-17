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
