- we use pnpm

## Pull Request Workflow

When adding commits from a feature branch to main, follow this process:

1. **Create feature branch from main**: `git checkout -b feature-name`
2. **Apply commits to feature branch**: Use `git cherry-pick` or apply changes directly
3. **Push feature branch**: `git push -u origin feature-name`
4. **Create PR**: Use `gh pr create` against main branch
5. **Wait for CI tests**: Let GitHub Actions run typecheck, lint, tests, and build
6. **Review and merge**: Only merge after all CI checks pass

**NEVER commit directly to main branch.** Always use the PR process to ensure CI validation.

## Testing Environment

- E2E tests require `.env.local` to be configured with `DATABASE_URL` and `FEATURE_GOOGLE_*` flags
- Use `pnpm e2e` (auto-loads .env.local) or `./scripts/test-e2e.sh` for e2e tests
- Some e2e tests require actual Google OAuth authentication and may skip if not available
- Run `pnpm test` for unit tests, `pnpm e2e` for e2e tests

### OAuth Authentication for E2E Tests

The skipped e2e test requires both Supabase authentication AND Google OAuth tokens.

**Automated setup (recommended):**

1. Add real Google OAuth tokens to `.env.local`:
   ```
   E2E_GOOGLE_ACCESS_TOKEN=your_actual_access_token
   E2E_GOOGLE_REFRESH_TOKEN=your_actual_refresh_token
   ```
2. Run setup: `pnpm e2e:setup` (creates test user + OAuth tokens)
3. Run tests: `pnpm e2e` or `pnpm e2e:full` (setup + tests)

**Manual setup:**

- Run `pnpm dev`, sign in at `/login`, complete OAuth at `/settings/sync`
- Test user: `test-e2e@example.com` / `test-e2e-password-123`

- Never use `any`

- it might take you some effort and time to fix the lint errors properly but when we come sacross issues we need to resolve the underlying cause. It is not acceptable to put a comment, change the config file, add to ignore list, use underscore, or any other short term fix. Do Not Accrue Technical Debt.
