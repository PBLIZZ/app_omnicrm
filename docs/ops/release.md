# Release Process

1. Ensure green CI on main (typecheck, lint, unit, e2e)
2. Verify `/api/health` in preview deployment
3. Review CSP and headers (see SECURITY.md)
4. Promote previous successful deployment to production if needed (rollback)
5. Post‑deploy: run smoke tests, verify OAuth callback and sync previews

Versioning: semantic (major.minor.patch). Maintain changelog in PRs and summarize in releases.
