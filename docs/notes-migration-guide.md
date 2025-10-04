# Notes System Migration Guide

**Date:** 2025-10-02  
**Status:** ✅ Database migrated, ⚠️ Code updates required

---

## What Was Done

### ✅ Database Migration Applied

Successfully applied destructive migration to Supabase project `app_omnicrm`:

1. **Truncated all existing notes** (data loss accepted)
2. **Added new columns:**
   - `content_rich` (jsonb) - TipTap JSON format
   - `content_plain` (text) - Redacted plain text for search/AI
   - `pii_entities` (jsonb) - Redaction metadata
   - `tags` (text[]) - Tag array
   - `source_type` (enum) - 'typed' | 'voice' | 'upload'

3. **Removed old columns:**
   - `title` (dropped)
   - `content` (dropped)

4. **Created new tables:**
   - `note_goals` - Junction table for note-to-goal relationships

5. **Added indexes:**
   - `idx_notes_content_plain_trgm` - Full-text search (trigram)
   - `idx_notes_tags_gin` - Tag array search

6. **Updated RLS policies:**
   - `notes_owner_select` - User can select own notes
   - `notes_owner_write` - User can manage own notes
   - `note_goals_owner_all` - User can manage note-goal links

### ✅ Schema Files Updated

1. **`src/server/db/schema.ts`**
   - Added `noteSourceTypeEnum`
   - Updated `notes` table definition
   - Added `noteGoals` junction table
   - Updated `notesRelations` with many-to-many goals
   - Added `noteGoalsRelations`
   - Exported `NoteGoal` and `CreateNoteGoal` types

2. **`src/server/db/business-schemas/notes.ts`**
   - Added `NoteSourceTypeSchema`
   - Updated `NoteSchema` to match new DB structure
   - Updated `CreateNoteBodySchema` (API input)
   - Updated `CreateNoteSchema` (DB insert)
   - Added `UpdateNoteBodySchema`
   - All schemas now use `contentRich`, `contentPlain`, `tags`, `sourceType`

---

## Breaking Changes

### Field Renames

| Old Field | New Field | Type Change | Notes |
|-----------|-----------|-------------|-------|
| `title` | ❌ REMOVED | - | No longer exists |
| `content` | `contentPlain` | text → text | Renamed, now redacted |
| - | `contentRich` | - → jsonb | NEW: TipTap JSON |
| - | `piiEntities` | - → jsonb | NEW: Redaction metadata |
| - | `tags` | - → text[] | NEW: Tag array |
| - | `sourceType` | - → enum | NEW: Input method |

### Type Changes

**Old Note Type:**

```typescript
{
  id: string;
  userId: string;
  contactId: string | null;
  title: string | null;        // ❌ REMOVED
  content: string;              // ❌ RENAMED
  createdAt: Date;
  updatedAt: Date;
}
```

**New Note Type:**

