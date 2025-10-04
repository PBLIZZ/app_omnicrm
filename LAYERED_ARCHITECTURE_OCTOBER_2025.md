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

Verify each business-schema file contains ONLY unique types not already in `schema.ts`. Remove duplicates and unnecessary abstractions.

### Files to Audit

| File | Status | Date Checked | Notes |
|------|--------|--------------|-------|
| `src/server/db/business-schemas/admin.ts` | ✅ Completed - Unique types only | 2025-10-04 | No duplicates found. Contains only API-specific request/response schemas for admin operations. |
| `src/server/db/business-schemas/ai-insights.ts` | ✅ Completed - Unique types only | 2025-10-04 | Removed duplicate base types. Now re-exports `AiInsight`, `CreateAiInsight`, `UpdateAiInsight` from schema.ts. Added `AiInsightWithUISchema` for UI-enhanced version with computed fields. |
| `src/server/db/business-schemas/calendar.ts` | ✅ Completed - Unique types only | 2025-10-04 | Removed duplicate base types. Now re-exports `CalendarEvent`, `CreateCalendarEvent`, `UpdateCalendarEvent` from schema.ts. Added `CalendarEventWithUISchema` for UI-enhanced version with computed fields. |
| `src/server/db/business-schemas/chat.ts` | ✅ Completed - Unique types only | 2025-10-04 | No duplicates found. Contains only API-specific request/response schemas for chat/RAG functionality. |
| `src/server/db/business-schemas/contacts.ts` | ✅ Completed - Unique types only | 2025-10-04 | Removed duplicate base types. Now re-exports `Contact`, `CreateContact`, `UpdateContact` from schema.ts. Kept API-specific schemas like `ContactResponseSchema`, `ContactListResponseSchema`, `CreateContactBodySchema`, etc. |
| `src/server/db/business-schemas/interactions.ts`    | ✅ Completed - Unique types only | 2025-10-04 | Removed duplicate base types. Now re-exports `Interaction`, `CreateInteraction`, `UpdateInteraction` from schema.ts. Added `InteractionWithUISchema` for UI-enhanced version with computed fields. |
| `src/server/db/business-schemas/jobs.ts`            | ✅ Completed - Unique types only | 2025-10-04 | No duplicates found. Contains only API-specific request/response schemas for job processing and cron operations. |
| `src/server/db/business-schemas/notes.ts`           | ✅ Completed - Unique types only | 2025-10-04 | Removed duplicate base types. Now re-exports `Note`, `CreateNote`, `UpdateNote` from schema.ts. Kept API-specific schemas like `CreateNoteBodySchema`, `UpdateNoteBodySchema`, `GetNotesQuerySchema`. |
| `src/server/db/business-schemas/onboarding.ts`      | ✅ Completed - Unique types only | 2025-10-04 | No duplicates found. Contains only API-specific schemas for token management and onboarding form submission. No database table for onboarding. |
| `src/server/db/business-schemas/projects.ts`        | ✅ Completed - Unique types only | 2025-10-04 | Removed duplicate base types. Now re-exports `Project`, `CreateProject`, `UpdateProject` from schema.ts. Added `ProjectWithUISchema` for UI-enhanced version with computed fields. |
| `src/server/db/business-schemas/storage.ts`         | ✅ Completed - Unique types only | 2025-10-04 | No duplicates found. Contains only API-specific schemas for file upload/download URL generation. No database table for storage. |
| `src/server/db/business-schemas/sync-progress.ts`   | ✅ Completed - Unique types only | 2025-10-04 | No duplicates found. Contains only API-specific schemas for sync session tracking and progress monitoring. |
| `src/server/db/business-schemas/tasks.ts`           | ✅ Completed - Unique types only | 2025-10-04 | Removed duplicate base types. Now re-exports `Task`, `CreateTask`, `UpdateTask` from schema.ts. Added `TaskWithUISchema` for UI-enhanced version with computed fields. |
| `src/server/db/business-schemas/user-management.ts` | ✅ Completed - Unique types only | 2025-10-04 | No duplicates found. Contains only API-specific schemas for GDPR compliance (user export/deletion). No database types involved. |
| `src/server/db/business-schemas/zones.ts`           | ✅ Completed - Unique types only | 2025-10-04 | Removed duplicate base types. Now re-exports `Zone`, `CreateZone`, `UpdateZone` from schema.ts. Added `ZoneWithUISchema` and `ZoneWithStatsSchema` for UI-enhanced versions. |
| `src/server/db/business-schemas/gmail.ts`           | ✅ Completed - Unique types only | 2025-10-04 | No duplicates found. Contains only API-specific schemas for Gmail OAuth, sync operations, and preview functionality. |
| `src/server/db/business-schemas/google-auth.ts`     | ✅ Completed - Unique types only | 2025-10-04 | No duplicates found. Contains only API-specific schemas for Google OAuth callbacks and authentication flows. |
| `src/server/db/business-schemas/health.ts`          | ✅ Completed - Unique types only | 2025-10-04 | No duplicates found. Contains only API-specific schemas for health checks and system monitoring. |
| `src/server/db/business-schemas/inbox.ts`           | ✅ Completed - Unique types only | 2025-10-04 | Removed duplicate base types. Now re-exports `InboxItem`, `CreateInboxItem`, `UpdateInboxItem` from schema.ts. Added `InboxItemWithUISchema` for UI-enhanced version with computed fields. |

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

