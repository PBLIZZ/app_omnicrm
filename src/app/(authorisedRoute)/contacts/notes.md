# Notes System — Product & Tech Brief (Refined)

## Purpose

Notes = Session Notes. Core artifact documenting goals, interventions, progress, and agreed actions.
Front and center: Notes are the primary pane of the contact card; they are the practitioner’s narrative thread.
Compliance by design: No PII stored. Any emails/phones/addresses entered are redacted server-side (irreversible).
Linked to contact_id: contact record holds identifiers; notes reference it.

## Data Model

### Table: notes

id uuid pk
user_id uuid fk → users
contact_id uuid fk → contacts
content_rich jsonb (TipTap JSON; sanitized + redacted)
content_plain text (redacted; for search/AI)
tags text[] (lightweight labels; linked to tags table if exists)
goal_ids uuid[] (optional links to goals table)
pii_entities jsonb (redacted entity metadata, no raw values)
source_type enum('typed' | 'voice' | 'upload')
created_at timestamptz
updated_at timestamptz

### Processing

Voice → text (stored only as text).
Upload (photo/PDF) → OCR → text.
No audio/images persist.

### Security & Redaction

Server-side redaction mandatory: strip/replace PII before persistence.
Client nudges: inline hints + toast when redaction happens → guide user to CRM fields.
Sanitization: safe RTE (TipTap JSON); no raw HTML.
AI ingestion: reads only content_plain (already redacted).
Logs: no note content; only IDs, counts, timing.
RLS: enforce per-user, per-tenant scoping.

## UI / UX

### Above the Fold (Contact Card)

Latest Note excerpt (2–3 paragraphs / 300–500 chars) + timestamp.
Add Note controls: one-click voice-to-text, type, or upload→OCR.
Quick tags & links: inline goal(s), program, next agreed action chip (from AI insights or user input).
Session signals: last session date, next session scheduled, “documentation overdue” badge if no note after a session.

### Notes Section (Primary Pane)

Occupies ≥50% of the card.
Reverse-chronological feed of notes.
RTE for new note: basic formatting (headings, bold/italics, lists).
Lightweight structure: “Decision / Plan / Homework” chips, optional Goal link picker.
Card-to-card navigation when viewing a filtered set (e.g. today’s sessions).

#### Progressive Disclosure

Expanders/tabs for:
Full chronological feed with filters (tag, goal, date).
AI helpers panel: suggested next session agenda, risk flags, variability summaries (collapsed by default).
Timeline overlay: aligns notes with sessions (calendar), messages, and tasks.

#### Search & Retrieval

Whole-text search across sanitized content_plain.
Filters: tag, goal, program, date range.
Note deep links (contacts/[noteId]/page.tsx) for focused viewing and task linkage.
Smart recall chips (“last plan,” “last breakthrough”) via keyword tagging or AI extraction.

## Developer Tasks

 Create notes table with RLS, redaction pipeline.
 Build NoteService: create/list/filter/delete.
 Implement transcription & OCR → text pipeline (idempotent, retries).
 Add TipTap RTE with safe renderer + chips for tags/goals.
 Add “latest note excerpt” preview in contacts table.
 Build Notes as default pane in Contact Details Card.
 Implement filters (tag, goal, date).
 Add client-side inline PII detection + redaction toasts.
 Integrate AI helpers panel (secondary, collapsed).

### Acceptance Criteria

Notes-first: Contact card opens with Notes pane occupying ≥50%.
Capture fast: One-click Add Note (voice, type, upload→OCR).
Always sanitized: PII redacted irreversibly; users nudged to proper CRM fields.
Preview: Most recent note excerpt always visible in list + card.
Retrieval: Full-text search, filters, and goal/tag links working.
Progressive disclosure: AI insights and timeline available but subordinate to practitioner notes.
No storage of audio/images; text only.

### Why this works

Matches practitioner cognition: narrative notes are central; structure supports, doesn’t burden.
Maximizes adoption: fast capture + minimal friction.
Compliant: redaction by default, no PII storage.
Improves utility: searchable, linkable, AI-enriched without eroding trust.

**no backfill, no legacy carry-over.** Here’s a **clean, destructive migration** that wipes old notes and enforces the new spec immediately.

### Hard-cut Migration (no backwards compatibility)

#### SQL (run in order)

```sql
-- 0) Safety: this will DELETE ALL EXISTING NOTES.
--    Proceed only if you accept full data loss in public.notes.

-- 1) Prereqs
create extension if not exists pg_trgm;

do $$ begin
  create type public.note_source_type as enum ('typed','voice','upload');
exception when duplicate_object then null; end $$;

-- 2) Nuke existing notes (and any dependents later)
truncate table public.notes restart identity cascade;

-- 3) Notes table reshape: add required columns, drop legacy ones
alter table public.notes
  add column if not exists content_rich jsonb not null default '{}'::jsonb,
  add column if not exists content_plain text not null default '',
  add column if not exists pii_entities jsonb not null default '[]'::jsonb,
  add column if not exists tags text[] not null default '{}',
  add column if not exists source_type public.note_source_type not null default 'typed';

-- Drop legacy columns not in the new spec
alter table public.notes
  drop column if exists title,
  drop column if exists content;

-- 4) (Optional but recommended) enforce contact linkage now
-- alter table public.notes alter column contact_id set not null;

-- 5) Goal links (light structure)
create table if not exists public.note_goals (
  note_id uuid not null references public.notes(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  primary key (note_id, goal_id)
);

-- 6) Indexes for retrieval
create index if not exists idx_notes_content_plain_trgm
  on public.notes using gin (content_plain gin_trgm_ops);

create index if not exists idx_notes_tags_gin
  on public.notes using gin (tags);

-- keep your existing:
-- idx_notes_contact_id, idx_notes_created_at, idx_notes_user_id

-- 7) RLS lockdown (replace if you already have policies)
alter table public.notes enable row level security;
alter table public.note_goals enable row level security;

drop policy if exists notes_owner_select on public.notes;
drop policy if exists notes_owner_write  on public.notes;

create policy notes_owner_select on public.notes
for select using (auth.uid() = user_id);

create policy notes_owner_write on public.notes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists note_goals_owner_all on public.note_goals;
create policy note_goals_owner_all on public.note_goals
for all using (
  exists (select 1 from public.notes n where n.id = note_goals.note_id and n.user_id = auth.uid())
) with check (
  exists (select 1 from public.notes n where n.id = note_goals.note_id and n.user_id = auth.uid())
);
```

---

## App/Service contract (post-cut)

* **Create Note flow** (authoritative):

  1. RTE payload → **sanitize** → `content_rich` (TipTap JSON).
  2. Derive `content_plain` from `content_rich`.
  3. **PII redaction** (irreversible) on both representations.
  4. Insert: `{ user_id, contact_id, content_rich, content_plain, tags?, source_type }`.
  5. Optional: insert `note_goals` rows.

* **Search**: full-text over `content_plain` (trigram index), filter by `contact_id`, `tags`, date, goal via `note_goals`.

* **UI**: Notes is the default pane (≥50%); latest-note excerpt; fast Add Note (voice→text | type | upload→OCR); filters; card-to-card nav.

* **Compliance**: no originals stored; logs never include content; AI uses `content_plain` only.

---
