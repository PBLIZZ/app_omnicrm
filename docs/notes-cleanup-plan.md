# Notes System - Code Cleanup Plan

**Date:** 2025-10-02  
**Purpose:** Identify and remove ALL redundant code before implementing new Notes system

Based on the new spec, Notes are **standalone session documentation** with NO AI features, NO contact coupling for AI insights, and NO backwards compatibility needed.

---

## 🗑️ Files to DELETE Completely

### 1. AI Note Generation (100% Redundant)

- Per spec: "there will be no notes suggestions by ai"

#### Delete These Files

```bash
src/server/ai/contacts/generate-note-suggestions.ts
src/server/ai/prompts/contacts/generate-note.prompt.ts
```

**Reason:**

- `generateNoteSuggestions()` function generates AI note suggestions
- `buildGenerateNotePrompt()` creates prompts for note generation
- New spec explicitly states NO AI note suggestions
- These are isolated files with no other dependencies

---

### 2. Contact AI Insights System (Notes-Related Parts)

- Per spec: Notes are practitioner-authored session notes, not AI-generated insights

#### Delete AI-Related Files

```bash
src/app/api/contacts/[contactId]/ai-insights/route.ts
src/app/(authorisedRoute)/contacts/_components/ContactAIInsightsDialog.tsx
```

**Reason:**

- AI insights dialog shows AI-generated contact analysis
- Not part of session notes workflow
- New spec focuses on practitioner narrative, not AI suggestions

#### Delete AI-Related Hooks

```bash
src/hooks/use-contacts-bridge.ts
  - useAskAIAboutContact()
  - useGenerateContactEmailSuggestion()
  - useGenerateContactNoteSuggestions()
  - useBulkEnrichContacts()
```

**Keep from this file:**

- `useCreateContactNote()` - Will be refactored to new schema
- `useDeleteContact()` - Unrelated to notes

**Reason:**

- `useAskAIAboutContact` - Generates AI insights (not session notes)
- `useGenerateContactNoteSuggestions` - Generates AI note suggestions (explicitly removed)
- `useGenerateContactEmailSuggestion` - Email AI (unrelated to session notes)
- `useBulkEnrichContacts` - AI enrichment (not session notes)

---

### 3. Note Enhancement Feature

- Per spec: No AI enhancement of notes

#### Remove AI-Related Code from `NoteComposerPopover.tsx`

```typescript
// Lines 133-159: handleEnhance() function
// Lines 7, 242-244: Sparkles icon and Enhance button
// Line 71: isEnhancing state
```

**Reason:**

- Calls non-existent `/api/contacts/${contactId}/notes/enhance` endpoint
- AI enhancement not in new spec
- Clean capture workflow doesn't include AI modification

---

### 4. Contact-Notes Coupling for AI

- Per spec: Notes reference contacts, but no AI analysis of contact+notes together

#### Review and Potentially Remove

```bash
src/server/services/contacts-ai.service.ts (if it exists)
src/app/api/contacts/bulk-enrich/route.ts
src/app/api/contacts/enrich/route.ts
```

**Reason:**

- Bulk enrichment implies AI analysis of contacts
- Not part of session notes workflow
- May be used elsewhere - needs verification

---

### 5. Notes Count & Last Note in Contacts List

- Per spec: "latest note excerpt" in contact card, but NOT in contacts list/table

#### Remove from Contacts Service

```typescript
// src/server/services/contacts.service.ts
export type ContactListItem = Contact & {
  notesCount: number;      // ❌ REMOVE
  lastNote: string | null; // ❌ REMOVE
};
```

#### Remove from Contacts Repository

```typescript
// packages/repo/src/contacts.repo.ts
// Any queries that join notes for count/last note in list view
```

**Reason:**

- New spec: Notes pane is in contact CARD (detail view)
- Contacts LIST (table) doesn't show note counts or previews
- Simplifies contacts list query performance

---

### 6. Duplicate Note Creation UI

- Per spec: Single "Add Note" interface with voice/type/upload

#### Choose ONE and Remove the Other

**Option A: Keep `NoteComposerPopover`** (Recommended)

- Already has voice-to-text
- Popover pattern fits "fast capture"
- Remove dialog-based creation in `contacts-columns.tsx`

**Option B: Keep Dialog in `contacts-columns.tsx`**

- More traditional modal pattern
- Remove `NoteComposerPopover.tsx`

**Files to Review:**

```bash
src/app/(authorisedRoute)/contacts/_components/NoteComposerPopover.tsx
src/app/(authorisedRoute)/contacts/_components/contacts-columns.tsx (ContactAIActions component)
```

**Recommendation:** Keep `NoteComposerPopover`, remove dialog from `contacts-columns.tsx`

