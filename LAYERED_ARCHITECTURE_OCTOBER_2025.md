# Layered Architecture Refactoring - October 2025

## Overview

This document tracks the systematic refactoring of our application's layered architecture to ensure clean separation of concerns, consistent patterns, and proper type boundaries.

## Source of Truth: Database Schema

### Primary Schema Files

- **`src/server/db/schema.ts`** - Manually synced Drizzle schema (application source of truth)
- **`src/server/db/database.types.ts`** - Direct download from Supabase (database source of truth)

These two files must remain synchronized and serve as the canonical source for all database types.

### Schema Organization Philosophy

**Business Schemas (`src/server/db/business-schemas/`)** should exist ONLY for:

- API-specific request/response schemas
- Query parameter schemas
- Schemas that differ from database types
- Business logic validations that extend beyond database constraints

**Criteria for business-schemas**: A type should only exist here if it represents an API contract or business rule that differs from the raw database schema.

---

## Phase 1: Business Schemas Audit

### Objective

Verify each business-schema file contains ONLY unique types not already in `schema.ts` and are required for the API. Remove duplicates and unnecessary abstractions.

### 23 Business Schemas to Audit

| File                                                    | Status       | Date Completed |
| ------------------------------------------------------- | ------------ | -------------- |
| `src/server/db/business-schemas/admin.ts`               | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/ai-insights.ts`         | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/calendar.ts`            |              |                |
| `src/server/db/business-schemas/contact-identities.ts`  | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/contacts.ts`            | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/documents.ts`           |              |                |
| `src/server/db/business-schemas/embeddings.ts`          |              |                |
| `src/server/db/business-schemas/gmail.ts`               | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/google-auth.ts`         | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/google-prefs.ts`        |              |                |
| `src/server/db/business-schemas/health.ts`              | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/ignored-identifiers.ts` |              |                |
| `src/server/db/business-schemas/index.ts`               |              |                |
| `src/server/db/business-schemas/interactions.ts`        | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/jobs.ts`                | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/notes.ts`               | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/onboarding.ts`          | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/productivity.ts`        |              |                |
| `src/server/db/business-schemas/raw-events.ts`          |              |                |
| `src/server/db/business-schemas/storage.ts`             | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/sync-progress.ts`       | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/tasks.ts`               | ✅ Completed | 2025-10-04     |
| `src/server/db/business-schemas/user-management.ts`     | ✅ Completed | 2025-10-04     |

**Legend:**

- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed - Unique types only
- ⚠️ Completed - Issues found (see notes)

---

## Phase 2: Repository Layer Refactoring

### Objectives

Refactor each repository file to ensure:

1. **Separation of Concerns** - Data access only, no business logic
2. **Consistent Error Handling** - Uniform error patterns across all repos
3. **Clear Type Boundaries** - Proper use of schema types vs business types
4. **Consistent Patterns** - Standardized method signatures and return types

### 20 Repository Files to Audit

| File                                            | Status         | Date Completed |
| ----------------------------------------------- | -------------- | -------------- |
| `packages/repo/src/ai-insights.repo.ts`         | ⬜ Not Started | -              |
| `packages/repo/src/auth-user.repo.ts`           | ⬜ Not Started | -              |
| `packages/repo/src/contact-identities.repo.ts`  | ⬜ Not Started | -              |
| `packages/repo/src/contacts.repo.ts`            | ⬜ Not Started | -              |
| `packages/repo/src/documents.repo.ts`           | ⬜ Not Started | -              |
| `packages/repo/src/embeddings.repo.ts`          | ⬜ Not Started | -              |
| `packages/repo/src/health.repo.ts`              | ⬜ Not Started | -              |
| `packages/repo/src/ignored-identifiers.repo.ts` | ⬜ Not Started | -              |
| `packages/repo/src/inbox.repo.ts`               | ⬜ Not Started | -              |
| `packages/repo/src/index.ts`                    | ⬜ Not Started | -              |
| `packages/repo/src/interactions.repo.ts`        | ⬜ Not Started | -              |
| `packages/repo/src/jobs.repo.ts`                | ⬜ Not Started | -              |
| `packages/repo/src/notes.repo.ts`               | ⬜ Not Started | -              |
| `packages/repo/src/onboarding.repo.ts`          | ⬜ Not Started | -              |
| `packages/repo/src/productivity.repo.ts`        | ⬜ Not Started | -              |
| `packages/repo/src/raw-events.repo.ts`          | ⬜ Not Started | -              |
| `packages/repo/src/schema-canaries.test.ts`     | ⬜ Not Started | -              |
| `packages/repo/src/search.repo.ts`              | ⬜ Not Started | -              |
| `packages/repo/src/user-integrations.repo.ts`   | ⬜ Not Started | -              |
| `packages/repo/src/zones.repo.ts`               | ⬜ Not Started | -              |

**Legend:**

- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed - All criteria met
- ⚠️ Completed - Needs follow-up (see notes)

---

## Phase 3: Service Layer Refactoring

### 22 Service Files to Audit

| File                                                 | Status | Date Completed |
| ---------------------------------------------------- | ------ | -------------- |
| `src/server/services/ai-insights.service.ts`         |        |                |
| `src/server/services/contact-identities.service.ts`  |        |                |
| `src/server/services/contacts.service.ts`            |        |                |
| `src/server/services/debug.service.ts`               |        |                |
| `src/server/services/documents.service.ts`           |        |                |
| `src/server/services/drive-preview.service.ts`       |        |                |
| `src/server/services/embeddings.service.ts`          |        |                |
| `src/server/services/google-integration.service.ts`  |        |                |
| `src/server/services/health.service.ts`              |        |                |
| `src/server/services/ignored-identifiers.service.ts` |        |                |
| `src/server/services/inbox.service.ts`               |        |                |
| `src/server/services/job-creation.service.ts`        |        |                |
| `src/server/services/job-processing.service.ts`      |        |                |
| `src/server/services/notes.service.ts`               |        |                |
| `src/server/services/onboarding.service.ts`          |        |                |
| `src/server/services/productivity.service.ts`        |        |                |
| `src/server/services/raw-events.service.ts`          |        |                |
| `src/server/services/storage.service.ts`             |        |                |
| `src/server/services/supabase-auth.service.ts`       |        |                |
| `src/server/services/sync-progress.service.ts`       |        |                |
| `src/server/services/user-deletion.service.ts`       |        |                |
| `src/server/services/user-export.service.ts`         |        |                |

---

## Refactoring Checklist

Refer to @LAYER_ARCHITECTURE_BLUEPRINT_2025.md for the detailed blueprint of the refactoring process.

### Progress Tracking

### Phase 1: Business Schemas

- **Total Files**: 21
- **Completed**: 20
- **In Progress**: 0
- **Not Started**: 1
- **Progress**: 95%

### Phase 2: Repository Layer

- **Total Files**: 17
- **Completed**: 2
- **In Progress**: 0
- **Not Started**: 15
- **Progress**: 12%

### Phase 3: Service Layer

- **Total Files**: 21
- **Completed**: 0
- **In Progress**: 0
- **Not Started**: 21
- **Progress**: Initial implementation

---

## Notes & Decisions

### Date: 2025-10-09

- Document created
- Files catalogued and ready for audit

---

## Next Steps

1. Begin Phase 1: Audit business-schemas files
2. Phase 2: Repository Auditing
3. Phase 3: Service Layer Auditing
4. Phase 4: Api Layer Auditing
5. Phase 5: Frontend Hooks Auditing
6. Phase 6: Frontend Utilities Auditing
7. Phase 7: Frontend Errors Auditing
8. Phase 8: Frontend Documentation Auditing
