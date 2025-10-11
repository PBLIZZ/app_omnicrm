# Consolidated Architecture & Code Quality Audit Report

**Date:** October 9, 2025  
**Auditor:** Lead Software Architect  
**Scope:** Comprehensive codebase audit against `LAYER_ARCHITECTURE_BLUEPRINT_2025.md`

## Executive Summary

The refactoring initiative made meaningful progress in core domains (Contacts, Notes, Storage), yet critical architectural drift persists in high-impact areas (Productivity, Onboarding, AI Insights, remaining API routes, front-end hooks). Security guardrails are inconsistent, and technical debt in orchestration layers hampers maintainability. Immediate remediation is required to restore blueprint alignment and reduce operational risk.

**Overall Architectural Adherence:** 5/10  
**Overall Code Quality:** 4/10

## Critical Issues (Highest Priority)

- **Security vulnerabilities**
  - **[Productivity Service & Repository]** Unvalidated JSONB payloads, missing authorization checks, and direct exposure of rich task metadata (`src/server/services/productivity.service.ts`, `packages/repo/src/productivity.repo.ts`).
  - **[Onboarding Service]** Insufficient validation for file uploads and public form submissions; rate limiting inconsistent (`src/server/services/onboarding.service.ts`).
  - **[AI Insights Service]** Subject access not verified before retrieval (`src/server/services/ai-insights.service.ts`).
  - **[API Routes]** Manual handlers (`src/app/api/google/status/route.ts`, `src/app/api/notes/[noteId]/route.ts`) bypass standardized auth/validation wrappers, returning ad-hoc responses.

- **Major architectural violations**
  - **Class-based services and mixed patterns** (`ProductivityService`, `OnboardingService`, `HealthService`) contradict functional service mandate.
  - **Repositories performing business logic** (complex DTO transforms, analytics in `packages/repo/src/productivity.repo.ts`).
  - **Inconsistent handler usage in API layer** (custom `Response.json` handling, manual switch statements in `src/app/api/omni-momentum/inbox/route.ts`).

## Secondary Issues (High Priority)

- **Performance bottlenecks**
  - Productivity domain executes sequential ancillary queries; client-side filtering/post-processing increases latency.
  - API hooks (`src/hooks/use-inbox.ts`) poll aggressively with heavy optimistic updates, risking UI thrash.

- **High complexity / over-engineering**
  - monolithic `useInbox()` hook (>500 LOC) and `ProductivityService` (>700 LOC) violate SRP, hindering changes.
  - Repositories and services mix dependency injection patterns, increasing cognitive overhead.

- **Minor architectural deviations**
  - Barrel exports expose UI DTOs from business schemas (`src/server/db/business-schemas/index.ts`).
  - Front-end hooks import server validation schemas directly, binding UI to backend internals (`src/hooks/use-zones.ts`).

## Actionable Recommendations

- **[Standardize error handling & services]**
  - Convert class-based services to functional patterns using `getDb()` + repository factory (`ProductivityService`, `OnboardingService`, `HealthService`).
  - Remove `DbResult` / `Result` wrappers; throw `AppError` consistently in repositories and services.

- **[Enforce service boundaries]**
  - Move statistics, DTO mapping, and orchestration from repositories (e.g., `ProductivityRepository`) into dedicated service utilities.
  - Relocate switch-based routing logic from API handlers (`omni-momentum/inbox/route.ts`) into service dispatchers.

- **[Harden security posture]**
  - Introduce scoped validation/redaction helpers for JSONB fields before returning to clients (`contacts.ts`, productivity DTOs).
  - Implement subject ownership checks in AI/Onboarding flows and tighten file upload validation (type checks, malware scanning hooks).
  - Adopt middleware/handler wrappers uniformly to ensure auth, rate limiting, and error formatting.

- **[Streamline API handlers]**
  - Migrate remaining manual route handlers (`google/status`, `notes/[noteId]`, onboarding admin endpoints) to `handleAuth`/`handleGetWithQueryAuth` with explicit response schemas.
  - Update `src/app/api/README.md` with migration checklist; add lint rule to forbid direct `Response.json` in route modules.

- **[Reduce complexity]**
  - Break `useInbox()` into focused hooks (`useInboxItems`, `useInboxStats`, `useInboxActions`) and extract shared retry/optimistic update helpers to `@/lib/queries/`.
  - Decompose `ProductivityService` into orchestration + transformation modules; document responsibilities.

- **[Improve consistency & documentation]**
  - Create client-facing DTOs in `src/types/` to avoid importing server schemas in hooks.
  - Document dependency injection and handler patterns; ensure `api/README` reflects final architecture.

## Health Scores & Justification

- **Architectural Adherence: 5/10**
  - ✅ Contacts/Notes/Storage domains align with blueprint.
  - ❌ Productivity, Onboarding, AI Insights, and several API routes still violate core layering principles and handler standards.

- **Code Quality: 4/10**
  - ✅ Some domains feature robust validation and logging.
  - ❌ Security gaps, duplicated logic, complex monolithic services/hooks, and inconsistent error handling significantly degrade quality.

## Next Steps

1. Launch remediation squad focusing on productivity/onboarding domains to shift to functional services and relocate business logic.
2. Refactor manual API routes to standardized handlers and enforce response schemas.
3. Implement security hardening backlog (input validation, authorization checks, file upload safeguards).
4. Decompose oversized hooks/services and extract shared utilities for retry logic and DTO transforms.
5. Establish lint/CI guardrails to prevent regression (ban direct `Response.json`, enforce handler usage, forbid server schema imports in hooks).
