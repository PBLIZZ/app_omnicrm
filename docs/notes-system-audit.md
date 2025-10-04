# Notes System - Current Implementation Audit

**Date:** 2025-10-02  
**Purpose:** Document existing Notes implementation before applying new production spec and migrations

---

## 1. Database Layer

### Current Schema (`notes` table)

**Location:** `src/server/db/schema.ts` (lines 307-315)

```typescript
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id").references(() => contacts.id),
  title: text("title"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

**SQL Migration:** `supabase/sql/17_enhanced_contacts_schema.sql`

- Creates `notes` table
- Adds indexes: `idx_notes_user_id`, `idx_notes_contact_id`, `idx_notes_created_at`
- Enables RLS with policy: "Users can manage their own notes"
- Adds trigger: `update_notes_updated_at` for auto-updating `updated_at` column

### Relations

**Location:** `src/server/db/schema.ts` (lines 529-534)

```typescript
export const notesRelations = relations(notes, ({ one }) => ({
  contact: one(contacts, {
    fields: [notes.contactId],
    references: [contacts.id],
  }),
}));
```

### Type Exports

```typescript
export type Note = typeof notes.$inferSelect;
export type CreateNote = typeof notes.$inferInsert;
export type UpdateNote = Partial<CreateNote>;
export type ContactWithNotes = Contact & { notes: Note[] };
```

---

## 2. Business Schemas (Validation Layer)

**Location:** `src/server/db/business-schemas/notes.ts`

### Schemas Defined

1. **NoteSchema** - Matches database schema exactly
2. **CreateNoteBodySchema** - API input validation
3. **CreateNoteSchema** - Database insert validation
4. **UpdateNoteSchema** - Partial update validation
5. **NotesListResponseSchema** - API response validation
6. **GetNotesQuerySchema** - Query parameter validation (limit, offset, includeAI)

**Key Features:**

- Zod validation aligned with DB schema
- Satisfies type safety with `satisfies z.ZodType<DbNote>`
- Includes `includeAI` flag for future AI-generated notes filtering

---

## 3. Repository Layer

**Location:** `packages/repo/src/notes.repo.ts`

### NotesRepository Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `listNotes(userId, contactId?)` | List all notes for user, optionally filtered by contact | `DbResult<Note[]>` |
| `getNoteById(userId, noteId)` | Get single note by ID | `DbResult<Note \| null>` |
| `getNotesByContactId(userId, contactId)` | Get all notes for specific contact | `DbResult<Note[]>` |
| `searchNotes(userId, searchTerm)` | Search notes by content (ILIKE) | `DbResult<Note[]>` |
| `createNote(userId, input)` | Create new note | `DbResult<Note>` |
| `updateNote(userId, noteId, input)` | Update existing note | `DbResult<Note \| null>` |
| `deleteNote(userId, noteId)` | Delete note | `DbResult<boolean>` |
| `bulkCreateNotes(userId, data)` | Bulk create (for AI insights) | `DbResult<Note[]>` |

**Features:**

- Uses Drizzle ORM
- Built-in Zod validation in create/update methods
- Proper error handling with Result pattern
- Ordered by `createdAt DESC`

---

## 4. Service Layer

**Location:** `src/server/services/contacts.service.ts`

### Service Functions

#### `getContactNotes(userId: string, contactId: string)`

- Returns: `ContactsServiceResult<NotesListResponse>`
- Calls: `NotesRepository.getNotesByContactId()`
- Formats response with `formatNoteResponse()` helper

#### `createContactNote(userId: string, contactId: string, noteData: unknown)`

- Returns: `ContactsServiceResult<NoteResponse>`
- Validates with `CreateNoteSchema`
- Calls: `NotesRepository.createNote()`

**Response Types:**

```typescript
export interface NoteResponse {
  id: string;
  content: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  contactId: string | null;
}