---

### 7. Old Note Schema References

**These will break after migration - mark for deletion:**

#### Test Files Using Old Schema

```bash
src/app/(authorisedRoute)/contacts/_components/__tests__/NotesHoverCard.test.tsx
src/app/(authorisedRoute)/contacts/_components/__tests__/NoteComposerPopover.test.tsx
```

**Action:** Rewrite tests with new schema OR delete and recreate

#### Test Factories

```bash
packages/testing/src/factories.ts (note generation)
packages/testing/src/fakes.ts (note fakes)
```

**Action:** Update to generate new schema

---

### 8. Voice-to-Text Implementation

**Current Implementation:**

```bash
src/app/(authorisedRoute)/contacts/_components/NoteComposerPopover.tsx
  - handleVoiceToText() (lines 161-197)
  - Uses Web Speech API
```

**Status:** ✅ KEEP and enhance

- Already implements voice input
- Needs integration with new schema (`sourceType: 'voice'`)
- Needs server-side transcription pipeline per spec

---

## 📋 Detailed Removal Checklist

### Phase 1: Delete AI Note Features

- [ ] **DELETE** `src/server/ai/contacts/generate-note-suggestions.ts`
- [ ] **DELETE** `src/server/ai/prompts/contacts/generate-note.prompt.ts`
- [ ] **DELETE** `src/app/api/contacts/[contactId]/ai-insights/route.ts`
- [ ] **DELETE** `src/app/(authorisedRoute)/contacts/_components/ContactAIInsightsDialog.tsx`
- [ ] **REMOVE** from `src/hooks/use-contacts-bridge.ts`:
  - [ ] `useAskAIAboutContact()`
  - [ ] `useGenerateContactEmailSuggestion()`
  - [ ] `useGenerateContactNoteSuggestions()`
  - [ ] `useBulkEnrichContacts()`
- [ ] **REMOVE** AI insights imports/types from `src/app/(authorisedRoute)/contacts/_components/types.ts`
- [ ] **REMOVE** `ContactAIInsightsResponse` from business schemas (if only used for notes)

### Phase 2: Remove AI Enhancement

- [ ] **REMOVE** `handleEnhance()` from `NoteComposerPopover.tsx`
- [ ] **REMOVE** Enhance button and Sparkles icon
- [ ] **REMOVE** `isEnhancing` state

### Phase 3: Remove Contact AI Integration

- [ ] **REMOVE** AI insights dialog from `ContactDetailsCard.tsx`:
  - [ ] `aiInsightsOpen` state
  - [ ] `aiInsights` state
  - [ ] `askAIMutation` hook
  - [ ] `handleAskAI()` function
  - [ ] `<ContactAIInsightsDialog>` component
  - [ ] "Generate AI Insights" button
- [ ] **REMOVE** AI insights from `contacts-columns.tsx`:
  - [ ] `aiInsightsOpen` state
  - [ ] `aiInsights` state
  - [ ] `askAIMutation` hook
  - [ ] `handleAskAI()` function
  - [ ] `<ContactAIInsightsDialog>` component
  - [ ] AI insights button/icon

### Phase 4: Remove Notes Count from Contacts List

- [ ] **REMOVE** `notesCount` from `ContactListItem` type
- [ ] **REMOVE** `lastNote` from `ContactListItem` type
- [ ] **UPDATE** contacts list query to NOT join notes table
- [ ] **REMOVE** notes count column from contacts table UI (if exists)
- [ ] **UPDATE** all tests that reference `notesCount` or `lastNote`

### Phase 5: Consolidate Note Creation UI

- [ ] **DECIDE:** Keep NoteComposerPopover OR dialog in contacts-columns
- [ ] **REMOVE** duplicate note creation interface
- [ ] **REMOVE** `addNoteDialogOpen` state from whichever is removed
- [ ] **REMOVE** `newNoteContent` state from whichever is removed
- [ ] **REMOVE** `handleAddNote()` from whichever is removed

### Phase 6: Clean Up Business Schemas

- [ ] **REMOVE** from `src/server/db/business-schemas/contacts.ts`:
  - [ ] `ContactAIInsightsResponse` (if only used for notes)
  - [ ] `ContactNoteSuggestion` (AI suggestions)
  - [ ] `ContactEmailSuggestion` (if only used with notes AI)
- [ ] **UPDATE** `ContactWithNotes` type to use new Note schema

### Phase 7: Remove Deprecated API Routes

- [ ] **VERIFY** these routes are unused, then DELETE:
  - [ ] `src/app/api/contacts/bulk-enrich/route.ts`
  - [ ] `src/app/api/contacts/enrich/route.ts`
  - [ ] `src/app/api/contacts/suggestions/route.ts` (if exists)

