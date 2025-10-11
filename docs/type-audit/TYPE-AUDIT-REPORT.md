# Type System Forensic Audit Report

**Generated**: 2025-09-29
**Codebase**: OmniCRM

---

## 📊 Executive Summary

- **Total Types Found**: 961
- **Exported Types**: 530
- **Types with Usage**: 178 (33.6%)
- **Dead Code**: 352 types (66.4%)
- **Duplicate Groups**: 121
- **Duplicated Types**: 324 (33.7%)

---

## 🎯 Key Findings

### 1. Massive Dead Code Problem

**352 types (66.4%)** are exported but never imported anywhere.

**Impact**: Removing dead code could eliminate ~7040 lines of type definitions.

### 2. Significant Duplication

**121 groups** of duplicate types affecting **324 type definitions**.

**Top duplicates**:

1. **ChatMessage**: 3 variants, 60 total usages
2. **Contact**: 6 variants, 52 total usages
3. **Note**: 5 variants, 20 total usages
4. **SearchResult**: 6 variants, 18 total usages
5. **ContactWithContext**: 3 variants, 15 total usages

### 3. Unclear Type Origins

**615 types (64.0%)** have no clear database connection or purpose.

---

## 🔴 CRITICAL: Dead Code to Delete

The following 20 types are exported but have **zero usages**:

- `AdminAllowedTable` (src/server/db/admin.ts:16)
- `AIInsight` (packages/testing/src/factories.ts:183)
- `AllowedTable` (src/server/db/supabase-admin.ts:65)
- `ApiBulkDeleteResponse` (src/lib/api/contacts-api.ts:43)
- `ApiContactResponse` (src/lib/api/contacts-api.ts:39)
- `ApiContactsListResponse` (src/lib/api/contacts-api.ts:34)
- `ApiFetchContactsParams` (src/lib/api/contacts-api.ts:22)
- `ApiKeyRotator` (src/server/ai/key-rotation.ts:29)
- `ApiRequestOptions` (src/lib/api/client.ts:54)
- `ApiResult` (src/lib/utils/result.ts:212)
- `AppError` (src/lib/errors/app-error.ts:11)
- `ApprovalResponse` (src/lib/api/sync.api.ts:78)
- `AuthCallbackResult` (src/server/services/supabase-auth.service.ts:22)
- `AuthUserRepoFakes` (packages/testing/src/fakes.ts:394)
- `AuthUserRepository` (packages/repo/src/auth-user.repo.ts:23)
- `AuthUserService` (src/server/services/auth-user.service.ts:22)
- `AuthUserServiceOptions` (src/server/services/auth-user.service.ts:17)
- `AvatarData` (src/server/services/contacts.service.ts:93)
- `AvatarResult` (src/server/services/contacts.service.ts:98)
- `AvatarUploadResponse` (src/server/db/business-schemas/contacts.ts:216)

... and 332 more (see types-usage.json)

**Recommendation**: Delete all dead code types (automated script available)

---

## 🟠 HIGH PRIORITY: Duplicate Groups

### ChatMessage (3 variants, 60 total usages)

**ChatMessage** (src/contexts/RAGContext.tsx:8)

- Role: redefinition
- Usage: 20 files
- **Action**: REVIEW - may need merge or rename

**ChatMessage** (packages/testing/src/factories.ts:127)

- Role: redefinition
- Usage: 20 files
- **Action**: REVIEW - may need merge or rename

**ChatMessage** (src/server/ai/core/llm.service.ts:11)

- Role: redefinition
- Usage: 20 files - 40% structurally similar
- **Action**: REVIEW - may need merge or rename

**DECISION NEEDED**: Approve merge/rename/delete actions above

---

### Contact (6 variants, 52 total usages)

**Contact** (src/server/db/schema.ts:450)

- Role: alias
- Usage: 13 files
- **Action**: MERGE into source type

**Contact** (src/server/db/business-schemas/contacts.ts:43)

- Role: alias
- Usage: 13 files
- **Action**: MERGE into source type

**ContactDTO** (packages/repo/src/contacts.repo.ts:9)

