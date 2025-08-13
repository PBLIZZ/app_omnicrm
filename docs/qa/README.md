# OmniCRM Testing Guide

This document is a practical guide to running, maintaining, and extending the test suites in this repository. It captures fixes and best practices introduced during stabilization work across unit, integration, and end‑to‑end (E2E) tests.

## Test categories

- Unit and integration (Vitest)
  - Location: `src/**/__tests__/**/*.test.ts(x)` and API route tests in `src/app/**/route.test.ts`
  - Command: `pnpm test`
- End‑to‑end (Playwright)
  - Location: `e2e/*.spec.ts`
  - Command: `pnpm e2e` (see E2E auth bootstrap below)
- Lint and type-safety
  - Lint: `pnpm lint`
  - Typecheck: `pnpm typecheck`
  - Build (Next.js): `pnpm build`

## Prerequisites

- Node + pnpm installed (`pnpm -v`)
- Dependencies installed: `pnpm install`
- Environment variables loaded (see `docs/ops/env.example`)

## Running the full pipeline locally

```bash
pnpm lint
pnpm typecheck
pnpm test
# See E2E bootstrap below for the user env
E2E_USER_ID=<uuid-of-test-user> pnpm e2e
```

Notes:

- Next.js warnings like “Critical dependency: the request of a dependency is an expression” from Supabase Realtime are benign during tests.

## E2E authentication bootstrap (no external auth)

To run browser flows without external auth providers, we use a deterministic test user:

- Middleware sets a non-HTTP-only cookie `e2e_uid` when `E2E_USER_ID` is present and `NODE_ENV !== 'production'` (see `src/middleware.ts`).
- Server auth resolver returns that user id in non‑production (see `src/server/auth/user.ts`).

Run E2E with:

```bash
E2E_USER_ID=<uuid-of-test-user> pnpm e2e
```

If you need data for this user, use Supabase SQL seeds under `supabase/sql/` to create rows associated to your UUID.

## Stable selector and async patterns (E2E)

- Prefer unique ARIA names for clickable table rows
  - Contact rows expose `role="button"` with `aria-label="Open contact <Name>"`
  - Each row includes `data-testid="open-contact-<id>"`
  - Open first row: `page.locator('[data-testid^="open-contact-"]').first()`
- Avoid ambiguous `getByText("Name")` after actions
  - Prefer details heading: `getByRole('heading', { level: 1 })`
  - Prefer row button ARIA: `getByRole('button', { name: 'Open contact <Name>' })`
- Radix Dialog lifecycle
  - After Save/Create, wait for close + detach:
    - `await expect(dialog).toBeHidden()`
    - `await dialog.waitFor({ state: 'detached' })`
- Debounced list reload
  - After filling search, wait debounce/poll first row:
    - `await page.waitForTimeout(300)` or
    - `await page.locator('[data-testid^="open-contact-"]').first().waitFor({ state: 'visible' })`
- Toast notifications (Sonner)
  - Assert toast message text (e.g., `/created|saved|added/i`)
- Keyboard navigation
  - A “Skip to main content” link may receive focus first; focus inputs explicitly when needed: `await page.getByLabel('Search contacts').focus()`
- URL assertions
  - Use `await expect(page).toHaveURL(/\/contacts\/[^/]+$/)` for transitions

## Next.js App Router tips (API route tests)

Dynamic route params are a Promise in Next 15; await before use:

```ts
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```

## Common failure patterns and fixes

- Duplicate/ambiguous text
  - Replace `getByText('John Doe')` with heading or ARIA row button assertions
- Dialog not closing
  - Always wait for hidden + detached after submit
- Search debounce/race
  - Wait ~300ms or poll first row visibility before interacting
- Toast not found
  - Assert the toast message content, not container visibility
- Unexpected end of JSON input
  - Ensure URL + key element assertions before reading page content that depends on API

## How to add new E2E tests (contacts domain)

- Navigate
  - Wait for `[data-testid^="open-contact-"]` then open `.first()`
  - Verify URL change, then assert details heading
- Create/edit flows
  - Scope queries to dialog: `const dialog = page.getByRole('dialog')`
  - After saving, wait for detachment
- Bulk actions
  - Use explicit checkbox selectors: `input[type="checkbox"][aria-label^="Select <prefix>"]`
  - Assert bulk bar text: `/\d+ selected/`

## Running subsets efficiently

- Vitest: `pnpm test -t "ContactTable"`
- Playwright: `pnpm e2e --grep "Contact Management"` or `pnpm e2e e2e/contact-crud-flow.spec.ts`

## Conventions and guardrails

- Do not edit `src/server/db/schema.ts` directly; schema is managed externally and mirrored here by the user
- No `any` types; keep TypeScript strict
- Prefer explicit ARIA and `data-testid` hooks over brittle CSS/text selectors
- Keep tests deterministic; prefer polling explicit UI signals over long timeouts

## CI notes

- Run `pnpm build` in CI to catch route handler signature issues and type‑lint warnings early
- Execute `pnpm test` before E2E for fast feedback
- For E2E, set `E2E_USER_ID` to your seeded test user UUID

## Quick commands

```bash
# Lint and typecheck
pnpm lint && pnpm typecheck

# Unit/integration tests
pnpm test

# E2E with test user
E2E_USER_ID=<uuid-of-test-user> pnpm e2e

# Single E2E file
E2E_USER_ID=<uuid-of-test-user> pnpm e2e e2e/contact-crud-flow.spec.ts

# Grep by title
E2E_USER_ID=<uuid-of-test-user> pnpm e2e --grep "Contact Details"
```

## Appendix: Files touched during stabilization

- Selectors and UI
  - `src/components/contacts/ContactTable.tsx`: added `data-testid="open-contact-<id>"` to rows
  - `src/components/contacts/ContactListHeader.tsx`: search input label, safe actions
- API route correctness
  - `src/app/api/contacts/[id]/route.ts`: awaited dynamic route params
- E2E targeting and resilience
  - `e2e/contact-management.spec.ts`, `e2e/contact-crud-flow.spec.ts`, `e2e/contact-details.spec.ts`
- E2E auth bootstrap
  - `src/middleware.ts`: sets `e2e_uid` cookie in non‑prod when `E2E_USER_ID` is set
  - `src/server/auth/user.ts`: resolves `e2e_uid` cookie for non‑prod requests

This guide should keep tests reliable and fast as the application evolves. When adding new UI, add stable ARIA names and `data-testid` hooks so tests remain unambiguous.
