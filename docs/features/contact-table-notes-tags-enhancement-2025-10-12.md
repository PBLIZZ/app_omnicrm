# Enhanced Contact Management: Notes & Tags System Implementation Plan

**Date:** October 12, 2025
**Status:** Planning Phase (Updated with Verified Patterns)
**Project:** OmniCRM - Contact Table Enhancement

## Executive Summary

This document outlines the implementation plan for enhancing the contact management table with a comprehensive notes and tags system. The solution leverages existing database tables (`notes`, `contacts`) with the October 2025 layered architecture patterns (Repository → Service → Route).

### Current Implementation Status

**✅ Already Implemented:**

- Notes database schema with `contentRich` (TipTap JSON), `contentPlain` (searchable text), `piiEntities`, and `tags[]`
- Complete notes repository layer ([packages/repo/src/notes.repo.ts](../../packages/repo/src/notes.repo.ts))
- Complete notes service layer with PII redaction ([src/server/services/notes.service.ts](../../src/server/services/notes.service.ts))
- API routes using standardized `handleAuth` pattern ([src/app/api/notes/route.ts](../../src/app/api/notes/route.ts))
- Business schemas for validation ([src/server/db/business-schemas/notes.ts](../../src/server/db/business-schemas/notes.ts))
- Rich text editor component with TipTap (`NoteEditor.tsx`)
- Notes detail view and hover card components

**📋 To Be Implemented:**

- Tags system integration with contacts table
- Enhanced contact table columns for notes and tags display
- Bulk operations for tags management
- AI-powered tag suggestions
- Voice notes with transcription
- Advanced UI components for tag management

### Key Features to Implement

- **Tags System**: Leverage existing `contacts.tags` JSONB field with wellness-focused tag taxonomy
- **Enhanced Table UI**: Add notes count badge and tags display to contacts table
- **Bulk Operations**: Multi-select contacts for batch tag operations
- **AI Integration**: Automatic tag suggestions from note content
- **Voice Notes**: Audio transcription pipeline for dictation

## Current Architecture Analysis

### Database Schema (Verified October 2025)

#### Notes Table (Already Exists)