### Phase 8: Update/Remove Tests

- [ ] **DELETE** or **REWRITE** `NotesHoverCard.test.tsx` with new schema
- [ ] **DELETE** or **REWRITE** `NoteComposerPopover.test.tsx` with new schema
- [ ] **UPDATE** E2E tests to use new note schema
- [ ] **UPDATE** test factories to generate new note schema
- [ ] **REMOVE** AI-related test cases

---

## 🎯 Summary of Deletions

### Complete File Deletions: ~6-8 files

1. `generate-note-suggestions.ts`
2. `generate-note.prompt.ts`
3. `ai-insights/route.ts`
4. `ContactAIInsightsDialog.tsx`
5. `bulk-enrich/route.ts` (verify first)
6. `enrich/route.ts` (verify first)
7. One of: `NoteComposerPopover.tsx` OR dialog in `contacts-columns.tsx`

### Partial File Cleanups: ~6 files

1. `use-contacts-bridge.ts` - Remove 4 hooks, keep 2
2. `NoteComposerPopover.tsx` - Remove AI enhancement
3. `ContactDetailsCard.tsx` - Remove AI insights integration
4. `contacts-columns.tsx` - Remove AI insights + duplicate note UI
5. `contacts.service.ts` - Remove notesCount/lastNote
6. `contacts.ts` (business schemas) - Remove AI types

### Type/Schema Updates: ~4 files

1. `types.ts` - Remove AI types
2. `contacts.ts` (business schemas) - Update ContactWithNotes
3. `contacts.service.ts` - Update ContactListItem
4. `contacts.repo.ts` - Update queries

---

## 🔍 Verification Steps

Before deleting, verify these are truly unused:

1. **Search for imports:**

   ```bash
   grep -r "generateNoteSuggestions" src/
   grep -r "ContactAIInsightsDialog" src/
   grep -r "useAskAIAboutContact" src/
   grep -r "notesCount" src/
   ```

2. **Check API route usage:**

   ```bash
   grep -r "ai-insights" src/
   grep -r "bulk-enrich" src/
   grep -r "note-suggestions" src/
   ```

3. **Verify no external dependencies:**
   - Check if AI insights are used outside notes context
   - Check if bulk enrich is used for other features
   - Check if note counts are displayed anywhere

---

## ⚠️ What NOT to Delete

### Keep These (Used by New System)

1. **`NotesHoverCard.tsx`** - Shows notes preview (update to use `contentPlain`)
2. **`use-notes.ts`** - Core notes hook (update API paths and schema)
3. **`notes.repo.ts`** - Repository layer (update to new schema)
4. **`contacts.service.ts`** - Service layer (update note methods)
5. **`notes/route.ts`** - API routes (update and add PUT/DELETE)
6. **Voice-to-text in NoteComposerPopover** - Keep and enhance
7. **`useCreateContactNote`** - Keep but update to new schema
8. **`useDeleteContact`** - Unrelated to notes, keep as-is

### Keep These (Core Contact Features)

1. Contact CRUD operations
2. Contact list/table (minus note counts)
3. Contact detail card (minus AI insights)
4. Contact avatar, tags, lifecycle stage
5. Contact search and filtering

---

## 📊 Impact Analysis

### Lines of Code to Remove: ~1,500-2,000 LOC

**Breakdown:**

- AI note generation: ~200 LOC
- AI insights dialog: ~150 LOC
- AI hooks: ~200 LOC
- Note enhancement: ~100 LOC
- Duplicate note UI: ~150 LOC
- Notes count queries: ~100 LOC
- Tests for removed features: ~500 LOC
- Type definitions: ~100 LOC

### Files Modified: ~15 files

### Files Deleted: ~6-8 files

### Estimated Cleanup Time: 2-3 hours

---

## 🚀 Cleanup Order (Recommended)

1. **Delete AI files first** (no dependencies)
2. **Remove AI hooks** (update imports in components)
3. **Remove AI UI** (dialogs, buttons)
4. **Remove note enhancement** (isolated feature)
5. **Remove duplicate note UI** (choose one pattern)
6. **Remove notes count** (update queries and types)
7. **Update tests** (or mark for rewrite)
8. **Verify build** (fix any broken imports)

---

## ✅ Success Criteria

After cleanup:

- [ ] No AI-related note code remains
- [ ] No duplicate note creation UIs
- [ ] No notes count in contacts list
- [ ] No broken imports
- [ ] TypeScript compiles successfully
- [ ] All remaining tests pass
- [ ] Clean slate for new implementation

**Next Step:** After cleanup, implement new Notes system per spec
