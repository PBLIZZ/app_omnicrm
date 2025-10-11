# Notes System - Wellness Practitioner Specification

## Research Summary

Health coaches and wellness practitioners rely on session notes as the **core artifact** for documenting goals, interventions, progress, and agreed actions. Notes support continuity of care, accountability, and outcome tracking.

### Key Findings

1. **Notes are the primary pane** - Session notes are the backbone of clinical reasoning; insights/automations should enrich, not displace, notes
2. **Fast capture is essential** - Single-click Add Note (voice-to-text, type, upload→OCR) with minimal friction
3. **Chronological narrative > heavy structure** - Clean feed with lightweight structure (headings, tags, goal links) beats complex forms
4. **PII redaction by design** - Server-side redaction with client-side nudges; store only sanitized text
5. **Progressive disclosure** - Latest note preview prominent; older notes, attachments, AI insights, timeline on demand

---

## Implementation Roadmap

### Phase 1: Current State (✅ Completed)

**Status**: Basic notes CRUD with PII redaction

- [x] Notes table in database with `contentPlain`, `contentRich`, `piiEntities`, `tags`, `sourceType`
- [x] API routes: `GET/POST /api/notes`, `GET/PUT/DELETE /api/notes/[noteId]`
- [x] TipTap rich text editor with SSR-safe rendering
- [x] Server-side PII detection and redaction (emails, phones, SSN, addresses)
- [x] Client-side PII warnings with amber alert banner
- [x] Notes-first layout on contact card (default tab)
- [x] Basic note creation and display

### Phase 2: Above-the-Fold Essentials (🚧 Next Priority)

**Goal**: Make notes the engine of care continuity

#### 2.1 Latest Note Excerpt on Contact Card

- [ ] Show latest 2-3 paragraphs (~300-500 chars) above the fold
- [ ] Display timestamp, author (currently single user, future-proof)
- [ ] "View full note" link → `/contacts/[contactId]/notes/[noteId]`
- [ ] Create dedicated note detail page at `src/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/page.tsx`

#### 2.2 Fast Capture Controls

- [ ] **Voice-to-text button** - Integrate Web Speech API or OpenAI Whisper
  - Streaming transcription with interim results
  - Store only final sanitized text
  - Error handling for browser compatibility
- [ ] **Upload→OCR button** - Photo/PDF upload with text extraction
  - Accept `.jpg`, `.png`, `.pdf` file types
  - OCR pipeline: Tesseract.js or Cloud Vision API
  - Background job processing with retry logic
  - Store only extracted text, delete uploaded file
- [ ] **Type button** (current editor) - Default option

#### 2.3 Quick Metadata at Point of Entry

- [ ] **Goal link picker** - Inline dropdown to associate note with goals
  - Query `goals` table WHERE `contactId` AND `status != 'abandoned'`
  - Allow multiple goal associations via `note_goals` junction table
  - Display linked goals as chips on note
- [ ] **Quick tags input** - Comma-separated tags for categorization
  - Free-form text input (no predefined list yet)
  - Store in `notes.tags` array column
  - Auto-suggest from existing tags for contact
- [ ] **Next step prompt** - Optional "What's the next agreed action?"
  - Store in separate `next_steps` JSONB field or extract to tasks
  - Link to OmniMomentum task creation

#### 2.4 Status Signals on Contact Card

- [ ] Last session date (query most recent `calendarEvent` or `interaction`)
- [ ] Next session scheduled (query future `calendarEvent`)
- [ ] "Documentation overdue" badge - If scheduled session has no note within 24h window
  - Calculation: `calendarEvent.endTime < NOW() - INTERVAL '24 hours'` AND no matching note

### Phase 3: Progressive Disclosure & Retrieval (📋 Planned)

#### 3.1 Full Notes Feed

- [ ] Reverse-chronological collapsible sections per date
- [ ] Expand/collapse by date grouping
- [ ] Show note preview (first 100 chars) when collapsed
- [ ] Full rich text when expanded

#### 3.2 Filtering & Search