```typescript
// src/server/db/schema.ts:115-126
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id").references(() => contacts.id),
  contentRich: jsonb("content_rich").notNull().default({}),  // TipTap JSON
  contentPlain: text("content_plain").notNull().default(""), // Searchable text
  piiEntities: jsonb("pii_entities").notNull().default([]),  // Redaction metadata
  tags: text("tags").array().notNull().default([]),          // Note-level tags
  sourceType: noteSourceTypeEnum("source_type").notNull().default("typed"), // typed | voice | upload
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

#### Contacts Table (Tags Field)

```typescript
// src/server/db/schema.ts:92-113
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  displayName: text("display_name").notNull(),
  primaryEmail: text("primary_email"),
  primaryPhone: text("primary_phone"),
  photoUrl: text("photo_url"),
  source: text("source"),              // Data ingestion source (manual, gmail_import, upload)
  lifecycleStage: text("lifecycle_stage"),
  clientStatus: text("client_status"),
  referralSource: text("referral_source"),
  confidenceScore: text("confidence_score"),
  dateOfBirth: date("date_of_birth"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  address: jsonb("address"),           // Structured address data
  healthContext: jsonb("health_context"),
  preferences: jsonb("preferences"),
  tags: jsonb("tags"),                 // Contact-level tags (array of strings)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

### Layered Architecture Pattern (October 2025)

The codebase follows strict layered architecture. See [docs/REFACTORING_PATTERNS_OCT_2025.md](../REFACTORING_PATTERNS_OCT_2025.md):

**1. Repository Layer** (`packages/repo/src/*.repo.ts`)

- Constructor injection with `DbClient`
- Pure database operations
- Returns `T`, `T | null`, or `T[]`
- Throws generic `Error` on failures
- NO business logic, NO validation

**2. Service Layer** (`src/server/services/*.service.ts`)

- Acquires `DbClient` via `getDb()`
- Uses factory functions to create repositories
- Business logic and data transformation
- Wraps repo errors as `AppError` with status codes (404, 500, 503)
- Returns `Promise<T>` or `Promise<T | null>` based on operation type

**3. Route Layer** (`src/app/api/**/route.ts`)

- Uses standardized handlers: `handleAuth()` or `handleGetWithQueryAuth()`
- Validation via business schemas
- Handlers automatically catch `AppError` and convert to HTTP responses
- NO manual `try-catch`, NO manual `Response.json()`

**4. Business Schemas** (`src/server/db/business-schemas/`)

- Pure Zod validation schemas
- NO transforms (handle in service layer)
- Request/response validation only

**5. Database Types** (`src/server/db/schema.ts`)

- Single source of truth
- Use `$inferSelect` for select types
- Use `$inferInsert` for insert types

### Existing Notes Implementation (Verified)

#### Repository Pattern (Already Implemented)

```typescript
// packages/repo/src/notes.repo.ts
export class NotesRepository {
  constructor(private readonly db: DbClient) {}

  async listNotes(userId: string, contactId?: string): Promise<Note[]> {
    const conditions = [eq(notes.userId, userId)];
    if (contactId) conditions.push(eq(notes.contactId, contactId));

    return await this.db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.createdAt));
  }

  async getNoteById(userId: string, noteId: string): Promise<Note | null> {
    const rows = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
      .limit(1);

    return rows[0] ?? null;
  }

  async createNote(data: CreateNote): Promise<Note> {
    const [newNote] = await this.db.insert(notes).values(data).returning();
    if (!newNote) throw new Error("Insert returned no data");
    return newNote;
  }

  async updateNote(userId: string, noteId: string, updates: Partial<CreateNote>): Promise<Note | null> {
    const [updatedNote] = await this.db
      .update(notes)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
      .returning();

    return updatedNote ?? null;
  }

  async deleteNote(userId: string, noteId: string): Promise<boolean> {
    const result = await this.db
      .delete(notes)
      .where(and(eq(notes.userId, userId), eq(notes.id, noteId)))
      .returning({ id: notes.id });

    return result.length > 0;
  }

  async searchNotes(userId: string, searchTerm: string): Promise<Note[]> {
    return await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), ilike(notes.contentPlain, `%${searchTerm}%`)))
      .orderBy(desc(notes.createdAt));
  }
}

export function createNotesRepository(db: DbClient): NotesRepository {
  return new NotesRepository(db);
}
```

#### Service Layer Pattern (Already Implemented)

```typescript
// src/server/services/notes.service.ts
import { createNotesRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";
import { redactPII } from "@/server/lib/pii-detector";
import { getDb } from "@/server/db/client";

export async function createNoteService(userId: string, input: CreateNoteInput): Promise<Note> {
  const db = await getDb();
  const repo = createNotesRepository(db);

  // Business logic: Validate required fields
  if (!input.contentPlain || input.contentPlain.trim().length === 0) {
    throw new AppError("Note content is required", "VALIDATION_ERROR", "validation", false);
  }

  // Business logic: Redact PII from content
  const redactionResult = redactPII(input.contentPlain);
  if (redactionResult.hasRedactions) {
    throw new AppError("PII detected in note content", "VALIDATION_ERROR", "validation", false);
  }

  try {
    const note = await repo.createNote({
      userId,
      contactId: input.contactId ?? null,
      contentPlain: redactionResult.sanitizedText,
      contentRich: input.contentRich ?? {},
      tags: input.tags ?? [],
      piiEntities: redactionResult.entities,
      sourceType: input.sourceType ?? "typed",
    });

    return note;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create note",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}

export async function listNotesService(
  userId: string,
  params: ListNotesParams = {}
): Promise<Note[]> {
  const db = await getDb();
  const repo = createNotesRepository(db);

  try {
    const notes = params.search
      ? await repo.searchNotes(userId, params.search)
      : await repo.listNotes(userId, params.contactId);
    return notes;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list notes",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}
```

#### API Route Pattern (Already Implemented)

```typescript
// src/app/api/notes/route.ts
import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import {
  GetNotesQuerySchema,
  CreateNoteBodySchema,
  NotesListResponseSchema,
  type Note,
} from "@/server/db/business-schemas/notes";
import { listNotesService, createNoteService } from "@/server/services/notes.service";

export const GET = handleGetWithQueryAuth(
  GetNotesQuerySchema,
  NotesListResponseSchema,
  async (query, userId): Promise<{ notes: Note[]; total: number }> => {
    const notes = await listNotesService(userId, {
      contactId: query.contactId,
      search: query.search,
    });
    return { notes, total: notes.length };
  }
);

export const POST = handleAuth(
  CreateNoteBodySchema,
  z.custom<Note>(),
  async (data, userId): Promise<Note> => {
    return await createNoteService(userId, data);
  }
);
```

#### Business Schema Pattern (Already Implemented)

```typescript
// src/server/db/business-schemas/notes.ts
import { z } from "zod";

// Re-export base types from schema
export type { Note, CreateNote, UpdateNote } from "@/server/db/schema";

// API-specific schemas for validation
export const NoteSourceTypeSchema = z.enum(["typed", "voice", "upload"]);

export const CreateNoteBodySchema = z.object({
  contentPlain: z.string().min(1, "Note content is required"),
  contentRich: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional().default([]),
  goalIds: z.array(z.string().uuid()).optional(),
  sourceType: NoteSourceTypeSchema.optional().default("typed"),
  contactId: z.string().uuid().optional(),
});

export const UpdateNoteBodySchema = z.object({
  contentPlain: z.string().min(1).optional(),
  contentRich: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  goalIds: z.array(z.string().uuid()).optional(),
});

export const GetNotesQuerySchema = z.object({
  contactId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const NotesListResponseSchema = z.object({
  notes: z.array(z.unknown()),
  total: z.number(),
});
```

#### Rich Text Editor Component (Already Implemented)

Location: [src/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NoteEditor.tsx](../../src/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NoteEditor.tsx)

- Uses TipTap with extensions: StarterKit, Placeholder, Underline, TextStyle, Color, Highlight, FontFamily
- Includes PII detection with `detectPIIClient`
- Features: formatting toolbar, font selection, color/highlight pickers

## Phase 1: Tags System Infrastructure (3-4 hours)

### 1.1 Tags Repository Layer

Create `packages/repo/src/tags.repo.ts`:

```typescript
import { eq, and, sql } from "drizzle-orm";
import { contacts, type Contact } from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

export class TagsRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Get tags for a single contact
   */
  async getContactTags(userId: string, contactId: string): Promise<string[]> {
    const rows = await this.db
      .select({ tags: contacts.tags })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .limit(1);

    const contact = rows[0];
    if (!contact) return [];

    // Parse JSONB tags field (should be string array)
    const tags = contact.tags;
    return Array.isArray(tags) ? tags : [];
  }

  /**
   * Add tags to a contact
   */
  async addTagsToContact(
    userId: string,
    contactId: string,
    tagsToAdd: string[]
  ): Promise<Contact | null> {
    const current = await this.getContactTags(userId, contactId);
    const merged = Array.from(new Set([...current, ...tagsToAdd]));

    const [updated] = await this.db
      .update(contacts)
      .set({ tags: merged, updatedAt: new Date() })
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .returning();

    return updated ?? null;
  }

  /**
   * Remove tags from a contact
   */
  async removeTagsFromContact(
    userId: string,
    contactId: string,
    tagsToRemove: string[]
  ): Promise<Contact | null> {
    const current = await this.getContactTags(userId, contactId);
    const filtered = current.filter((tag) => !tagsToRemove.includes(tag));

    const [updated] = await this.db
      .update(contacts)
      .set({ tags: filtered, updatedAt: new Date() })
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .returning();

    return updated ?? null;
  }

  /**
   * Replace all tags for a contact
   */
  async setContactTags(
    userId: string,
    contactId: string,
    tags: string[]
  ): Promise<Contact | null> {
    const [updated] = await this.db
      .update(contacts)
      .set({ tags, updatedAt: new Date() })
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .returning();

    return updated ?? null;
  }

  /**
   * Bulk add tags to multiple contacts
   */
  async bulkAddTags(
    userId: string,
    contactIds: string[],
    tagsToAdd: string[]
  ): Promise<{ updated: number }> {
    // For each contact, merge existing tags with new tags
    const updates = await Promise.all(
      contactIds.map((contactId) => this.addTagsToContact(userId, contactId, tagsToAdd))
    );

    return { updated: updates.filter((u) => u !== null).length };
  }

  /**
   * Bulk remove tags from multiple contacts
   */
  async bulkRemoveTags(
    userId: string,
    contactIds: string[],
    tagsToRemove: string[]
  ): Promise<{ updated: number }> {
    const updates = await Promise.all(
      contactIds.map((contactId) => this.removeTagsFromContact(userId, contactId, tagsToRemove))
    );

    return { updated: updates.filter((u) => u !== null).length };
  }

  /**
   * Get all unique tags for a user across all contacts
   */
  async getAllUserTags(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ tags: contacts.tags })
      .from(contacts)
      .where(eq(contacts.userId, userId));

    const allTags = rows.flatMap((row) => {
      const tags = row.tags;
      return Array.isArray(tags) ? tags : [];
    });

    return Array.from(new Set(allTags)).sort();
  }
}

export function createTagsRepository(db: DbClient): TagsRepository {
  return new TagsRepository(db);
}
```

### 1.2 Tags Service Layer

Create `src/server/services/tags.service.ts`:

```typescript
import { createTagsRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";
import type { Contact } from "@/server/db/schema";

export interface BulkTagResult {
  updated: number;
  failed: number;
}

/**
 * Get tags for a contact
 */
export async function getContactTagsService(
  userId: string,
  contactId: string
): Promise<string[]> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    return await repo.getContactTags(userId, contactId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get contact tags",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}

/**
 * Add tags to a contact
 */
export async function addTagsToContactService(
  userId: string,
  contactId: string,
  tags: string[]
): Promise<Contact> {
  if (tags.length === 0) {
    throw new AppError("No tags provided", "VALIDATION_ERROR", "validation", false, 400);
  }

  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    const updated = await repo.addTagsToContact(userId, contactId, tags);
    if (!updated) {
      throw new AppError("Contact not found", "NOT_FOUND", "validation", false, 404);
    }
    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to add tags",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}

/**
 * Remove tags from a contact
 */
export async function removeTagsFromContactService(
  userId: string,
  contactId: string,
  tags: string[]
): Promise<Contact> {
  if (tags.length === 0) {
    throw new AppError("No tags provided", "VALIDATION_ERROR", "validation", false, 400);
  }

  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    const updated = await repo.removeTagsFromContact(userId, contactId, tags);
    if (!updated) {
      throw new AppError("Contact not found", "NOT_FOUND", "validation", false, 404);
    }
    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to remove tags",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}

/**
 * Bulk add tags to multiple contacts
 */
export async function bulkAddTagsService(
  userId: string,
  contactIds: string[],
  tags: string[]
): Promise<BulkTagResult> {
  if (contactIds.length === 0) {
    throw new AppError("No contacts provided", "VALIDATION_ERROR", "validation", false, 400);
  }

  if (tags.length === 0) {
    throw new AppError("No tags provided", "VALIDATION_ERROR", "validation", false, 400);
  }

  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    const result = await repo.bulkAddTags(userId, contactIds, tags);
    return { updated: result.updated, failed: contactIds.length - result.updated };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to bulk add tags",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}

/**
 * Bulk remove tags from multiple contacts
 */
export async function bulkRemoveTagsService(
  userId: string,
  contactIds: string[],
  tags: string[]
): Promise<BulkTagResult> {
  if (contactIds.length === 0) {
    throw new AppError("No contacts provided", "VALIDATION_ERROR", "validation", false, 400);
  }

  if (tags.length === 0) {
    throw new AppError("No tags provided", "VALIDATION_ERROR", "validation", false, 400);
  }

  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    const result = await repo.bulkRemoveTags(userId, contactIds, tags);
    return { updated: result.updated, failed: contactIds.length - result.updated };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to bulk remove tags",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}

/**
 * Get all unique tags for a user
 */
export async function getAllUserTagsService(userId: string): Promise<string[]> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    return await repo.getAllUserTags(userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get user tags",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}
```

### 1.3 Tags Business Schemas

Create `src/server/db/business-schemas/tags.ts`:

```typescript
import { z } from "zod";

/**
 * Tags Business Schemas
 *
 * Validation schemas for tag operations.
 */

export const TagsArraySchema = z.array(z.string().min(1).max(50));

export const AddTagsBodySchema = z.object({
  contactId: z.string().uuid(),
  tags: TagsArraySchema.min(1, "At least one tag required"),
});

export const RemoveTagsBodySchema = z.object({
  contactId: z.string().uuid(),
  tags: TagsArraySchema.min(1, "At least one tag required"),
});

export const BulkAddTagsBodySchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, "At least one contact required"),
  tags: TagsArraySchema.min(1, "At least one tag required"),
});

export const BulkRemoveTagsBodySchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, "At least one contact required"),
  tags: TagsArraySchema.min(1, "At least one tag required"),
});

export const TagsListResponseSchema = z.object({
  tags: z.array(z.string()),
});

export const BulkTagResultSchema = z.object({
  updated: z.number(),
  failed: z.number(),
});

export type AddTagsBody = z.infer<typeof AddTagsBodySchema>;
export type RemoveTagsBody = z.infer<typeof RemoveTagsBodySchema>;
export type BulkAddTagsBody = z.infer<typeof BulkAddTagsBodySchema>;
export type BulkRemoveTagsBody = z.infer<typeof BulkRemoveTagsBodySchema>;
export type BulkTagResult = z.infer<typeof BulkTagResultSchema>;
```

### 1.4 Tags API Routes

Create API routes for tags (code examples in sections 1.4.1-1.4.2 below)

### 1.5 Wellness Tag Taxonomy Constants

Create `src/lib/constants/wellness-tags.ts` with predefined tag categories for wellness practitioners.

## Implementation Timeline

| Phase   | Duration  | Key Deliverables                                    |
| ------- | --------- | --------------------------------------------------- |
| Phase 1 | 3-4 hours | Tags repository, service, API routes, business schemas, wellness taxonomy |
| Phase 2 | 3-4 hours | Enhanced contact table columns, bulk actions toolbar, tags dialog |
| Phase 3 | 4-5 hours | Voice recorder component, transcription service, voice note API |
| Phase 4 | 3-4 hours | AI tag suggestions service and API |

- **Total Estimated Time: 13-17 hours**

## Architecture Compliance Checklist

- ✅ Repository layer uses constructor injection with `DbClient`
- ✅ Repositories throw generic `Error`, return `T | null` for not found
- ✅ Service layer acquires `DbClient` via `getDb()`
- ✅ Services use factory functions to create repositories
- ✅ Services wrap errors as `AppError` with status codes
- ✅ API routes use `handleAuth()` or `handleGetWithQueryAuth()`
- ✅ Business schemas are pure Zod validation
- ✅ Database types use `$inferSelect` and `$inferInsert`
- ✅ No `DbResult` wrapper pattern
- ✅ No manual `try-catch` in routes
- ✅ No manual `Response.json()` in routes

## Success Metrics

### Technical Metrics

- Page load time < 2 seconds for 1000+ contacts
- Tag operations complete in < 500ms
- Voice transcription completes in < 10 seconds
- Zero TypeScript errors with strict mode

### User Experience Metrics

- Tag usage increased by 200%
- Voice note adoption by 30% of practitioners
- Reduced manual data entry by 80%
- User satisfaction score > 4.5/5

---

**Document Version:** 2.0 (Verified October 2025)
**Last Updated:** October 12, 2025
**Next Review:** After implementation completion
