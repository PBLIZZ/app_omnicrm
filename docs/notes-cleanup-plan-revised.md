# Notes System - REVISED Cleanup Plan

**Date:** 2025-10-02  
**Updated:** Based on user clarifications

---

## ✅ What to KEEP (Clarifications)

1. **AI Insights for Contacts** ✅ KEEP
   - `ContactAIInsightsDialog.tsx` - KEEP
   - `useAskAIAboutContact()` - KEEP
   - `/api/contacts/[contactId]/ai-insights` - KEEP
   - AI insights are support tools for practitioners

2. **Notes in Contacts Table** ✅ KEEP (Adapt)
   - Show 300-500 char excerpt on hover
   - "See Notes ↓" indicator when notes exist
   - Hover card shows last note preview
   - Link to full note or contact card
   - **Action:** Adapt existing hover card, don't rebuild yet

3. **Bulk Enrichment** ✅ IGNORE
   - Not related to notes task
   - Leave as-is for now

4. **Notes Count/Last Note** ✅ KEEP (Adapt)
   - Need for hover card functionality
   - Adapt queries to support hover preview

---

## 🗑️ REVISED Deletion List

### 1. ✅ AI Note Generation - DELETE COMPLETELY

**Files to DELETE:**

```bash
src/server/ai/contacts/generate-note-suggestions.ts
src/server/ai/prompts/contacts/generate-note.prompt.ts
```

**Reason:** No AI-generated note suggestions in new workflow

---

### 2. ✅ Specific AI Hooks - DELETE FROM use-contacts-bridge.ts

**Remove ONLY these hooks:**

```typescript
useGenerateContactNoteSuggestions()  // ❌ DELETE
useGenerateContactEmailSuggestion()  // ❌ DELETE
```

**KEEP these hooks:**

```typescript
useAskAIAboutContact()        // ✅ KEEP - AI insights for practitioner
useCreateContactNote()        // ✅ KEEP - Note creation (update to new schema)
useDeleteContact()            // ✅ KEEP - Unrelated to notes
useBulkEnrichContacts()       // ✅ KEEP - Ignore for now
```

---

### 3. ✅ Note Enhancement Feature - DELETE

**Remove from `NoteComposerPopover.tsx`:**

```typescript
// Lines 133-159: handleEnhance() function
// Lines 7, 242-244: Sparkles icon and Enhance button
// Line 71: isEnhancing state
```

**Reason:** No AI enhancement of notes in new workflow

---

### 4. ⚠️ Notes Count/Last Note - ADAPT (Don't Delete)

**Keep but adapt:**

- `notesCount` - For showing "See Notes ↓" indicator
- `lastNote` excerpt - For hover card preview (300-500 chars)

**Action:** Update queries to fetch last note excerpt, not full content

---

### 5. ⚠️ NotesHoverCard - KEEP & ADAPT (Don't Delete)

**Current:** `NotesHoverCard.tsx`
**Action:**

- Keep existing file
- Make it view-only
- Show 300-500 char excerpt of last note
- Add link to full note or contact card
- Don't rebuild now - just adapt

---

### 6. ⚠️ Duplicate Note Creation UI - KEEP BOTH (Adapt Locations)

**New locations per spec:**

1. **Dashboard** - Note creation interface
2. **Contact Card** - Note creation interface

**Current locations:**

- `NoteComposerPopover` - Can be used in contact card
- Dialog in `contacts-columns` - Can be adapted

**Action:** Keep both, adapt for new locations (dashboard + contact card)

---

### 7. ✅ AI Integration in Components - PARTIAL CLEANUP

**In `ContactDetailsCard.tsx` and `contacts-columns.tsx`:**

**REMOVE:**

- Email suggestion functionality
- Note suggestion functionality

**KEEP:**

- `handleAskAI()` - AI insights for contact
- `<ContactAIInsightsDialog>` - AI insights dialog
- AI insights button/icon

---

## 📋 REVISED Cleanup Checklist

### Phase 1: Delete AI Note/Email Features ✅

- [ ] **DELETE** `src/server/ai/contacts/generate-note-suggestions.ts`
- [ ] **DELETE** `src/server/ai/prompts/contacts/generate-note.prompt.ts`
- [ ] **REMOVE** from `src/hooks/use-contacts-bridge.ts`:
  - [ ] `useGenerateContactNoteSuggestions()`
  - [ ] `useGenerateContactEmailSuggestion()`
- [ ] **KEEP** in `src/hooks/use-contacts-bridge.ts`:
  - [ ] `useAskAIAboutContact()` ✅
  - [ ] `useCreateContactNote()` ✅
  - [ ] `useDeleteContact()` ✅
  - [ ] `useBulkEnrichContacts()` ✅

### Phase 2: Remove Note Enhancement ✅

- [ ] **REMOVE** `handleEnhance()` from `NoteComposerPopover.tsx`
- [ ] **REMOVE** Enhance button and Sparkles icon
- [ ] **REMOVE** `isEnhancing` state

### Phase 3: Clean Up Business Schemas ✅

- [ ] **REMOVE** from `src/server/db/business-schemas/contacts.ts`:
  - [ ] `ContactNoteSuggestion` (AI note suggestions)
  - [ ] `ContactEmailSuggestion` (AI email suggestions)