- [ ] **Filters**:
  - By tag (multi-select chips)
  - By goal (dropdown from contact's goals)
  - By date range (date picker)
  - By source type (typed/voice/upload)
- [ ] **Full-text search** across `contentPlain`
  - PostgreSQL full-text search using tsvector
  - Relevance ranking with `ts_rank`
  - Highlight search terms in results
- [ ] **Smart recall shortcuts** (AI-powered):
  - "Last plan" → Find most recent note with planning keywords
  - "Last breakthrough" → Sentiment analysis for positive progress
  - "Last adverse reaction" → Flag health concern keywords

#### 3.3 Note Deep Links

- [ ] Generate shareable link: `/contacts/[contactId]/notes/[noteId]`
- [ ] Copy link button on each note
- [ ] Use in tasks, messages, internal documentation
- [ ] Permission check: user must own contact to access note

### Phase 4: Lightweight Structure & Actions (📋 Planned)

#### 4.1 Structured Content Blocks (JSONB in contentRich)

Instead of heavy forms, use inline affordances:

```typescript
// Example contentRich structure
{
  "blocks": [
    { "type": "paragraph", "content": "Client reported..." },
    { "type": "decision", "content": "Agreed to try..." },
    { "type": "plan", "content": "Next session: practice breathing..." },
    { "type": "homework", "content": "Client will journal 3x this week" }
  ]
}
```

- [ ] Add block type selector in TipTap editor
- [ ] Custom TipTap extensions for Decision/Plan/Homework blocks
- [ ] Visual distinction (icons, background colors) for block types
- [ ] Extract structured data for reporting (e.g., all "homework" blocks)

#### 4.2 Noted-but-Unscheduled Prompt

When note includes plan/homework without scheduled follow-up:

**Deterministic Logic**:

- Detect keywords in `contentPlain`: "next session", "follow up", "homework", "practice"
- Check if contact has upcoming `calendarEvent` within 14 days
- If NO → Show gentle nudge: "Create task or schedule session?"
- One-click action: Pre-fill task in OmniMomentum or open calendar booking

**Implementation**:

- [ ] Server-side keyword detection after note creation
- [ ] Store `hasUnscheduledAction` boolean flag on note
- [ ] Client-side toast with action buttons
- [ ] Integration with `/api/tasks` and calendar booking flow

### Phase 5: AI Insights Panel (📋 Planned)

#### 5.1 Secondary Sidebar for AI (Collapsed by Default)

- [ ] Suggested next session agenda (from last 1-3 notes)
- [ ] Risk flags with citations to specific note excerpts
- [ ] Adherence/variability summaries (e.g., "Sleep adherence last 4 weeks")
- [ ] Keep separate from human narrative to preserve trust

#### 5.2 AI Input Constraint

- [ ] AI only processes sanitized `contentPlain` (never raw input)
- [ ] Display source note citations for all AI claims
- [ ] "AI-generated" label on all insights
- [ ] Allow practitioner to dismiss/hide insights per contact

### Phase 6: Timeline & Journey View (📋 Planned)

#### 6.1 Stitched Timeline

Overlay notes with:

- Calendar events (`calendarEvents` table)
- Messages/emails (`interactions` table)
- Tasks/actions (`tasks` table / OmniMomentum)

**Visual Timeline**:

- [ ] Vertical timeline with date markers
- [ ] Icons for each event type (note, session, email, task)
- [ ] Hover preview for each item
- [ ] Click to expand full content
- [ ] Filter by event type

---

## Database Schema Enhancements

### Current Schema (✅ Exists)

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id),
  content_plain TEXT NOT NULL,
  content_rich JSONB NOT NULL DEFAULT '{}',
  pii_entities JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] NOT NULL DEFAULT '{}',
  source_type note_source_type NOT NULL DEFAULT 'typed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Proposed Additions

#### 1. Note-Goal Junction Table (Phase 2.3)

```sql
-- Already exists: note_goals table
CREATE TABLE note_goals (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, goal_id)
);
```

