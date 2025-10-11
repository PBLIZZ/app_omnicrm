# API Routes Audit (2025-10-09)

## Scope & Methodology

- **Blueprint reference**: `LAYER_ARCHITECTURE_BLUEPRINT_2025.md`
- **Code reviewed**:
  - `src/app/api/**`
  - Supporting layers `src/lib/api/`, `src/lib/api-edge-cases.ts`, `src/lib/api.ts`
  - Edge cases in legacy-style routes using `Response.json`
- **Focus Areas**:
  - Architectural adherence: layering, handler usage, service delegation
  - Code quality: security (auth, validation), consistency, simplicity
  - Maintainability: standardized patterns, error handling, duplication

## Architectural Adherence Findings

- **[Handler compliance]** Most routes use `handleAuth`, `handleGetWithQueryAuth`, or `handlePublicGet`. Notable exceptions:
  - `src/app/api/google/status/route.ts` bypasses handler helpers, manually builds `Response.json` and logs errors without structured metadata.
  - `src/app/api/notes/[noteId]/route.ts` and other dynamic routes still use manual `Response.json` + cookie access, diverging from handler pattern.
- **[Business logic leakage]**
  - `src/app/api/omni-momentum/inbox/route.ts` branches on `requestData.type`, orchestrating multiple flows in-route. Services (`InboxService`) return `Result`, but route handles both branching and response shaping. Blueprint expects service orchestration there.
  - `src/app/api/google/status/route.ts` triggers `GoogleIntegrationService.getStatus` with `autoRefresh` and handles token refresh logic inline; should rely on service to encapsulate refresh side-effects and use handler wrappers for error normalization.
- **[Mixed DTO usage]** Several routes parse into business schemas but then return raw service results without re-validation (e.g., `contacts/[contactId]/route.ts` GET path). Blueprint expects response schema enforcement via handlers to avoid drift.
- **[Legacy patterns]** In `src/app/api/omni-momentum/tasks/[taskId]/route.ts`, `NextRequest` import and manual handler instantiation per method increases complexity; new pattern is direct `export const GET = handleAuth(...)`. Update to consistent export style.

## Code Quality Review

### Security

- **[Auth enforcement gaps]**
  - `src/app/api/google/status/route.ts` uses `getAuthUserId` but lacks schema validation and error translation into API-standard responses. Should migrate to `handleAuth` with explicit payload to ensure consistent auth error handling.
  - `src/app/api/notes/[noteId]/route.ts` relies on cookies + `getServerUserId`; check parity with `auth-simple` and consider aligning with standard handlers to leverage consistent auth failures.
- **[Validation coverage]** Most handlers validate request bodies/queries using Zod. However:
  - `contacts/[contactId]/route.ts` GET returns `contactWithNotes` without schema enforcement; notes array shape may leak sensitive data without validation.
  - `omni-momentum/inbox/route.ts` returns dynamic union manually; consider using specific schemas per response path to guarantee shape.
- **[Error formatting]** Manual `Response.json` blocks inconsistent error payloads; some return `{ error, details }`, others `{ success: false }`. Standardize via handlers or shared error builder.

### Simplicity & Maintainability

- **[Manual Response handling]** About a dozen routes still manually parse params and return `Response.json` (e.g., `notes/[noteId]/route.ts`, onboarding admin routes). Increases duplication of error handling.
- **[Switch-based branching]** `omni-momentum/inbox/route.ts` and `inbox/process/route.ts` rely on large switch statements; blueprint suggests moving this to service-level command dispatch.
- **[Temporary TODO endpoints]** Admin routes return static responses with TODO comments. Ensure production endpoints either disabled via feature flags or removed to avoid confusion.
- **[Inconsistent logging]** some routes `console.error` without structured metadata (violates observability guidelines).

## Actionable Recommendations

- **[Migrate remaining manual routes]** Refactor `google/status`, `notes/[noteId]`, onboarding admin routes to use `handleAuth`/`handleGetWithQueryAuth`. This ensures consistent auth, validation, and response formatting.
- **[Delegate branching to services]** Move the `type` switch from `omni-momentum/inbox/route.ts` into `InboxService` (e.g., `InboxService.dispatchAction(userId, payload)`) returning unified response objects.
- **[Enforce response schemas]** Ensure GET handlers returning enriched data (contacts with notes, inbox stats) wrap service responses with appropriate Zod schemas before returning.
- **[Standardize error logging]** Replace direct `console.error` with structured logging helper from `@/lib/observability` if available.
- **[Audit admin endpoints]** For disabled admin routes, either guard behind environment flags or remove until functionality restored; ensure blueprint alignment.
- **[Document handler usage]** Update `src/app/api/README.md` to include migration checklist for remaining manual routes and tracking table of handler adoption.

## Next Steps

1. Prioritize refactor of manual routes (`google/status`, `notes/[noteId]`, onboarding admin) into standardized handlers.
2. Collaborate with services team to shift inbox branching logic out of route layer.
3. Create lint rule or codemod to flag direct `Response.json` usage in route files.