- [ ] **KEEP**:
  - [ ] `ContactAIInsightsResponse` ✅

### Phase 4: Update Components (Partial) ✅

- [ ] **REMOVE** from `ContactDetailsCard.tsx`:
  - [ ] Email suggestion functionality (if exists)
  - [ ] Note suggestion functionality (if exists)
- [ ] **KEEP** in `ContactDetailsCard.tsx`:
  - [ ] `handleAskAI()` ✅
  - [ ] `<ContactAIInsightsDialog>` ✅
  - [ ] AI insights button ✅

- [ ] **REMOVE** from `contacts-columns.tsx`:
  - [ ] Email suggestion functionality (if exists)
  - [ ] Note suggestion functionality (if exists)
- [ ] **KEEP** in `contacts-columns.tsx`:
  - [ ] `handleAskAI()` ✅
  - [ ] `<ContactAIInsightsDialog>` ✅
  - [ ] AI insights icon ✅

### Phase 5: Adapt (Don't Delete) ⚠️

- [ ] **ADAPT** `NotesHoverCard.tsx`:
  - [ ] Make view-only
  - [ ] Show 300-500 char excerpt
  - [ ] Add link to full note/contact card
  - [ ] Show "See Notes ↓" when notes exist
- [ ] **ADAPT** contacts queries:
  - [ ] Keep `notesCount` for indicator
  - [ ] Keep `lastNote` excerpt for hover
  - [ ] Limit to 300-500 chars

### Phase 6: Update Tests ✅

- [ ] **REMOVE** tests for deleted AI features:
  - [ ] Note suggestion tests
  - [ ] Email suggestion tests
- [ ] **KEEP** tests for:
  - [ ] AI insights tests
  - [ ] Note creation tests
  - [ ] Hover card tests (update to new behavior)

---

## 🎯 REVISED Summary

### Complete File Deletions: ~2 files

1. `generate-note-suggestions.ts` ✅
2. `generate-note.prompt.ts` ✅

### Partial File Cleanups: ~5 files

1. `use-contacts-bridge.ts` - Remove 2 hooks, keep 4
2. `NoteComposerPopover.tsx` - Remove AI enhancement only
3. `ContactDetailsCard.tsx` - Remove email/note AI, keep insights AI
4. `contacts-columns.tsx` - Remove email/note AI, keep insights AI
5. `contacts.ts` (business schemas) - Remove 2 AI types, keep insights type

### Files to ADAPT (Not Delete): ~3 files

1. `NotesHoverCard.tsx` - Make view-only with link
2. `contacts.service.ts` - Keep notesCount/lastNote, adapt queries
3. `contacts.repo.ts` - Keep note queries, limit excerpt length

---

## 🚀 Cleanup Order (Revised)

1. **Delete AI note/email files** (no dependencies) ✅
2. **Remove AI note/email hooks** (update imports) ✅
3. **Remove note enhancement** (isolated feature) ✅
4. **Clean up business schemas** (remove 2 types) ✅
5. **Update component imports** (remove deleted hooks) ✅
6. **Verify build** (fix broken imports) ✅

**Later (Next Sprint):**
7. Adapt NotesHoverCard for view-only + link
8. Adapt note creation for dashboard + contact card
9. Update queries for 300-500 char excerpts

---

## ✅ Success Criteria (Revised)

After cleanup:

- [ ] No AI note suggestion code
- [ ] No AI email suggestion code
- [ ] No note enhancement code
- [ ] AI insights functionality intact ✅
- [ ] Hover card functionality intact (to be adapted) ✅
- [ ] Note creation hooks intact (to be updated) ✅
- [ ] No broken imports
- [ ] TypeScript compiles successfully
- [ ] Existing tests pass (minus deleted features)

---

## 📊 Impact Analysis (Revised)

### Lines of Code to Remove: ~400-500 LOC (Much Less!)

**Breakdown:**

- AI note generation: ~200 LOC
- AI email suggestion hook: ~50 LOC
- AI note suggestion hook: ~50 LOC
- Note enhancement: ~100 LOC
- Type definitions: ~50 LOC

### Files Modified: ~5 files (Down from 15)

### Files Deleted: ~2 files (Down from 6-8)

### Estimated Cleanup Time: 30-45 minutes (Down from 2-3 hours)

---

## 🔍 What Changed from Original Plan

### KEEP (Not Delete)

1. ✅ AI insights system (ContactAIInsightsDialog, useAskAIAboutContact)
2. ✅ Bulk enrichment (ignore for now)
3. ✅ Notes count/last note (adapt for hover)
4. ✅ NotesHoverCard (adapt, don't rebuild)
5. ✅ Both note creation UIs (adapt for new locations)

### DELETE (Confirmed)

1. ✅ AI note suggestions
2. ✅ AI email suggestions
3. ✅ Note enhancement

### ADAPT (Don't Delete)

1. ⚠️ NotesHoverCard - view-only + link
2. ⚠️ Note creation - move to dashboard + contact card
3. ⚠️ Queries - 300-500 char excerpts

**Much cleaner and less destructive!**
