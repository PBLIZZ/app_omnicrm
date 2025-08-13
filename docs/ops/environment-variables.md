# Environment Variables Reference

Server-only (never exposed to client):

- `SUPABASE_SECRET_KEY` – service role key (production only)
- `APP_ENCRYPTION_KEY` – 32-byte key (base64 preferred)
- `GOOGLE_CLIENT_SECRET`

Public (safe for client):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

Either (as needed):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_REDIRECT_URI`
- `APP_ORIGINS` – comma-separated origins
- `FEATURE_GOOGLE_GMAIL_RO` – "1" | "0"
- `FEATURE_GOOGLE_CALENDAR_RO` – "1" | "0"
- `API_RATE_LIMIT_PER_MIN` – default 60
- `API_MAX_JSON_BYTES` – default 1000000

Testing/E2E:

- `E2E_USER_ID` – UUID of deterministic test user
