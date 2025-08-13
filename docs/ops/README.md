# Operations

- Deployment guide: docs/ops/deploy.md
- Secrets and environment guidance: docs/ops/DEPLOY_SECRETS.md
- Example environment file: docs/ops/env.example
- Environment variables reference: docs/ops/environment-variables.md
- Feature flags: docs/ops/feature-flags.md
- Release process: docs/ops/release.md

Production notes:

- Verify `/api/health` after deploy
- Check CSP and rate‑limit headers
- Configure uptime checks with `HEALTHCHECK_URL`
