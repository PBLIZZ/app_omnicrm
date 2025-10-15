# Fixes and Updates - Google Integrations

**Last Updated:** 2025-10-15  
**Scope:** Gmail + Calendar

## 2025-10-15 — Auto-Refresh Tracking Fix

- Implemented `autoRefreshed` tracking for Gmail/Calendar in `google-integration.service.ts`
- Updated `/api/google/status` to surface `autoRefreshed` from service
- Behavior: reflects which services refreshed tokens on each status call
- Related: `src/server/services/google-integration.service.ts`, `src/app/api/google/status/route.ts`

## 2025-08-29 — Gmail Ingestion Implementation

- Diagnostic endpoints for service role checks and pipeline visibility
- Reliable raw insert strategy for `raw_events` with conflict handling
- End-to-end pipeline: raw_events → interactions → embeddings
- Incremental sync and UI status enhancements
- Related: `GMAIL_INTEGRATION.md`

## 2025-08-26 — Calendar OAuth Fix Report

- Fixed CSRF cookie path, unified OAuth routes
- Updated frontend routes to correct endpoints
- Temporary raw SQL workaround for Drizzle issue
- Related: `CALENDAR_INTEGRATION.md`

---

### Notes

- Drizzle + Supabase: use postgres.js with `prepare: false` to avoid parameter errors
- Keep diagnostics endpoints available in production for faster incident response