- Role: alias
- Usage: 0 files
- **Action**: DELETE - unused alias

**Contact** (src/**tests**/utils/mock-request.ts:259)

- Role: redefinition
- Usage: 13 files
- **Action**: REVIEW - may need merge or rename

**Contact** (src/app/(authorisedRoute)/omni-rhythm/\_components/types.ts:32)

- Role: redefinition
- Usage: 13 files - 7% structurally similar
- **Action**: RENAME - different entity with same name

**ContactDTO** (packages/testing/src/factories.ts:15)

- Role: redefinition
- Usage: 0 files
- **Action**: REVIEW - may need merge or rename

**DECISION NEEDED**: Approve merge/rename/delete actions above

---

### Note (5 variants, 20 total usages)

**Note** (src/server/db/schema.ts:454)

- Role: alias
- Usage: 6 files
- **Action**: MERGE into source type

**Note** (src/server/db/business-schemas/notes.ts:28)

- Role: alias
- Usage: 6 files - 100% structurally similar
- **Action**: MERGE into source type

**NoteDTO** (packages/repo/src/notes.repo.ts:8)

- Role: alias
- Usage: 1 files - 100% structurally similar
- **Action**: MERGE into source type

**Note** (src/app/(authorisedRoute)/contacts/\_components/NotesHoverCard.tsx:10)

- Role: redefinition
- Usage: 6 files
- **Action**: REVIEW - may need merge or rename

**NoteDTO** (packages/testing/src/factories.ts:114)

- Role: redefinition
- Usage: 1 files - 100% structurally similar
- **Action**: REVIEW - may need merge or rename

**DECISION NEEDED**: Approve merge/rename/delete actions above

---

### SearchResult (6 variants, 18 total usages)

**SearchResult** (src/server/db/business-schemas/gmail.ts:405)

- Role: alias
- Usage: 4 files
- **Action**: MERGE into source type

**SearchResultDTO** (packages/repo/src/search.repo.ts:13)

- Role: alias
- Usage: 1 files - 55% structurally similar
- **Action**: MERGE into source type

**SearchResultType** (src/server/services/semantic-search.service.ts:6)

- Role: alias
- Usage: 1 files
- **Action**: MERGE into source type

**SearchResult** (src/contexts/GlobalSearchContext.tsx:6)

- Role: redefinition
- Usage: 4 files
- **Action**: REVIEW - may need merge or rename

**SearchResult** (src/hooks/use-gmail-ai.ts:7)

- Role: redefinition
- Usage: 4 files - 9% structurally similar
- **Action**: RENAME - different entity with same name

**SearchResult** (src/server/services/semantic-search.service.ts:9)

- Role: redefinition
- Usage: 4 files - 64% structurally similar
- **Action**: REVIEW - may need merge or rename

**DECISION NEEDED**: Approve merge/rename/delete actions above

---

### ContactWithContext (3 variants, 15 total usages)

**ContactWithContext** (src/server/ai/types/connect-types.ts:33)

- Role: redefinition
- Usage: 5 files
- **Action**: REVIEW - may need merge or rename

**ContactWithContext** (src/server/ai/contacts/utils/contact-utils.ts:18)

- Role: redefinition
- Usage: 5 files - 6% structurally similar
- **Action**: RENAME - different entity with same name

**ContactWithContext** (src/server/ai/prompts/contacts/generate-email.prompt.ts:43)

- Role: redefinition
- Usage: 5 files
- **Action**: REVIEW - may need merge or rename

**DECISION NEEDED**: Approve merge/rename/delete actions above

---

### ContactWithNotes (5 variants, 15 total usages)

**ContactWithNotes** (src/server/db/schema.ts:515)

- Role: source-of-truth
- Usage: 6 files
- **Action**: KEEP - this is the canonical definition

**ContactWithNotes** (src/server/db/business-schemas/contacts.ts:310)

- Role: alias
- Usage: 6 files - 100% structurally similar
- **Action**: MERGE into ContactWithNotes

**ContactWithNotesDTO** (src/hooks/use-contacts.ts:14)