#### 2. Add Metadata Fields to Notes (Phase 4.2)

```sql
ALTER TABLE notes
ADD COLUMN has_unscheduled_action BOOLEAN DEFAULT FALSE,
ADD COLUMN next_step_extracted TEXT,
ADD COLUMN content_blocks JSONB DEFAULT '[]';
```

#### 3. Full-Text Search (Phase 3.2)

```sql
-- Add tsvector column for search
ALTER TABLE notes ADD COLUMN search_vector tsvector;

-- Create index
CREATE INDEX notes_search_idx ON notes USING GIN(search_vector);

-- Auto-update trigger
CREATE TRIGGER notes_search_update BEFORE INSERT OR UPDATE ON notes
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', content_plain);
```

---

## API Enhancements

### New Endpoints Needed

#### Phase 2: Fast Capture

```typescript
// Voice transcription
POST /api/notes/transcribe
Body: { audioBlob: Blob, contactId: string }
Response: { text: string, redacted: boolean, piiTypes: string[] }

// OCR upload
POST /api/notes/ocr
Body: { file: File, contactId: string }
Response: { text: string, redacted: boolean, confidence: number }
```

#### Phase 3: Search & Filtering

```typescript
// Full-text search
GET /api/notes/search?q=breathing&contactId=uuid&tags=wellness,yoga&goalId=uuid&from=2024-01-01&to=2024-12-31
Response: { notes: Note[], total: number, highlights: Record<noteId, string[]> }
```

#### Phase 4: Smart Actions

```typescript
// Detect unscheduled actions
POST /api/notes/[noteId]/detect-actions
Response: { hasAction: boolean, keywords: string[], suggestedTask?: string }

// Create task from note
POST /api/notes/[noteId]/create-task
Body: { taskName: string, dueDate?: Date }
Response: { taskId: string }
```

---

## Component Architecture

### Current Components (✅ Implemented)

- `ContactDetailsCard.tsx` - Main contact view with tabs
- `NoteEditor.tsx` - TipTap rich text editor with PII warnings
- `NotesHoverCard.tsx` - Quick note preview in table

### New Components Needed

#### Phase 2

```typescript
// Latest note excerpt component
<LatestNotePreview
  contactId={string}
  note={Note | null}
  onViewFull={() => void}
/>

// Fast capture action bar
<NoteCaptureActions
  contactId={string}
  onType={() => void}
  onVoice={() => void}
  onUpload={() => void}
/>

// Goal picker component
<GoalPicker
  contactId={string}
  selectedGoals={UUID[]}
  onChange={(goals: UUID[]) => void}
/>

// Status indicators
<ContactNoteStatus
  contactId={string}
  lastSessionDate={Date | null}
  nextSessionDate={Date | null}
  hasOverdueDocumentation={boolean}
/>
```

#### Phase 3

```typescript
// Notes feed with grouping
<NotesFeed
  notes={Note[]}
  groupBy="date"
  collapsible={true}
  onNoteClick={(noteId: string) => void}
/>

// Search and filter bar
<NotesSearchBar
  onSearch={(query: string) => void}
  filters={{
    tags: string[],
    goals: UUID[],
    dateRange: [Date, Date],
    sourceType: NoteSourceType[]
  }}
  onFilterChange={(filters) => void}
/>
```

#### Phase 4

```typescript
// Structured content block editor
<StructuredContentEditor
  content={ContentBlock[]}
  onChange={(blocks: ContentBlock[]) => void}
  allowedBlocks={['decision', 'plan', 'homework']}
/>

// Unscheduled action prompt
<UnscheduledActionPrompt
  note={Note}
  onCreateTask={() => void}
  onScheduleSession={() => void}
  onDismiss={() => void}
/>
```

#### Phase 5

```typescript
// AI insights sidebar
<AIInsightsSidebar
  contactId={string}
  collapsed={boolean}
  insights={{
    nextAgenda: string[],
    riskFlags: RiskFlag[],
    adherenceSummary: AdherenceSummary
  }}
  onToggle={() => void}
/>
```

