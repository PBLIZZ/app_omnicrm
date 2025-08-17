# Feature Flags

- `FEATURE_GOOGLE_GMAIL_RO`: Enable Gmail read‑only integration (1/0)
- `FEATURE_GOOGLE_CALENDAR_RO`: Enable Calendar read‑only integration (1/0)
- `FEATURE_GOOGLE_DRIVE` (future): Enable Drive read‑only preview (1/0)

Usage: Flags are read at runtime in server handlers to gate preview/approve endpoints.