- Role: alias
- Usage: 1 files - 100% structurally similar
- **Action**: MERGE into ContactWithNotes

**ContactWithNotesDTO** (packages/repo/src/contacts.repo.ts:12)

- Role: alias
- Usage: 1 files - 100% structurally similar
- **Action**: MERGE into ContactWithNotes

**ContactWithNotesDTO** (src/server/db/business-schemas/contacts.ts:313)

- Role: alias
- Usage: 1 files - 100% structurally similar
- **Action**: MERGE into ContactWithNotes

**DECISION NEEDED**: Approve merge/rename/delete actions above

---

### CreateContact (3 variants, 12 total usages)

**CreateContact** (src/server/db/schema.ts:451)

- Role: alias
- Usage: 6 files
- **Action**: MERGE into source type

**CreateContact** (src/server/db/business-schemas/contacts.ts:68)

- Role: alias
- Usage: 6 files - 100% structurally similar
- **Action**: MERGE into source type

**CreateContactDTO** (packages/repo/src/contacts.repo.ts:10)

- Role: alias
- Usage: 0 files - 100% structurally similar
- **Action**: DELETE - unused alias

**DECISION NEEDED**: Approve merge/rename/delete actions above

---

### nboxItem (3 variants, 12 total usages)

**InboxItem** (src/server/db/schema.ts:494)

- Role: alias
- Usage: 6 files
- **Action**: MERGE into source type

**InboxItem** (src/server/db/business-schemas/inbox.ts:39)

- Role: alias
- Usage: 6 files - 100% structurally similar
- **Action**: MERGE into source type

**InboxItemDTO** (packages/repo/src/inbox.repo.ts:8)

- Role: alias
- Usage: 0 files - 100% structurally similar
- **Action**: DELETE - unused alias

**DECISION NEEDED**: Approve merge/rename/delete actions above

---

### nteraction (5 variants, 12 total usages)

**Interaction** (src/server/db/schema.ts:458)

- Role: alias
- Usage: 4 files - 100% structurally similar
- **Action**: MERGE into source type

**Interaction** (src/server/db/business-schemas/interactions.ts:32)

- Role: alias
- Usage: 4 files - 100% structurally similar
- **Action**: MERGE into source type

**InteractionDTO** (packages/repo/src/interactions.repo.ts:8)

- Role: alias
- Usage: 0 files - 100% structurally similar
- **Action**: DELETE - unused alias

**InteractionType** (packages/testing/src/factories.ts:99)

- Role: alias
- Usage: 0 files - 100% structurally similar
- **Action**: DELETE - unused alias

**Interaction** (packages/testing/src/factories.ts:67)

- Role: redefinition
- Usage: 4 files
- **Action**: REVIEW - may need merge or rename

**DECISION NEEDED**: Approve merge/rename/delete actions above

---

### Zone (3 variants, 10 total usages)

**Zone** (src/server/db/schema.ts:474)

- Role: alias
- Usage: 5 files
- **Action**: MERGE into source type

**Zone** (src/server/db/business-schemas/zones.ts:39)

- Role: alias
- Usage: 5 files - 100% structurally similar
- **Action**: MERGE into source type

**ZoneDTO** (packages/repo/src/zones.repo.ts:8)

- Role: alias
- Usage: 0 files - 100% structurally similar
- **Action**: DELETE - unused alias

**DECISION NEEDED**: Approve merge/rename/delete actions above

... and 111 more groups (see types-duplicates.json)

---

## 🟡 REVIEW NEEDED: Questionable Types

### Fictional Types (No Clear Purpose)

These types have no clear database connection:

- `Action` - not exported (No clear database connection or purpose)
- `AdminAllowedTable` - 0 usages (No clear database connection or purpose)
- `AdminInsertRow` - not exported (No clear database connection or purpose)
- `AdminSelectRow` - not exported (No clear database connection or purpose)
- `AggregateErrorLike` - not exported (No clear database connection or purpose)
- `AiClientInsightsProps` - not exported (No clear database connection or purpose)
- `AIContactIntelligenceResponse` - not exported (No clear database connection or purpose)
- `AIInsight` - 0 usages (No clear database connection or purpose)
- `AiTaskPanelProps` - not exported (No clear database connection or purpose)
- `AllowedTable` - 0 usages (No clear database connection or purpose)
- `AllRepoFakes` - 4 usages (No clear database connection or purpose)
- `ApiBulkDeleteResponse` - 0 usages (No clear database connection or purpose)
- `ApiError` - 1 usages (No clear database connection or purpose)
- `ApiFetchContactsParams` - 0 usages (No clear database connection or purpose)
- `ApiKeyRotator` - 0 usages (No clear database connection or purpose)

... and 481 more

**Questions to Answer**:

1. Is this type part of an incomplete feature?
2. Can this be derived from existing database types?
3. Should this be deleted?

---

## 📈 Statistics by Category

| Category        | Count | % of Total | Dead Code | Avg Usage |
| --------------- | ----- | ---------- | --------- | --------- |
| unknown         | 309   | 32.2%      | 104       | 0.5       |
| business-schema | 179   | 18.6%      | 106       | 0.9       |
| service         | 149   | 15.5%      | 91        | 0.5       |
| component       | 98    | 10.2%      | 14        | 0.6       |
| repository      | 90    | 9.4%       | 24        | 0.3       |
| utility         | 87    | 9.1%       | 61        | 1.0       |
| database        | 49    | 5.1%       | 12        | 2.1       |

---

## 📈 Statistics by Origin

| Origin           | Count | % of Total |
| ---------------- | ----- | ---------- |
| fictional        | 615   | 64.0%      |
| api-boundary     | 179   | 18.6%      |
| ui-only          | 118   | 12.3%      |
| database-derived | 29    | 3.0%       |
| database-table   | 13    | 1.4%       |
| computed         | 7     | 0.7%       |

---

## 🚀 Recommended Action Plan

### Phase 1: Safe Deletions (Immediate - Low Risk)

**Target**: 352 dead code types
**Impact**: Removes ~7040 lines of unused code
**Risk**: NONE (zero usages detected)
**Time**: 30 minutes (automated script)
**Script**: `pnpm tsx scripts/type-forensics/execute-cleanup.ts --delete-dead-code`

### Phase 2: Duplicate Merges (Week 1 - Low-Medium Risk)

**Target**: 53 duplicate groups
**Impact**: Consolidates 87 duplicate definitions
**Risk**: LOW (mechanical refactor)
**Time**: 2-4 hours (semi-automated)
**Requires**: Human review of merge decisions

### Phase 3: Type Renames (Week 1 - Medium Risk)

**Target**: 8 naming conflicts
**Impact**: Clarifies purpose of similar types
**Risk**: MEDIUM (semantic changes)
**Time**: 2 hours
**Requires**: Manual review

### Phase 4: Fictional Type Review (Week 2 - High Priority)

**Target**: 496 types with unclear purpose
**Impact**: Identifies incomplete features, removes cruft
**Risk**: MEDIUM (feature decisions)
**Time**: 3-4 hours (manual review)
**Requires**: Developer knowledge of features

---

## 💾 Data Files

All raw data is available in JSON format:

- [types-inventory.json](./types-inventory.json) - Complete type inventory (961 types)
- [types-usage.json](./types-usage.json) - Usage statistics
- [types-duplicates.json](./types-duplicates.json) - Duplicate analysis (121 groups)
- [types-origins.json](./types-origins.json) - Origin classification

---

## 🎯 Success Metrics

After cleanup, target state:

- ✅ **Zero dead code** (currently 352)
- ✅ **<5 duplicate groups** (currently 121)
- ✅ **<10% fictional types** (currently 64.0%)
- ✅ **Clear purpose for every type** (documented in code)

**Estimated LOC reduction**: 10085 lines (20-25%)

---

## 📝 Next Steps

1. **Review this report** and mark decisions
2. **Run Phase 1** (delete dead code)
3. **Review duplicate groups** and approve merges
4. **Execute Phase 2** (merge duplicates)
5. **Review fictional types** individually
6. **Run validation** (`pnpm typecheck`)

---

_Generated by Type Forensics System_
