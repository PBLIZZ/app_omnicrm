# Google Integration

- Purpose: OAuth token handling and Google API clients for Gmail and Calendar.
- Key files:
  - `client.ts`: constructs OAuth2 + Gmail/Calendar clients; encrypts/decrypts tokens; auto-refresh persists updates.
  - `gmail.ts`: preview helpers and pagination utilities.
  - `calendar.ts`: preview helpers and event listing.
- Data: Tokens stored encrypted in `user_integrations`; never exposed to client.

Add new provider logic:

- Extend `client.ts` with factory and token persistence
- Implement provider-specific helpers alongside Gmail/Calendar
- Keep functions small, typed, and testable (DI accepted)
