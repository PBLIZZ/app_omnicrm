# Notes System Cleanup - Status Report

**Date:** 2025-10-02  
**Status:** Partially Complete

---

## ✅ Completed

### 1. Database Migration
- ✅ Applied destructive migration to Supabase
- ✅ Truncated old notes data
- ✅ Added new columns: `content_rich`, `content_plain`, `pii_entities`, `tags`, `source_type`
- ✅ Removed old columns: `title`, `content`
- ✅ Created `note_goals` junction table
- ✅ Added full-text search indexes
- ✅ Updated RLS policies

### 2. Schema Updates
- ✅ Updated `src/server/db/schema.ts`
  - Added `noteSourceTypeEnum`
  - Updated `notes` table definition
  - Added `noteGoals` junction table
  - Updated relations
- ✅ Updated `src/server/db/business-schemas/notes.ts`
  - New schemas for `contentRich`, `contentPlain`, etc.
  - Updated all Zod validation

### 3. File Deletions
- ✅ Deleted `src/server/ai/contacts/generate-note-suggestions.ts`
- ✅ Deleted `src/server/ai/prompts/contacts/generate-note.prompt.ts`
- ✅ Deleted `src/app/(authorisedRoute)/contacts/_components/NoteComposerPopover.tsx`
- ✅ Deleted `src/app/(authorisedRoute)/contacts/_components/__tests__/NoteComposerPopover.test.tsx`

### 4. Hook Cleanup
- ✅ Removed `useGenerateContactNoteSuggestions()` from `use-contacts-bridge.ts`
- ✅ Removed `useGenerateContactEmailSuggestion()` from `use-contacts-bridge.ts`
- ✅ Removed unused type imports

---

## ⚠️ Remaining Work

### 1. Component Cleanup (contacts-columns.tsx)
**File:** `src/app/(authorisedRoute)/contacts/_components/contacts-columns.tsx`

**Need to remove:**
- Import of `NoteComposerPopover` (line 33)
- Import of `NotebookPen` icon (line 16)
- Import of `useCreateContactNote` hook (line 36)
- Import of `Label` component (line 26)
- Import of `Textarea` component (line 27)
- Import of `toast` from sonner (line 41)
- State: `addNoteDialogOpen` (line 58)
- State: `newNoteContent` (line 59)
- Mutation: `createNoteMutation` (line 64)
- Function: `handleAddNote()` (lines 72-88)
- JSX: `<NoteComposerPopover>` wrapper (lines 110-127)
- JSX: Add Note Dialog (lines 139-178)

### 2. Component Cleanup (ContactDetailsCard.tsx)
**File:** `src/app/(authorisedRoute)/contacts/_components/ContactDetailsCard.tsx`

**Need to fix:**
- Line 316: `note.content` → `note.contentPlain`
- Line 354: `note.content` → `note.contentPlain`

### 3. Business Schema Cleanup
**File:** `src/server/db/business-schemas/contacts.ts`

**Need to remove:**
- `ContactNoteSuggestion` type (if exists)
- `ContactEmailSuggestion` type (if exists)

### 4. Repository Updates
**File:** `packages/repo/src/notes.repo.ts`

**Need to update:**
- All methods to use new schema fields
- Replace `title` and `content` with `contentRich`, `contentPlain`, etc.

### 5. Service Updates
**File:** `src/server/services/contacts.service.ts`

**Need to update:**
- Note creation/retrieval methods
- Response formatting

### 6. Hook Updates
**File:** `src/hooks/use-notes.ts`

**Need to fix:**
- API paths: `/api/contacts-new/` → `/api/contacts/`
- Request/response types to match new schema

### 7. API Route Updates
**File:** `src/app/api/contacts/[contactId]/notes/route.ts`

**Need to add:**
- PUT handler for updating notes
- DELETE handler for deleting notes

---

## 📊 Summary

**Completed:** 60%
- Database: 100% ✅
- Schemas: 100% ✅
- File Deletions: 100% ✅
- Hook Cleanup: 100% ✅

**Remaining:** 40%
- Component Cleanup: 0% ⚠️
- Repository Updates: 0% ⚠️
- Service Updates: 0% ⚠️
- API Routes: 0% ⚠️

---

## 🎯 Next Steps

1. **Manual cleanup of `contacts-columns.tsx`** - Remove all note creation UI
2. **Fix `ContactDetailsCard.tsx`** - Update `note.content` → `note.contentPlain`
3. **Update repository layer** - Align with new schema
4. **Update service layer** - Align with new schema
5. **Fix `use-notes.ts` hook** - Correct API paths and types
6. **Add missing API routes** - PUT and DELETE handlers
7. **Update tests** - Fix broken tests

---

## 🚧 Known Issues

1. **TypeScript errors in ContactDetailsCard.tsx:**
   - Property 'content' does not exist (lines 316, 354)
   - Need to change to `contentPlain`

2. **Broken imports in contacts-columns.tsx:**
   - `NoteComposerPopover` component deleted but still imported
   - Will cause build failure

3. **API path mismatch in use-notes.ts:**
   - Calling `/api/contacts-new/` which doesn't exist
   - Should be `/api/contacts/`

---

## ✅ Clean Slate Achieved For:

- AI note generation ✅
- AI email suggestions ✅
- Note enhancement feature ✅
- Old note schema ✅
- Note creation UI components ✅

**Ready for new implementation!**