#### Phase 6

```typescript
// Timeline view
<ContactTimeline
  contactId={string}
  events={TimelineEvent[]}
  filters={{
    showNotes: boolean,
    showSessions: boolean,
    showMessages: boolean,
    showTasks: boolean
  }}
  onEventClick={(event: TimelineEvent) => void}
/>
```

---

## Compliance & Safety

### Current Implementation (✅)

- [x] Server-side PII redaction before database write
- [x] Client-side PII warnings (amber banner)
- [x] No content in logs (only metadata)
- [x] RLS on notes table (user_id + contact_id scoping)

### Enhancements Needed

#### C&S Phase 2

- [ ] **Redaction feedback loop**
  - Show "Redacted X items" toast after save
  - One-click pathway: "Add email to contact record instead"
  - Link to EditContactDialog with pre-filled field
- [ ] **Prevent copy/paste detection**
  - Inline detection for common patterns (email@, phone formats)
  - Show hint: "Detected email/phone - use contact fields instead"
  - Don't block, just nudge toward proper fields

#### C&S Phase 3

- [ ] **Configurable redaction patterns**
  - Admin setting: custom regex patterns per tenant
  - Support for local IDs, member numbers, regional formats
  - UI in `/settings/privacy` for pattern management

#### C&S Phase 4

- [ ] **OCR/transcription pipeline safety**
  - Idempotent processing with retry logic
  - Dead-letter queue for failed jobs
  - Delete uploaded files after text extraction
  - Guarantee only sanitized text reaches database

#### Testing

- [ ] Unit tests for PII detector (emails, phones, SSN, addresses across locales)
- [ ] Integration tests for redaction pipeline
- [ ] E2E tests for copy/paste prevention
- [ ] Observability metrics:
  - Redaction event count per tenant
  - Note creation latency (p50, p95, p99)
  - OCR/transcription success rate
  - Voice-to-text accuracy (WER if possible)

---

## Information Architecture

### Contact Card Section Order (Top-Level Tabs)

1. **Notes** (default, primary) - ≥50% of card
2. **Overview** (demographics, consents, key goals)
3. **Journey** (timeline stitching sessions, messages, tasks)
4. **Insights** (AI summaries, risk flags, adherence trends)

### Notes Tab Internal Layout

```bash
┌─────────────────────────────────────────────────┐
│ Latest Note Excerpt (always visible)           │
│ [View Full Note →]                              │
├─────────────────────────────────────────────────┤
│ Fast Capture: [Type] [Voice] [Upload]          │
├─────────────────────────────────────────────────┤
│ Status: Last session 2 days ago | Next: Jan 15 │
│ ⚠️ Documentation overdue for Jan 12 session     │
├─────────────────────────────────────────────────┤
│ ┌─── All Notes (collapsible) ─────────────┐    │
│ │ [Search & Filters]                       │    │
│ │ ┌── Jan 12, 2024 ──────────────────┐    │    │
│ │ │ • Note preview...                 │    │    │
│ │ │ • Note preview...                 │    │    │
│ │ └───────────────────────────────────┘    │    │
│ │ ┌── Jan 5, 2024 ───────────────────┐    │    │
│ │ │ • Note preview...                 │    │    │
│ │ └───────────────────────────────────┘    │    │
│ └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘

┌─── AI Insights (secondary sidebar, collapsed) ──┐
│ [Expand to show agenda, risks, adherence]       │
└──────────────────────────────────────────────────┘
```

---

## Developer Acceptance Criteria

### Phase 2 Completion Criteria

- [ ] Latest note excerpt renders on contact card with timestamp
- [ ] Deep link `/contacts/[contactId]/notes/[noteId]` works with proper auth
- [ ] Voice-to-text captures audio, transcribes, redacts, saves as note
- [ ] Upload→OCR extracts text from photos/PDFs with >80% accuracy
- [ ] Goal picker associates note with 1+ goals via `note_goals` table
- [ ] Status signals show correct last/next session dates
- [ ] "Documentation overdue" badge appears when appropriate
- [ ] All redaction events logged to observability (count only, no content)
- [ ] RLS tests pass: users can only access their own contact's notes
- [ ] Performance: Note creation latency <500ms p95