### Repository Files

| File                                          | Status         | Date Completed | Issues Found | Notes |
| --------------------------------------------- | -------------- | -------------- | ------------ | ----- |
| `packages/repo/src/auth-user.repo.ts`         | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/calendar-events.repo.ts`   | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/contacts.repo.ts`          | ✅ Completed - All criteria met | 2025-10-04 | None | Gold standard pattern for all repos |
| `packages/repo/src/identities.repo.ts`        | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/inbox.repo.ts`             | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/index.ts`                  | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/interactions.repo.ts`      | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/jobs.repo.ts`              | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/momentum.repo.ts`          | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/notes.repo.ts`             | ✅ Completed - All criteria met | 2025-10-04 | None | Removed validation and business logic (PII redaction). Pure data access only. |
| `packages/repo/src/onboarding.repo.ts`        | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/raw-events.repo.ts`        | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/schema-canaries.test.ts`   | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/search.repo.ts`            | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/sync-sessions.repo.ts`     | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/user-integrations.repo.ts` | ⬜ Not Started | -              | -            |       |
| `packages/repo/src/zones.repo.ts`             | ⬜ Not Started | -              | -            |       |

**Legend:**

- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed - All criteria met
- ⚠️ Completed - Needs follow-up (see notes)

---

## Refactoring Checklist

### For Each Business Schema File

- [ ] Identify all type definitions
- [ ] Check if type exists in `schema.ts`
- [ ] Verify type serves unique API/business purpose
- [ ] Remove duplicates or unnecessary abstractions
- [ ] Document reason for keeping unique types

### For Each Repository File

- [ ] **Separation of Concerns**
  - [ ] Contains only data access logic
  - [ ] No business rules or validation logic
  - [ ] No API-specific transformations
  - [ ] Pure database operations only

- [ ] **Consistent Error Handling**
  - [ ] Uses standardized error types
  - [ ] Proper error propagation
  - [ ] Meaningful error messages
  - [ ] Consistent error handling patterns

- [ ] **Clear Type Boundaries**
  - [ ] Uses schema types for DB operations
  - [ ] Proper type imports from schema.ts
  - [ ] No type assertions or `any` types
  - [ ] Clear return type declarations

- [ ] **Consistent Patterns**
  - [ ] Follows repo naming conventions
  - [ ] Proper async/await usage
  - [ ] Uses `getDb()` pattern correctly

---

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

- **Total Files**: TBD
- **Completed**: 1
- **In Progress**: 0
- **Not Started**: TBD
- **Progress**: Initial implementation

| File                                          | Status         | Date Completed | Notes |
| --------------------------------------------- | -------------- | -------------- | ----- |
| `src/server/services/notes.service.ts`        | ✅ Completed - All criteria met | 2025-10-04 | Created following contacts.service.ts pattern. Includes PII redaction, error handling, and business logic orchestration. |

---

## Notes & Decisions

### Date: 2025-10-04

- Document created
- Refactoring approach defined
- Files catalogued and ready for audit
- **Completed contacts.repo.ts refactoring** - Established as gold standard pattern
- **Completed notes.repo.ts refactoring** - Removed all validation and business logic (Zod schemas, PII redaction). Repository now contains only pure data access operations following the contacts.repo.ts pattern.
- **Created notes.service.ts** - Established service layer for notes domain following contacts.service.ts pattern. Includes PII redaction business logic, error handling, and proper separation of concerns.

---

## Next Steps

1. Begin Phase 1: Audit business-schemas files
2. Document findings and remove duplicates
3. Update business-schemas index exports
4. Begin Phase 2: Repository refactoring
5. Establish service layer patterns (Phase 3 - TBD)