export interface NotesListResponse {
  notes: NoteResponse[];
}
```

---

## 5. API Routes

**Location:** `src/app/api/contacts/[contactId]/notes/route.ts`

### Endpoints

#### `GET /api/contacts/[contactId]/notes`

- Handler: `handleGetWithQueryAuth`
- Query Schema: `GetNotesQuerySchema`
- Response Schema: `NotesListResponseSchema`
- Service: `getContactNotes()`

#### `POST /api/contacts/[contactId]/notes`

- Handler: `handleAuth`
- Body Schema: `CreateNoteBodySchema`
- Response Schema: `CreatedNoteResponseSchema`
- Service: `createContactNote()`

**Status:** ✅ Migrated to new auth pattern with Zod validation

**Missing Routes:**

- `PUT /api/contacts/[contactId]/notes/[noteId]` - Update note
- `DELETE /api/contacts/[contactId]/notes/[noteId]` - Delete note

---

## 6. Frontend Hooks

**Location:** `src/hooks/use-notes.ts`

### `useNotes({ contactId })` Hook

**Features:**

- React Query integration
- Optimistic updates for create/update/delete
- Automatic cache invalidation
- Toast notifications
- Retry logic for network errors

**Methods Exposed:**

```typescript
{
  notes: Note[];
  isLoading: boolean;
  error: unknown;
  createNote: (data: CreateNoteData) => void;
  updateNote: (data: UpdateNoteData) => void;
  deleteNote: (data: DeleteNoteData) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  refetch: () => Promise<{ data: Note[] | undefined; error: unknown }>;
}
```

**API Endpoints Used:**

- GET: `/api/contacts-new/${contactId}/notes` ⚠️ **MISMATCH**
- POST: `/api/contacts-new/${contactId}/notes` ⚠️ **MISMATCH**
- PUT: `/api/contacts-new/${contactId}/notes/${noteId}` ⚠️ **MISMATCH**
- DELETE: `/api/contacts-new/${contactId}/notes/${noteId}` ⚠️ **MISMATCH**

**Issue:** Hook uses `/api/contacts-new/` prefix but actual routes are at `/api/contacts/`

---

## 7. UI Components

### NotesHoverCard

**Location:** `src/app/(authorisedRoute)/contacts/_components/NotesHoverCard.tsx`

**Purpose:** Display notes preview on hover
**Features:**

- Lazy loads notes on hover
- Shows up to 20 notes
- Displays relative timestamps
- Highlights latest note
- Uses `/api/contacts/${contactId}/notes` ✅ **CORRECT**

### NoteComposerPopover

**Location:** `src/app/(authorisedRoute)/contacts/_components/NoteComposerPopover.tsx`

**Purpose:** Create new notes with AI enhancement
**Features:**

- Draft persistence in localStorage
- AI enhancement button (calls `/api/contacts/${contactId}/notes/enhance` - **NOT IMPLEMENTED**)
- Voice-to-text input (Web Speech API)
- Keyboard shortcuts (Enter to submit)
- Uses `/api/contacts/${contactId}/notes` ✅ **CORRECT**
- Prefixes content with `[User]` tag

**Issues:**

- AI enhancement endpoint doesn't exist
- Uses manual fetch instead of `useNotes` hook
- Dispatches custom event `notesUpdated` for cache invalidation (fragile)

### ContactAIActions (in contacts-columns.tsx)

**Location:** `src/app/(authorisedRoute)/contacts/_components/contacts-columns.tsx`

**Purpose:** AI actions in contacts table
**Features:**

- Uses `useCreateContactNote` hook from `use-contacts-bridge`
- Dialog-based note creation (alternative to NoteComposerPopover)

---

## 8. AI Integration

### Generate Note Suggestions

**Location:** `src/server/ai/contacts/generate-note-suggestions.ts`

**Function:** `generateNoteSuggestions(userId, contactId)`
**Returns:** `ContactNoteSuggestion[]`

```typescript
interface ContactNoteSuggestion {
  content: string;
  category: "summary" | "interaction" | "observation" | "follow-up";
  priority: "high" | "medium" | "low";
}
```

**Features:**

- Analyzes contact data, calendar events, interactions
- Generates 3-5 structured note suggestions
- Uses LLM service with structured output

### Prompts

**Location:** `src/server/ai/prompts/contacts/generate-note.prompt.ts`

**Function:** `buildGenerateNotePrompt(data: ContactWithContext)`

- Includes contact stage, recent events, last interaction, tags
- Defines 4 categories: interaction, observation, follow-up, preference
- Defines 3 priority levels: high, medium, low

---

## 9. Testing

### Unit Tests

1. **NotesHoverCard.test.tsx** - Component tests for hover card
2. **NoteComposerPopover.test.tsx** - Component tests for note composer

### E2E Tests

- **enhanced-contacts-system.spec.ts** - Includes notes functionality
- **contacts-enhanced-system.spec.ts** - Tests notes in contact context

### Test Factories

**Location:** `packages/testing/src/factories.ts` & `fakes.ts`

- Includes note generation helpers

---

## 10. Issues & Inconsistencies

### Critical Issues

1. **API Route Mismatch** ⚠️
   - `use-notes.ts` calls `/api/contacts-new/`
   - Actual routes at `/api/contacts/`
   - **Impact:** Hook is broken, calls non-existent endpoints

2. **Missing API Routes** ⚠️
   - No `PUT /api/contacts/[contactId]/notes/[noteId]`
   - No `DELETE /api/contacts/[contactId]/notes/[noteId]`
   - **Impact:** Update/delete functionality broken

3. **AI Enhancement Endpoint Missing** ⚠️
   - `NoteComposerPopover` calls `/api/contacts/${contactId}/notes/enhance`
   - Endpoint doesn't exist
   - **Impact:** AI enhancement button fails

4. **Fragile Cache Invalidation** ⚠️
   - `NoteComposerPopover` uses custom event instead of React Query
   - Doesn't integrate with `useNotes` hook
   - **Impact:** Stale data, inconsistent state

5. **Duplicate Note Creation UI** ⚠️
   - `NoteComposerPopover` (popover-based)
   - `ContactAIActions` dialog (dialog-based)
   - **Impact:** Inconsistent UX, duplicate code

### Minor Issues

1. **Content Prefix Inconsistency**
   - `NoteComposerPopover` adds `[User]` prefix
   - Other components don't
   - **Impact:** Inconsistent data format

2. **Search Not Exposed**
   - `NotesRepository.searchNotes()` exists
   - No API route or UI for search
   - **Impact:** Unused functionality

3. **Bulk Create Not Used**
   - `NotesRepository.bulkCreateNotes()` exists for AI
   - Not connected to AI suggestion flow
   - **Impact:** Unused functionality

---

## 11. Files to Review/Update

### Will Need Updates

- ✅ `src/hooks/use-notes.ts` - Fix API route paths
- ✅ `src/app/api/contacts/[contactId]/notes/route.ts` - Add PUT/DELETE handlers
- ✅ `src/app/(authorisedRoute)/contacts/_components/NoteComposerPopover.tsx` - Use hook, remove custom events
- ⚠️ `src/server/db/schema.ts` - May need schema changes per new spec
- ⚠️ `src/server/db/business-schemas/notes.ts` - May need validation updates
- ⚠️ `packages/repo/src/notes.repo.ts` - May need new methods

### May Be Deprecated

- ❓ `src/server/ai/contacts/generate-note-suggestions.ts` - Check if AI flow changes
- ❓ `src/server/ai/prompts/contacts/generate-note.prompt.ts` - Check if prompt changes
- ❓ `docs/roadmap/implementation/contact-table-notes-tags-enhancement-2025-01-21.md` - Old spec

### Tests to Update

- `src/app/(authorisedRoute)/contacts/_components/__tests__/NotesHoverCard.test.tsx`
- `src/app/(authorisedRoute)/contacts/_components/__tests__/NoteComposerPopover.test.tsx`
- `e2e/enhanced-contacts-system.spec.ts`
- `e2e/contacts-enhanced-system.spec.ts`

---

## 12. Dependencies & Imports

### Key Import Paths

```typescript
// Schema/Types
import { Note, CreateNote } from "@/server/db/schema";
import { NoteSchema, CreateNoteBodySchema } from "@/server/db/business-schemas";

// Repository
import { NotesRepository } from "@repo";

// Service
import { getContactNotes, createContactNote } from "@/server/services/contacts.service";

// Hooks
import { useNotes } from "@/hooks/use-notes";

// Components
import { NotesHoverCard } from "@/app/(authorisedRoute)/contacts/_components/NotesHoverCard";
import { NoteComposerPopover } from "@/app/(authorisedRoute)/contacts/_components/NoteComposerPopover";
```

---

## 13. Next Steps

**Ready for:**

1. ✅ Receive production spec for Notes system
2. ✅ Receive database migrations to apply via Supabase MCP
3. ⏳ Update schemas, repositories, services per new spec
4. ⏳ Fix API route mismatches
5. ⏳ Add missing endpoints (PUT/DELETE)
6. ⏳ Refactor components to use hooks consistently
7. ⏳ Update tests
8. ⏳ Remove deprecated code

**Questions for Spec:**

- Should notes have categories/priorities in DB or just in AI suggestions?
- Should notes support rich text or remain plain text?
- Should we keep the `[User]` prefix pattern?
- Should AI-generated notes be marked differently in DB?
- Should we implement note search in UI?
- Should we keep both note creation UIs or consolidate?