### Phase 3 Completion Criteria

- [ ] Full-text search returns relevant results with highlighted terms
- [ ] Filters (tag, goal, date, source) narrow results correctly
- [ ] Reverse-chronological feed groups notes by date
- [ ] Expand/collapse date groups works smoothly
- [ ] Deep link copy button works, links are shareable (with auth)
- [ ] PostgreSQL full-text index improves search speed >10x vs LIKE

### Phase 4 Completion Criteria

- [ ] TipTap extensions for Decision/Plan/Homework blocks render correctly
- [ ] Structured blocks extract to `content_blocks` JSONB field
- [ ] Noted-but-unscheduled detection identifies keywords deterministically
- [ ] Toast prompt appears when action detected + no upcoming session
- [ ] One-click task creation from note works via OmniMomentum API
- [ ] Performance: Keyword detection adds <50ms to note save latency

---

## Questions for User

### Immediate Clarifications Needed

1. **Tags Table Purpose**:
   - You mentioned "tags table" - does a `tags` table exist separately from `notes.tags` array?
   - Should tags be normalized (separate table with junction) or keep as array on notes?
   - Current implementation uses `notes.tags` array - is this correct?

2. **Goals Table Relationship**:
   - Confirmed: `note_goals` junction table exists for many-to-many relationship?
   - Goal picker should query `goals WHERE contactId = X AND status != 'abandoned'`?
   - Should we display goal name/description in note UI, or just chips?

3. **Next Steps Storage**:
   - AI insights table has "next steps" - are these different from note-extracted next steps?
   - Should we store "next agreed action" as:
     a) New field `notes.next_step_extracted` (simple text)?
     b) Link to `tasks` table via new `noteId` foreign key?
     c) Store in `ai_insights` table as special insight type?

4. **OmniMomentum Integration**:
   - Confirmed: OmniMomentum = tasks system?
   - API endpoint for creating task from note: `POST /api/tasks` or different?
   - Should task automatically link back to source note (`task.sourceNoteId`)?

5. **Calendar Events Table**:
   - Use `calendar_events` table for "last/next session" calculations?
   - Or should we query `interactions` table for session events?
   - Definition of "session" - specific `event_type` or `business_category`?

6. **Copy/Paste Detection**:
   - Current PII detector runs on `onUpdate` in editor - is this correct for copy/paste?
   - Should we also add `onPaste` event handler with immediate inline warning?
   - "Don't block, just nudge" - correct approach?

---

## Priority Ranking (Your Input Needed)

Which phase should we tackle next?

**Option A: Phase 2 (Fast Capture)** - Voice + OCR + Goal linking

- Highest practitioner value (reduces friction)
- Complex (Whisper API, Tesseract, file handling)
- ~2-3 weeks implementation

**Option B: Phase 3 (Search & Filtering)** - Full-text search + filters

- High retrieval value ("find last plan")
- Medium complexity (PostgreSQL tsvector, filter UI)
- ~1-2 weeks implementation

**Option C: Phase 4 (Structured Blocks)** - Decision/Plan/Homework affordances

- High documentation quality value
- Low complexity (TipTap extensions, JSONB)
- ~1 week implementation

**Option D: Phase 2.1 only (Latest Note Excerpt + Deep Links)** - Quick win

- Medium value (better above-fold experience)
- Low complexity (component + route)
- ~2-3 days implementation

**Recommendation**: Start with **Option D** (latest note excerpt) → validate UX → then Phase 2 (fast capture) for maximum practitioner adoption.

---

## Next Steps

Please confirm:

1. Answers to clarification questions above
2. Priority ranking (which phase to implement next)
3. Any adjustments to proposed architecture
4. Timeline expectations (sprint planning)

Once confirmed, I'll create detailed implementation tasks for the chosen phase.
