# Front-End Hooks Audit (2025-10-09)

## Scope & Methodology

- **Sources Reviewed**
  - `LAYER_ARCHITECTURE_BLUEPRINT_2025.md`
  - Hooks under `src/hooks/`: `use-contacts.ts`, `use-inbox.ts`, `use-zones.ts`, `use-mobile.ts`
- **Evaluation Criteria**
  - Architectural adherence to layered responsibilities and query orchestration
  - Simplicity and separation of concerns (over-engineering, effect sprawl)
  - Performance considerations (memoization, dependency arrays, cache usage)
  - Security posture (client exposure of sensitive data)

## Architectural Adherence Findings

- **[Query orchestration leakage]** `use-inbox.ts` constructs REST query params manually, bypassing shared clients (`apiClient`) for `fetch` calls and bundling optimistic cache updates, notifications, and retry logic. This blends orchestration (service duties) and view-model responsibilities; blueprint expects hooks to consume service-oriented abstractions rather than replicate them.
- **[Mixed return contracts]** `use-zones.ts` returns either `Zone[]` or `ZoneWithStats[]` depending on `withStats` flag, forcing consumers to branch on runtime type. Blueprint encourages explicit hooks per data contract (`useZones` vs `useZonesWithStats` already exist); the main hook should avoid dual shapes.
- **[Cross-layer types]** Hooks import DTOs directly from `@/server/db/business-schemas`, coupling UI to server validation schemas. Blueprint favors dedicated client-facing types (e.g., `@/types/zones`) derived from API responses to decouple evolution of validation from UI consumption.

## Simplicity & Maintainability

- **[Monolithic hook]** `useInbox()` spans >500 lines with eight mutations, custom retry logic, optimistic updates, and toast orchestration. Complexity makes reasoning difficult and hampers reuse. Split into domain-specific hooks (`useInboxItems`, `useInboxStats`, `useInboxMutations`) with shared helpers for optimistic updates.
- **[Duplicate retry utilities]** `use-inbox.ts` and `use-zones.ts` define identical `shouldRetry` logic. Extract to shared helper (e.g., `@/lib/queries/retry.ts`) to avoid drift.
- **[Toast coupling]** Hooks call `toast` directly (e.g., `use-contacts.ts`), tying data logic to UI notifications. Prefer returning status to components or using event emitters to keep hooks pure and easier to reuse/test.
- **[Inline `URLSearchParams` branching]** `use-contacts.ts` and `use-inbox.ts` handcraft query strings in hooks. Consider centralizing parameter builders alongside API clients to ensure consistent encoding and caching keys.

## Performance Observations

- **[Stale cache settings]** `useContacts()` uses 30-minute `staleTime` and 60-minute `gcTime`, reasonable for CRM lists, but `useContactSuggestions()` lacks caching considerations (no `staleTime`/`cacheTime`), causing refetch on focus/navigation.
- **[Dependency consistency]** The heavy use of `queryKeys` for memoized keys is correct; however, `useInbox()` passes `filters` directly. If `filters` is recreated on render, it can trigger unnecessary refetches. Encourage callers to memoize `filters` or switch to stable key serialization inside the hook.
- **[render thrash risk]** Mutations returning new object references (e.g., `useInbox` returning new functions every render) is typical but can be improved via `useMemo` for the returned API to prevent prop-drilling causing re-renders.

## Security Assessment

- **[Minimal exposure]** Hooks request only expected data. No sensitive server-only fields observed; `useInbox` fetching raw text is intentional. Ensure endpoints sanitize server responses before hitting client.
- **[Mutation payload trust]** `useDeleteContacts()` forwards arbitrary arrays without client-side cap. Align with backend validation to block oversized requests.

## Actionable Recommendations

- **[Modularize inbox hook]** Break `use-inbox.ts` into smaller hooks aligned with operations. Introduce shared helper for optimistic cache manipulation and retry policy.
- **[Extract shared retry helper]** Move duplicated retry logic into `@/lib/queries/retry` and reuse across hooks.
- **[Define client DTOs]** Create dedicated client types under `src/types/` or `src/hooks/types/` rather than importing server business schemas directly.
- **[Introduce API parameter builders]** Centralize query string creation for contacts/zones to ensure consistent ordering and cache keys.
- **[Decouple notifications]** Return mutation status flags and let components trigger toasts, or inject callbacks via options.
- **[Stabilize filter dependencies]** Document expectation that callers memoize filters, or serialize inside hook to avoid unnecessary refetching.
- **[Cache tuning]** Review `useContactSuggestions()` caching strategy; consider `staleTime` to reduce redundant network calls.

## Next Steps

1. Prioritize refactor of `use-inbox.ts` into composable hooks and shared helpers.
2. Align hook typing and parameter builders with new client-facing DTO layer.
3. Schedule follow-up audit post-refactor to ensure complexity and caching goals are met.