```typescript
{
  id: string;
  userId: string;
  contactId: string | null;
  contentRich: Record<string, unknown>;  // ✅ NEW
  contentPlain: string;                  // ✅ RENAMED
  piiEntities: unknown[];                // ✅ NEW
  tags: string[];                        // ✅ NEW
  sourceType: 'typed' | 'voice' | 'upload'; // ✅ NEW
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Files Requiring Updates

### 🔴 Critical - Will Break

1. **`packages/repo/src/notes.repo.ts`** ⚠️
   - All methods reference `title` and `content`
   - Need to update to `contentRich`, `contentPlain`, `tags`, `sourceType`
   - Add goal linking methods

2. **`src/server/services/contacts.service.ts`** ⚠️
   - `getContactNotes()` - Update response format
   - `createContactNote()` - Update to handle new fields
   - Add PII redaction logic
   - Add goal linking logic

3. **`src/app/api/contacts/[contactId]/notes/route.ts`** ⚠️
   - GET handler - Works (uses service layer)
   - POST handler - Works (uses service layer)
   - Need to add PUT/DELETE handlers

4. **`src/hooks/use-notes.ts`** ⚠️
   - API paths use `/api/contacts-new/` (wrong)
   - Should use `/api/contacts/`
   - Update type interfaces to match new schema

5. **`src/app/(authorisedRoute)/contacts/_components/NotesHoverCard.tsx`** ⚠️
   - Uses `note.content` (line 88)
   - Should use `note.contentPlain`

6. **`src/app/(authorisedRoute)/contacts/_components/NoteComposerPopover.tsx`** ⚠️
   - Sends `{ content: ... }` in POST body
   - Should send `{ contentPlain: ..., sourceType: 'typed' }`
   - Prefixes with `[User]` - remove or handle in service
   - Uses custom events instead of React Query

7. **`src/app/(authorisedRoute)/contacts/_components/ContactDetailsCard.tsx`** ⚠️
   - Line 316: `note.content` → `note.contentPlain`
   - Line 354: `note.content` → `note.contentPlain`

8. **`src/app/(authorisedRoute)/contacts/_components/contacts-columns.tsx`** ⚠️
   - Uses `useCreateContactNote` hook
   - Sends `{ content: ... }`
   - Should send `{ contentPlain: ... }`

### 🟡 Medium Priority

1. **`src/server/ai/contacts/generate-note-suggestions.ts`**
   - Review if AI suggestions need to change
   - May need to generate `contentRich` format

2. **`src/server/ai/prompts/contacts/generate-note.prompt.ts`**
    - Review prompt structure
    - May need updates for new note format

3. **`packages/testing/src/factories.ts`** & **`fakes.ts`**
    - Update note factories to generate new schema

### 🟢 Low Priority - Tests

1. **`src/app/(authorisedRoute)/contacts/_components/__tests__/NotesHoverCard.test.tsx`**
2. **`src/app/(authorisedRoute)/contacts/_components/__tests__/NoteComposerPopover.test.tsx`**
3. **`e2e/enhanced-contacts-system.spec.ts`**
4. **`e2e/contacts-enhanced-system.spec.ts`**

---

## Migration Checklist

### Phase 1: Repository & Service Layer ✅ NEXT

- [ ] Update `NotesRepository.createNote()` to accept new fields
- [ ] Update `NotesRepository.updateNote()` to accept new fields
- [ ] Update `NotesRepository.listNotes()` to return new fields
- [ ] Add `NotesRepository.linkGoals()` method
- [ ] Add `NotesRepository.unlinkGoals()` method
- [ ] Add PII redaction service/utility
- [ ] Update `contacts.service.ts` to use new repository methods
- [ ] Add PII redaction to note creation flow

### Phase 2: API Routes

- [ ] Fix API paths in `use-notes.ts` (`/api/contacts-new/` → `/api/contacts/`)
- [ ] Add PUT `/api/contacts/[contactId]/notes/[noteId]` route
- [ ] Add DELETE `/api/contacts/[contactId]/notes/[noteId]` route
- [ ] Update request/response types

### Phase 3: Frontend Components

- [ ] Update `NotesHoverCard` to use `contentPlain`
- [ ] Update `NoteComposerPopover` to send new schema
- [ ] Refactor `NoteComposerPopover` to use `useNotes` hook
- [ ] Update `ContactDetailsCard` to use `contentPlain`
- [ ] Update `contacts-columns` to use new schema
- [ ] Remove duplicate note creation UIs (decide on one pattern)

### Phase 4: AI Integration

- [ ] Review AI note generation for new format
- [ ] Add TipTap JSON generation if needed
- [ ] Update prompts if necessary

### Phase 5: Testing

- [ ] Update test factories
- [ ] Update unit tests
- [ ] Update E2E tests
- [ ] Add tests for PII redaction
- [ ] Add tests for goal linking

### Phase 6: New Features (Per Spec)

- [ ] Implement voice-to-text pipeline
- [ ] Implement upload → OCR pipeline
- [ ] Add TipTap rich text editor
- [ ] Add client-side PII detection
- [ ] Add full-text search UI
- [ ] Add tag filtering
- [ ] Add goal linking UI
- [ ] Add "latest note excerpt" to contacts list
- [ ] Make Notes the default pane (≥50% of contact card)

---

## Quick Reference: Common Migrations

### Repository Method Updates

**Before:**

```typescript
await db.insert(notes).values({
  userId,
  contactId,
  title: data.title ?? null,
  content: data.content,
});
```

**After:**

```typescript
await db.insert(notes).values({
  userId,
  contactId,
  contentRich: data.contentRich ?? {},
  contentPlain: await redactPII(data.contentPlain),
  piiEntities: extractedPII,
  tags: data.tags ?? [],
  sourceType: data.sourceType ?? 'typed',
});
```

### Component Updates

**Before:**

```typescript
<p>{note.content}</p>
```

**After:**

```typescript
<p>{note.contentPlain}</p>
```

### API Request Updates

**Before:**

```typescript
await post('/api/contacts/${contactId}/notes', {
  content: 'My note text',
  title: 'Optional title'
});
```

**After:**

```typescript
await post('/api/contacts/${contactId}/notes', {
  contentPlain: 'My note text',
  tags: ['session', 'progress'],
  sourceType: 'typed',
  goalIds: ['goal-uuid-1', 'goal-uuid-2']
});
```

---

## PII Redaction Requirements

Per spec, all notes must be redacted server-side before persistence:

1. **Create redaction utility** (`src/server/utils/pii-redaction.ts`)
2. **Detect PII patterns:**
   - Email addresses
   - Phone numbers
   - Physical addresses
   - SSN/ID numbers
   - Credit card numbers
3. **Replace with placeholders:** `[REDACTED_EMAIL]`, `[REDACTED_PHONE]`, etc.
4. **Store metadata in `pii_entities`** (no raw values)
5. **Client-side hints:** Toast user to use proper CRM fields instead

---

## Next Steps

1. **Start with Repository Layer** - Update `notes.repo.ts` first
2. **Add PII Redaction** - Critical compliance requirement
3. **Update Service Layer** - Wire up new repository methods
4. **Fix API Routes** - Add missing endpoints, fix paths
5. **Update Components** - Fix all `note.content` references
6. **Update Tests** - Make sure everything passes
7. **Add New Features** - Voice, OCR, rich text editor

**Estimated Effort:** 4-6 hours for core migration, 8-12 hours for new features
