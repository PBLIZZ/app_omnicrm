# Product Requirements Document: Smart Notes System for Wellness Practitioners

**PRD ID:** 0001
**Feature Name:** Smart Notes with Perplexity-Inspired Cards UI
**Document Version:** 1.0
**Created:** October 13, 2025
**Target Audience:** Wellness practitioners (health coaches, massage therapists, yoga instructors, holistic practitioners)
**Priority:** High - Core business workflow feature

---

## 1. Introduction/Overview

Wellness practitioners rely on session notes as the **primary artifact** for documenting client progress, interventions, goals, and care continuity. Current note-taking solutions are either too clinical (EHR-style forms) or too simple (plain text editors), failing to balance fast capture with intelligent organization.

This PRD defines a **Smart Notes System** that:

- Enables **rapid note capture** via text or voice (≤3 minutes)
- Presents notes in a **card-based UI** inspired by Perplexity's financial data layout
- Provides **AI-powered insights** as a secondary, non-intrusive layer
- Maintains **notes as primary**, with AI enriching (not replacing) practitioner documentation

### Problem Statement

Practitioners face three key friction points:

1. **Capture friction**: Typing detailed notes post-session is time-consuming
2. **Information overload**: Finding relevant past notes requires scrolling through chronological lists
3. **Context loss**: Notes exist in isolation without connection to sessions, goals, or contact history

### Solution

A unified notes interface with:

- **Rapid Note capture**: Modal-based quick entry (text/voice) accessible globally
- **3 Latest Notes cards**: Most recent session notes in fixed-height scrollable cards
- **AI-Generated Timeline**: Chronological summary of notes + sessions + correspondence
- **Next Steps & Goals**: AI-extracted action items and goal summaries
- **AI Insights sidebar**: Collapsible right-side panel with risk flags, sentiment trends, and suggested agendas

---

## 2. Goals

### Primary Goals

1. **Reduce note capture time by 80%** - Voice recording + auto-transcription vs. manual typing
2. **Improve note retrieval speed by 300%** - Card-based UI + AI timeline vs. linear scrolling
3. **Increase documentation compliance by 50%** - Quick capture reduces "skip documenting" behavior
4. **Enable care continuity** - AI timeline surfaces patterns across notes, sessions, and correspondence

### Secondary Goals

5. **Surface actionable insights** - AI-extracted next steps reduce manual follow-up planning
6. **Maintain practitioner control** - AI reads and comments but never edits human-authored notes
7. **Support compliance** - PII redaction at server level, audit trail for consent management

---

## 3. User Stories

### Core Workflows

**US-01: Rapid Note Capture (Primary Workflow)**
_As a_ wellness practitioner
_I want to_ quickly capture session notes via voice or text while context is fresh
_So that_ I don't lose details and can document immediately after (or between) sessions

**Acceptance Criteria:**

- Global "Rapid Note" button in header (lightning bolt icon with tooltip)
- Opens full-screen modal with dimmed background
- Text input bar with mic icon for voice recording
- Transcription appears inline as user speaks (after recording ends)
- User can edit inline (cursor positioning, delete, copy/paste)
- Character limit: 1200 characters (≈3 minutes of speech)
- Contact selector dropdown to assign note to specific client
- Auto-save draft if user closes without saving
- PII redaction happens at server level before database write
- Toast notifications: "Note saved" (green) + "PII detected and redacted" (red) if applicable

---

**US-02: View Latest Session Notes**
_As a_ practitioner preparing for an upcoming session
_I want to_ see the 3 most recent notes for this client at a glance
_So that_ I can quickly recall past sessions without scrolling

**Acceptance Criteria:**

- 3 cards displayed horizontally (responsive: stack vertically on mobile)
- Each card shows: Session type + Date (of session, not note creation date)
- Full note content scrollable within fixed-height card (no visible scrollbar)
- Tags displayed as chips on each card (if practitioner tagged the note)
- Chronologically ordered (most recent first)
- Click "View Full Note" link opens `/contacts/[contactId]/notes/[noteId]`

---

**US-03: Review AI-Generated Timeline**
_As a_ practitioner
_I want to_ see a chronological timeline of notes, sessions, and correspondence
_So that_ I understand the client's journey and can spot patterns (e.g., cancellations, progress plateaus)

**Acceptance Criteria:**

- Timeline displayed as vertical line with circular nodes
- Left side: Date (e.g., "Oct 10")
- Right side: Event type (e.g., "Hot Stones Massage", "Email received", "Note added")
- Main text: AI-generated summary of the event (50-150 characters)
- Sentiment indicator on each node:
  - 🔴 Red: Declining/Concerned (e.g., "Appointment cancelled", "No note recorded")
  - 🔵 Blue: Neutral/Stable (e.g., "Appointment rescheduled")
  - 🟢 Green: Improving/Positive (e.g., "Appointment attended", "Goal progress noted")
- Sentiment calculated by AI at time of insight generation (stored in `ai_insights` table)
- Infinite scroll: Load more timeline events on demand (no visible scrollbar)
- Data sources: `notes` table + `interactions` table (sessions = calendar events, correspondence = emails)

---

**US-04: Access Next Steps & Goals**
_As a_ practitioner
_I want to_ see upcoming action items and active goals for this client
_So that_ I can plan the next session and track progress

**Acceptance Criteria:**

- Two collapsible sections: "Next Steps" and "Goals"
- "Next Steps" expanded by default, "Goals" collapsed
- Data pulled from `ai_insights` table (`next_steps` field)
- Goals display format: Goal name + progress indicator (if measurable, e.g., "Weight Loss Goal - 60% complete")
- Goals filtered: Show active goals only (status != 'abandoned')
- Click to expand/collapse each section

---

**US-05: Explore AI Insights (Optional, Secondary)**
_As a_ practitioner
_I want to_ review AI-generated insights (risk flags, adherence trends, suggested agenda)
_So that_ I can make informed decisions without re-reading all notes

**Acceptance Criteria:**

- Right-side collapsible sidebar (collapsed by default)
- Trigger icon pulsates to indicate insights available
- Sidebar displays summary of last 6 insights for this contact
- Insight types: Risk flags, sentiment trends, adherence patterns, suggested agenda items
- AI reads: All notes + Interactions + Sessions
- AI writes insights to `ai_insights` table via background job after note save
- User can dismiss/collapse insights at any time

---

### Supporting Workflows

**US-06: Add Full Note (Extended Workflow)**
_As a_ practitioner
_I want to_ create a longer, formatted note with tags and goal links
_So that_ I can document complex sessions requiring structure

**Acceptance Criteria:**

- "Add Note" button in Contact Details sidebar (not global header)
- Opens full TipTap editor with formatting toolbar (headings, bold, italic, lists, color)
- Tag picker: Select from 36 wellness tags (4 categories: Services, Demographics, Goals & Health, Engagement Patterns)
- Goal linker: Associate note with active goals via `note_goals` junction table
- PII redaction warnings displayed inline (amber banner)
- "Save" button commits to database with PII redaction at server level

---

**US-07: Link Note to Session (Optional)**
_As a_ practitioner
_I want to_ manually link a note to a specific past session
_So that_ the timeline shows correct associations

**Acceptance Criteria:**

- In note editor: "Link to Session" dropdown
- Lists recent sessions from `interactions` table (type = 'calendar_event' for this contact)
- Optional: Auto-suggest session if note created within 24 hours of session end time
- Linked session displayed in note metadata (e.g., "For session: Oct 10 Hot Stones Massage")

---

## 4. Functional Requirements

### FR-01: Rapid Note Capture Modal

**Must Have:**

1. Global button in header (lightning bolt icon + "Rapid Note" tooltip)
2. Full-screen modal with dimmed background (blocks app interaction)
3. Input bar with text entry and mic icon
4. Voice recording:
   - Max duration: 3 minutes
   - Transcription via OpenAI Whisper API (after recording finishes)
   - Waveform visualization during recording
   - "Finish" button (checkmark) to stop recording and transcribe
5. Inline editing:
   - Cursor positioning, delete, backspace, copy/paste
   - Type directly in note body
   - Position cursor and click mic to add more voice content
6. Contact selector dropdown (required field)
7. Character limit: 1200 characters
8. Auto-save draft to localStorage if user closes modal without saving
9. "Save" button sends to server with PII redaction
10. Toast notifications:
    - "Note saved" (green, 3s duration)
    - "PII detected and redacted" (red, 5s duration, if applicable)

**Should Have:**

- Keyboard shortcut to open modal (e.g., Cmd+Shift+N)
- Recent contacts autocomplete in contact selector

**Won't Have (V1):**

- Real-time transcription (streaming)
- Formatting toolbar (plain text only)

---

### FR-02: Contact Details Page Layout

**Two-Column Layout (Desktop):**

**Left Column (70%):**

1. **3 Latest Notes Cards** (top section, horizontally arranged)
   - Card structure:
     - Header: Session type (e.g., "Hot Stones Massage") + Date
     - Body: Full note content (scrollable, no visible scrollbar)
     - Footer: Tags as chips (if present)
   - Fixed height: ~300px per card
   - Hover state: Subtle shadow elevation
   - Click "View Full" opens `/contacts/[contactId]/notes/[noteId]`

2. **AI-Generated Timeline** (below 3 cards)
   - Vertical timeline with circular nodes
   - Date (left) → Circle → Event type (right) → AI summary (main text) → Sentiment indicator
   - Infinite scroll (load 20 events at a time)
   - No visible scrollbar

**Right Column (30%):**

1. **AI Insights Card** (collapsed by default, top of column)
   - When collapsed: Small header with expand icon and pulsating indicator
   - When expanded: Same fixed height as the 3 notes cards (~300px)
   - Shows last 6 insights from `ai_insights` table
   - Sections: Risk Flags, Sentiment Trends, Suggested Agenda
   - Insight cards with icons and brief text
   - Internal scrolling available if content exceeds card height
   - Collapsible via collapse button

2. **Next Steps & Goals** (below AI Insights)
   - Two sections: "Next Steps" (expanded), "Goals" (collapsed)
   - Data from `ai_insights` table and `goals` table
   - When AI Insights is collapsed: This card aligns horizontally with Latest Smart Notes Timeline
   - When AI Insights is expanded: This card appears below the expanded AI Insights card

**Mobile Responsiveness:**

- Single-column stack: 3 cards → Timeline → Next Steps → Goals → AI Insights (collapsed)
- Simplified timeline: Hide dates, show only circles + text

---

### FR-03: Tabs Navigation

**Tab Structure:**

1. **Overview** (default tab)
   - 3 Latest Notes cards
   - AI Timeline
   - Next Steps & Goals
   - AI Insights sidebar (right)

2. **All Notes**
   - Infinite scroll list of all notes (reverse chronological)
   - Search bar with filters: Tags, Date range, Session type
   - Each note: Preview (first 100 chars) + "Read more" link

3. **Contact Details**
   - Full contact record: Email, phone, address, preferences, emergency contact
   - Edit button opens dialog for updating fields
   - Consent management section

---

### FR-04: AI Insights Generation (Background Job)

**Trigger:**

- After note save (via background job queue)
- Scheduled batch: Every 6 hours for contacts with recent activity

**Data Sources:**

- `notes` table (all notes for contact)
- `interactions` table (sessions = calendar events, correspondence = emails)
- `goals` table (active goals for contact)

**Insight Types:**

1. **Timeline Summary**: AI-generated text for each note/session/email (50-150 chars)
2. **Sentiment Analysis**: Red/Blue/Green indicator based on note content + goal progress
3. **Next Steps**: Extract action items from latest 1-3 notes (keyword detection + LLM)
4. **Risk Flags**: Identify concerning patterns (e.g., "3 cancellations in 2 weeks")
5. **Adherence Trends**: Track goal adherence (e.g., "Sleep routine declining")
6. **Suggested Agenda**: Generate talking points for next session

**Storage:**

- Write to `ai_insights` table with fields:
  - `subject_type` = 'contact'
  - `subject_id` = contact UUID
  - `kind` = 'timeline_summary' | 'sentiment' | 'next_steps' | 'risk_flag' | 'agenda'
  - `content` = JSONB with insight data
  - `model` = LLM model used (e.g., 'gpt-4')
  - `fingerprint` = Hash of input data (for deduplication)

**Permissions:**

- AI has **read-only** access to notes
- AI **never edits** notes (immutable practitioner content)
- AI writes **only** to `ai_insights` table

---

### FR-05: PII Redaction

**Server-Side Redaction (Mandatory):**

- Detect: Emails, phone numbers, SSNs, addresses
- Redact before writing to `notes.content_plain` and `notes.content_rich`
- Store redacted entities in `notes.pii_entities` JSONB field
- Example: `"Call me at 555-1234"` → `"Call me at [PHONE_REDACTED]"`

**Client-Side Warnings:**

- Inline detection during typing (amber banner)
- Suggestion: "Detected phone number - add to contact record instead"
- Link to contact edit dialog with pre-filled field

**Toast Notification:**

- If PII redacted: Red toast "PII information detected and successfully redacted" (5s)

---

### FR-06: Tags System

**Wellness Tag Taxonomy (36 Tags, 4 Categories):**

1. **Services (14):** Yoga, Massage, Meditation, Pilates, Reiki, Acupuncture, Personal Training, Nutrition Coaching, Life Coaching, Therapy, Workshops, Retreats, Group Classes, Private Sessions

2. **Demographics (11):** Senior, Young Adult, Professional, Parent, Student, Beginner, Intermediate, Advanced, VIP, Local, Traveler

3. **Goals & Health (11):** Stress Relief, Weight Loss, Flexibility, Strength Building, Pain Management, Mental Health, Spiritual Growth, Mindfulness, Athletic Performance, Injury Recovery, Prenatal

4. **Engagement Patterns (10):** Regular Attendee, Weekend Warrior, Early Bird, Evening Preferred, Seasonal Client, Frequent Visitor, Occasional Visitor, High Spender, Referral Source, Social Media Active

**Implementation:**

- Tags stored in `notes.tags` array (note-level tagging)
- Tags also stored in `contacts.tags` JSONB (contact-level tagging)
- Tag picker component: Multi-select dropdown with category headers
- Display: Chips/badges with category color coding

**Tag Interaction:**

- Click tag on note card: Filter "All Notes" tab by that tag
- Tag autocomplete in editor based on user's frequently used tags

---

## 5. Non-Goals (Out of Scope for V1)

1. **AI note editing** - AI will never modify notes; practitioners retain full authorship
2. **Real-time transcription** - Voice recording transcribes after recording completes (not streaming)
3. **Note versioning** - No edit history tracking (immutable after save, but editable)
4. **Collaborative notes** - Single practitioner authorship (no multi-user editing)
5. **HIPAA compliance certification** - Basic PII redaction only; full HIPAA requires additional infrastructure
6. **Offline mode** - Requires internet connection for transcription and AI insights
7. **Custom AI models** - Use OpenAI Whisper and OpenRouter (no custom model training)
8. **Automatic note-to-session linking** - Manual linking only (proximity-based auto-suggest as enhancement)

---

## 6. Design Considerations

### Visual Design (Perplexity-Inspired)

**Card Style:**

- Clean, minimal borders (1px solid #e5e7eb)
- Subtle shadow on hover (`shadow-md`)
- Rounded corners (8px)
- White background with subtle off-white for alternating cards

**Timeline Style:**

- Vertical line: 2px solid #d1d5db
- Circular nodes: 12px diameter, filled with sentiment color
- Date typography: Small, muted gray (#6b7280)
- Event type typography: Medium weight, dark gray (#374151)
- Summary text: Regular weight, slightly larger (16px)

**AI Insights Sidebar:**

- Collapsed state: 40px wide icon bar on right edge
- Expanded state: 320px width (slides in from right)
- Pulsating animation on trigger icon (subtle glow effect)
- Frosted glass backdrop (`backdrop-blur-lg`)

**Responsive Breakpoints:**

- Desktop: 2-column layout (70/30 split)
- Tablet (< 1024px): Single column, AI sidebar overlays content
- Mobile (< 640px): Stack all cards vertically, hide timeline dates

---

### Component Architecture

**New Components:**

1. `RapidNoteModal.tsx` - Full-screen capture modal
2. `VoiceRecorder.tsx` - Waveform visualization + mic controls
3. `LatestNotesCards.tsx` - 3-card horizontal layout
4. `AITimelineCard.tsx` - Vertical timeline with sentiment indicators
5. `NextStepsGoalsCard.tsx` - Collapsible sections for next steps and goals
6. `AIInsightsCard.tsx` - Collapsible card at top of right column (expanded by default)
7. `ContactDetailsHeader.tsx` - Photo + name + tags + quick stats
8. `NoteTagPicker.tsx` - Multi-select dropdown with wellness taxonomy
9. `TranscriptionService.ts` - OpenAI Whisper API integration
10. `AIInsightsService.ts` - Background job for insight generation

**Updated Components:**

- `NoteEditor.tsx` - Add goal linking and tag picker
- `ContactDetailsCard.tsx` - New layout with tabs and card-based UI

---

## 7. Technical Considerations

### Database Schema

**Existing Tables (No Changes Required):**

- `notes` - Already has `contentRich`, `contentPlain`, `piiEntities`, `tags`, `sourceType`
- `contacts` - Already has `tags` JSONB field
- `interactions` - Sessions (calendar events) and emails
- `goals` - Active goals for contacts
- `ai_insights` - Store AI-generated insights

**New Fields (Optional Enhancements):**

- `notes.linked_session_id` - UUID foreign key to `interactions` table (for manual session linking)
- `notes.voice_recording_url` - Store original audio file URL (if preserving audio)

**Junction Table:**

- `note_goals` - Many-to-many relationship between notes and goals (already exists per spec)

---

### API Endpoints

**New Endpoints:**

1. **POST /api/notes/transcribe**
   - Body: `{ audioBlob: Blob, contactId: string }`
   - Response: `{ text: string, duration: number }`
   - Calls OpenAI Whisper API, returns transcribed text

2. **POST /api/notes/rapid-capture**
   - Body: `{ contactId: string, contentPlain: string, sourceType: 'typed' | 'voice' }`
   - Response: `{ note: Note, redactionWarning: boolean }`
   - Simplified endpoint for quick capture (skips rich text)

3. **GET /api/ai-insights/[contactId]**
   - Query: `{ limit: number, types: string[] }`
   - Response: `{ insights: AiInsight[] }`
   - Fetch latest AI insights for contact

4. **GET /api/contacts/[contactId]/timeline**
   - Query: `{ limit: number, offset: number }`
   - Response: `{ events: TimelineEvent[], hasMore: boolean }`
   - Merged timeline of notes + sessions + emails with AI summaries

**Updated Endpoints:**

- **POST /api/notes** - Add support for `linkedSessionId` field
- **PUT /api/notes/[noteId]** - Allow updating tags and goal links

---

### Background Job Architecture

**Job Types:**

1. **`ai_insight_timeline`** - Generate timeline summaries for contact
2. **`ai_insight_sentiment`** - Analyze sentiment for recent notes
3. **`ai_insight_next_steps`** - Extract action items from latest notes
4. **`ai_insight_risk_flags`** - Identify concerning patterns
5. **`ai_insight_agenda`** - Generate suggested talking points for next session

**Trigger Mechanism:**

- After note save: Enqueue job to `jobs` table with `kind = 'ai_insight_timeline'` (and other types)
- Batch processing: Cron job every 6 hours for contacts with recent activity (new notes/sessions in last 7 days)

**Job Processor:**

- Read contact data (notes + interactions + goals)
- Call LLM (OpenRouter) with structured prompt
- Parse LLM response
- Write insights to `ai_insights` table
- Update `jobs` table with status = 'completed' or 'failed'

---

### OpenAI Whisper Integration

**Endpoint:** `https://api.openai.com/v1/audio/transcriptions`

**Request:**

```typescript
const formData = new FormData();
formData.append("file", audioBlob, "recording.webm");
formData.append("model", "whisper-1");
formData.append("language", "en");
formData.append("response_format", "text");

const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
  method: "POST",
  headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  body: formData,
});

const text = await response.text();
```

**Error Handling:**

- Network timeout: Retry once with exponential backoff
- API error (e.g., invalid audio format): Return error message to user
- Audio too long: Truncate to 3 minutes before sending

**Client-Side Audio Capture:**

```typescript
// Use browser MediaRecorder API
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream);
const chunks: Blob[] = [];

mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = () => {
  const audioBlob = new Blob(chunks, { type: "audio/webm" });
  // Send to /api/notes/transcribe
};

mediaRecorder.start();
// After 3 minutes or user clicks "Finish":
mediaRecorder.stop();
```

---

### AI Insights Schema Design

**`ai_insights` Table Structure:**

```typescript
{
  id: UUID,
  userId: UUID,
  subjectType: 'contact',
  subjectId: UUID (contact ID),
  kind: 'timeline_summary' | 'sentiment' | 'next_steps' | 'risk_flag' | 'adherence_trend' | 'agenda',
  content: JSONB {
    // For 'timeline_summary':
    { eventId: UUID, eventType: 'note' | 'session' | 'email', summary: string, sentiment: 'positive' | 'neutral' | 'negative' }

    // For 'next_steps':
    { steps: string[], extractedFrom: UUID[] (note IDs) }

    // For 'risk_flag':
    { flag: string, severity: 'low' | 'medium' | 'high', evidence: string[] }

    // For 'agenda':
    { topics: string[], priority: number }
  },
  model: string,
  createdAt: timestamp,
  fingerprint: string (hash of input data for deduplication)
}
```

**Deduplication Logic:**

- Compute fingerprint = `SHA256(contactId + notesContent + interactionsContent)`
- Before generating insight: Check if `ai_insights` row exists with same `fingerprint` and `kind`
- If exists and `createdAt` < 24 hours ago: Skip generation (use cached insight)
- If exists and `createdAt` >= 24 hours ago: Regenerate (data may have changed)

---

## 8. Success Metrics

### Adoption Metrics

1. **Rapid Note usage**: 60% of notes created via Rapid Note modal (vs. full editor) within 30 days
2. **Voice recording adoption**: 30% of Rapid Notes use voice transcription within 60 days
3. **Timeline engagement**: 70% of practitioners view AI timeline at least once per client session

### Performance Metrics

4. **Note capture time**: Median time from "open modal" to "save" < 90 seconds
5. **Transcription latency**: 95th percentile < 10 seconds for 3-minute recordings
6. **Page load time**: Contact Details page loads in < 2 seconds for contacts with 100+ notes

### Quality Metrics

7. **PII redaction accuracy**: 99% detection rate (validated via manual audit sample)
8. **AI insight relevance**: 4.0+ user rating (1-5 scale) for "Was this insight helpful?"
9. **Documentation compliance**: 90% of sessions have associated notes within 24 hours

---

## 9. Open Questions

### Technical Questions

1. **Audio storage**: Save or discard? Discard after transcription(reduces storage costs, privacy concerns)

2. **Transcription fallback**: What if OpenAI Whisper API is unavailable?
   - **Recommendation**: Show error message and delete audio file, error message, recording failed please try again or use the keyboard to type your note
3. **AI insight refresh frequency**: How often should we regenerate insights?
   - **Recommendation**: Overnight unless user manually pushes a refresh button for fresh insights (uses tokens, user advised that refreshing frequently will user upo all her tokens and may result in limited ai service until tokens are recharged)

### UX Questions

4. **Rapid Note contact selector**: Should it default to "last viewed contact" or always require manual selection?
   - **Recommendation**: Default to last viewed contact (if session active), with prominent dropdown to change

5. **Timeline pagination**: Load 20 events at a time, or load all on initial render?
   - **Recommendation**: Load 20, infinite scroll for more (performance optimization)

6. **AI Insights sidebar**: Should it auto-expand on first visit per session, or always collapsed?
   - **Recommendation**: Collapsed by default, persist user preference in localStorage

### Business Questions

7. **AI cost management**: Estimated cost per contact per month for insights?
   - **Analysis needed**: Depends on LLM model (GPT-4 vs. GPT-3.5) and note frequency
   - **Recommendation**: Start with openrouter free model like deepseek, upgrade to gpt 5 nano if quality insufficient, make sure its easyt to switch providers, dont couple the service with the provider, provider selection through variable management

8. **Compliance**: Do we need HIPAA Business Associate Agreement with OpenAI? PII is redacted before its saved, llm use is based on redacted text only, all background processes will adhere to this, where there may be a need for hipaa server is in the chat assistant if the user shares pii or health medical identifiable info, but isnt that the reesponsiility of the user and not the ai, for our programmed ai use theres no pii going to their servers? Not sure. But also the target market is welklness not health, so we are talking alternative theraopies, massagfe and reflexology, reikei and meditation, wellness, nutrituion and fitness coaches. Yopga, pilates, aqua aerobics, etc.
   - **Analysis needed**: Depends on target market (medical vs. wellness)
   - **Recommendation**: Consult legal counsel; may need to use Azure OpenAI (HIPAA-compliant) instead of standard API

---

## 10. Implementation Phases

### Phase 1: Rapid Note Capture (Week 1-2) - 5-7 days

**Goal:** Enable fast note creation without opening contact details page

**Deliverables:**

- [ ] `RapidNoteModal.tsx` component with text input and contact selector
- [ ] `VoiceRecorder.tsx` with waveform visualization and 3-minute timer
- [ ] `POST /api/notes/transcribe` endpoint (OpenAI Whisper integration)
- [ ] `POST /api/notes/rapid-capture` simplified save endpoint
- [ ] PII redaction pipeline (reuse existing `redactPII` function)
- [ ] Toast notifications for save confirmation and PII warnings
- [ ] Auto-save draft to localStorage
- [ ] Global header button (lightning bolt icon + tooltip)

**Acceptance Criteria:**

- User can open modal from any page in app
- Voice recording transcribes accurately (>95% word accuracy for clear speech)
- PII detected and redacted before database write
- Character limit enforced (1200 chars)
- Modal blocks background interaction (dimmed overlay)

---

### Phase 2: Cards UI - Latest 3 Notes (Week 2-3) - 4-5 days

**Goal:** Display most recent notes in card format on Contact Details page

**Deliverables:**

- [ ] `LatestNotesCards.tsx` component with 3-card horizontal layout
- [ ] Note card structure: Header (session type + date), Body (scrollable content), Footer (tags)
- [ ] Responsive design: Stack vertically on mobile
- [ ] "View Full Note" link routing to `/contacts/[contactId]/notes/[noteId]`
- [ ] Query optimization: Fetch only latest 3 notes for contact
- [ ] Tag chips display (if note has tags)

**Acceptance Criteria:**

- Cards display correctly with fixed height (~300px)
- Scrollable content without visible scrollbar
- Click "View Full" navigates to note detail page
- Tags render as colored chips
- Mobile: Cards stack vertically (single column)

---

### Phase 3: AI Timeline Card (Week 3-4) - 5-6 days

**Goal:** Show chronological timeline with AI-generated summaries

**Deliverables:**

- [ ] `AITimelineCard.tsx` component with vertical timeline
- [ ] Timeline node structure: Date → Circle → Event type → Summary → Sentiment indicator
- [ ] `GET /api/contacts/[contactId]/timeline` endpoint
- [ ] Background job: `ai_insight_timeline` to generate summaries
- [ ] Merge data from `notes` + `interactions` tables
- [ ] Sentiment calculation (LLM-based)
- [ ] Infinite scroll (load 20 events at a time)
- [ ] Responsive: Hide dates on mobile, show only circles + text

**Acceptance Criteria:**

- Timeline displays notes, sessions, and emails in chronological order
- AI summaries are concise (50-150 characters)
- Sentiment indicators (red/blue/green) render correctly
- Infinite scroll loads more events without lag
- No visible scrollbar

---

### Phase 4: Next Steps & Goals Card (Week 4-5) - 3-4 days

**Goal:** Surface actionable next steps and goal progress

**Deliverables:**

- [ ] `NextStepsGoalsCard.tsx` component with two collapsible sections
- [ ] "Next Steps" section: AI-extracted action items from latest notes
- [ ] "Goals" section: Active goals with progress indicators
- [ ] Background job: `ai_insight_next_steps` to extract action items
- [ ] Query `goals` table for active goals (status != 'abandoned')
- [ ] Progress bar component for measurable goals
- [ ] Expand/collapse interaction

**Acceptance Criteria:**

- "Next Steps" expanded by default, "Goals" collapsed
- Action items extracted from latest 1-3 notes
- Goals display with progress bars (if measurable)
- Click to expand/collapse each section

---

### Phase 5: AI Insights Card (Week 5-6) - 4-5 days

**Goal:** Provide AI-generated insights in a prominent, collapsible card format

**Deliverables:**

- [ ] `AIInsightsCard.tsx` component (collapsed by default at top of right column)
- [ ] When collapsed: Small header with expand icon and pulsating indicator
- [ ] When expanded: Fixed height matching 3 notes cards (~300px)
- [ ] Display last 6 insights from `ai_insights` table
- [ ] Insight types: Risk flags, sentiment trends, suggested agenda
- [ ] Internal scrolling within card if content exceeds fixed height
- [ ] Background jobs: `ai_insight_risk_flags`, `ai_insight_sentiment`, `ai_insight_agenda`
- [ ] Collapse button to minimize card back to small header
- [ ] When collapsed: Next Steps & Goals card aligns with Timeline on same horizontal line
- [ ] Smooth expand/collapse animation
- [ ] Persist user preference (collapsed/expanded) in localStorage

**Acceptance Criteria:**

- Card collapsed by default on page load (showing small header with pulsating icon)
- Card expands to fixed height matching the 3 notes cards when clicked
- Next Steps & Goals aligns horizontally with Timeline when AI Insights is collapsed
- Next Steps & Goals repositions smoothly below AI Insights when expanded
- Insights render with icons and brief text in organized sections
- Internal scrolling works within card boundaries
- User preference persisted across sessions

---

### Phase 6: Full Note Editor Enhancements (Week 6-7) - 3-4 days

**Goal:** Add tag picker and goal linking to full note editor

**Deliverables:**

- [ ] `NoteTagPicker.tsx` component with 36 wellness tags (4 categories)
- [ ] Goal picker component: Multi-select dropdown of active goals
- [ ] Update `POST /api/notes` to accept `tags` and `goalIds` arrays
- [ ] Update `note_goals` junction table on save
- [ ] Display linked goals as chips in note detail view
- [ ] Tags autocomplete based on user's frequently used tags

**Acceptance Criteria:**

- Tag picker shows 36 tags organized by category
- User can select multiple tags
- Goal picker shows only active goals for contact
- Tags and goals saved to database on note save
- Tags display as chips on note cards and detail page

---

### Phase 7: Testing & Refinement (Week 7-8) - 5-7 days

**Goal:** Ensure quality, performance, and user experience

**Deliverables:**

- [ ] Unit tests for Rapid Note modal, voice recorder, PII redaction
- [ ] Integration tests for API endpoints (transcribe, timeline, insights)
- [ ] E2E tests (Playwright): Full workflow from rapid note capture to viewing timeline
- [ ] Performance testing: Page load time, transcription latency, infinite scroll
- [ ] Accessibility audit: Keyboard navigation, ARIA labels, screen reader support
- [ ] User acceptance testing with 3-5 wellness practitioners
- [ ] Bug fixes and UI polish based on feedback

**Acceptance Criteria:**

- All unit tests pass (>90% code coverage)
- E2E tests cover core user stories
- Page load time < 2 seconds (95th percentile)
- Transcription latency < 10 seconds (95th percentile)
- No critical accessibility issues (WCAG 2.1 AA compliance)
- User satisfaction score >4.0 (1-5 scale)

---

## 11. Developer Acceptance Criteria

### Functional Completeness

- [ ] User can create rapid note via global button (text or voice)
- [ ] Voice recordings transcribe accurately (>95% word accuracy)
- [ ] PII detected and redacted at server level
- [ ] Contact Details page displays 3 latest notes in card format
- [ ] AI timeline shows chronological events with sentiment indicators
- [ ] Next Steps & Goals card displays AI-extracted action items and active goals
- [ ] AI Insights sidebar provides optional secondary insights
- [ ] Full note editor supports tags and goal linking

### Performance Benchmarks

- [ ] Rapid Note modal opens in < 500ms
- [ ] Transcription completes in < 10 seconds (95th percentile)
- [ ] Contact Details page loads in < 2 seconds (95th percentile)
- [ ] Timeline infinite scroll loads smoothly (no visual lag)
- [ ] Background jobs complete within 60 seconds for contacts with <100 notes

### Security & Compliance

- [ ] PII redaction tested with 100+ sample notes (99% detection rate)
- [ ] No PII stored in database (validated via manual audit)
- [ ] RLS policies enforced: Users can only access their own notes
- [ ] API endpoints require authentication
- [ ] Encrypted data in transit (HTTPS) and at rest (Supabase encryption)

### Code Quality

- [ ] TypeScript strict mode: No `any`, no non-null assertions, no ESLint disables
- [ ] Layered architecture: Repository → Service → Route pattern followed
- [ ] Business schemas: Pure Zod validation (no transforms)
- [ ] Error handling: All errors wrapped as `AppError` with status codes
- [ ] Unit test coverage >80% for critical paths (PII redaction, transcription, AI insights)

---

## 12. Future Enhancements (Post-V1)

### Phase 8: Advanced Search & Filtering

- Full-text search across `notes.contentPlain` using PostgreSQL tsvector
- Filters: By tag, by goal, by date range, by session type
- "Smart recall" shortcuts: "Last plan", "Last breakthrough", "Last adverse reaction"

### Phase 9: Note Templates

- Pre-filled templates for common session types (e.g., "Initial Consultation", "Follow-up Session")
- Template variables: `{{clientName}}`, `{{sessionDate}}`, `{{previousGoals}}`
- User-customizable templates

### Phase 10: Multi-Practitioner Collaboration

- Shared notes for team-based care (e.g., clinic with multiple therapists)
- Permission levels: Owner, Editor, Viewer
- Audit trail: Who created/edited each note

### Phase 11: Client Portal

- Clients can view their own notes (read-only, with practitioner approval)
- Clients can add self-reflections (separate from practitioner notes)
- Consent management: Clients opt-in to note sharing

### Phase 12: HIPAA Compliance

- Business Associate Agreement with OpenAI (or switch to Azure OpenAI)
- Audit logging: Every note access, edit, delete tracked
- Encrypted backups with 7-year retention
- Breach notification system

---

## 13. Appendices

### Appendix A: Wellness Tag Taxonomy (Full List)

**Services (14):**
Yoga, Massage, Meditation, Pilates, Reiki, Acupuncture, Personal Training, Nutrition Coaching, Life Coaching, Therapy, Workshops, Retreats, Group Classes, Private Sessions

**Demographics (11):**
Senior, Young Adult, Professional, Parent, Student, Beginner, Intermediate, Advanced, VIP, Local, Traveler

**Goals & Health (11):**
Stress Relief, Weight Loss, Flexibility, Strength Building, Pain Management, Mental Health, Spiritual Growth, Mindfulness, Athletic Performance, Injury Recovery, Prenatal

**Engagement Patterns (10):**
Regular Attendee, Weekend Warrior, Early Bird, Evening Preferred, Seasonal Client, Frequent Visitor, Occasional Visitor, High Spender, Referral Source, Social Media Active

---

### Appendix B: PII Redaction Patterns

**Detection Patterns:**

- Email: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g`
- Phone: `/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g` (US format)
- SSN: `/\b\d{3}-\d{2}-\d{4}\b/g`
- Address: Custom regex for street patterns (e.g., "123 Main St")

**Redaction Format:**

- `[EMAIL_REDACTED]`
- `[PHONE_REDACTED]`
- `[SSN_REDACTED]`
- `[ADDRESS_REDACTED]`

**Storage:**

- Original text: Discarded (never stored)
- Redacted text: Stored in `notes.contentPlain`
- Redaction metadata: Stored in `notes.piiEntities` JSONB

  ```json
  [
    { "type": "email", "start": 45, "end": 65, "redacted": true },
    { "type": "phone", "start": 120, "end": 132, "redacted": true }
  ]
  ```

---

### Appendix C: AI Prompt Templates

**Timeline Summary Prompt:**

```typescript
Summarize the following event in 100-250 characters. Be concise and focus on key outcomes.

Event Type: {eventType} (note | session | email)
Event Date: {eventDate}
Content: {content}

Output format: Brief summary text only (no markdown, no labels).
```

**Next Steps Extraction Prompt:**

```typescript
Extract action items from the following notes. Look for keywords like "client will", "homework", "next session", "follow-up".

Notes:
{notesContent}

Output format: JSON array of strings.
Example: ["Practice breathing exercises 3x per week", "Schedule follow-up in 2 weeks"]
```

**Risk Flag Detection Prompt:**

```typescript
Analyze the following contact history and identify any concerning patterns (e.g., frequent cancellations, declining adherence, negative sentiment).

Notes: {notesContent}
Sessions: {sessionsData}

Output format: JSON array of objects.
Example: [{"flag": "3 cancellations in 2 weeks", "severity": "medium", "evidence": ["Oct 5: Cancelled", "Oct 12: Cancelled", "Oct 19: Cancelled"]}]
```

---

### Appendix D: Contact Details Page Wireframe (ASCII). NEED TO EDIT THIS; I MADE THE CHANGES I WANT IN THE DIAGRAM; TRANSLATE THAT INTO THE SPECIFICATION

```
STATE 1: AI Insights Expanded (shown for visualization, collapsed by default)
┌────────────────────────────────────────────────────────────────────────────────┐
│ Header: [Photo] Jane Doe | New Client | Stress Relief, Weight Loss, Flexibility│
│                 Dublin 8 | Sentiment Score 8 | Last Session: Oct 10, 2025      │
└────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────. ───┬────────────────────────────. ───────┐
│ Left Column (70%)                      │ Right Column (30%)                  │
│                                        │                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ ┌────────────────────────────────┐  │
│ │ Note 1   │ │ Note 2   │ │ Note 3   │ │ │ AI Insights    [Collapse Icon] │  │
│ │ Oct 10   │ │ Oct 3    │ │ Sep 26   │ │ │────────────────────────────────│  │
│ │ Hot      │ │ Yoga     │ │ Massage  │ │ │ ▼ Risk Flags                   │  │
│ │ Stones   │ │ Class    │ │          │ │ │   🔴 3 cancellations (2 weeks) │  │
│ │          │ │          │ │          │ │ │   ⚠️  Declining attendance     │  │
│ │ Session  │ │ Morning  │ │ Focus on │ │ │                                │  │
│ │ went     │ │ flow,    │ │ neck and │ │ │ ▼ Sentiment Trends             │  │
│ │ well...  │ │ strong   │ │ shoulder │ │ │   🟢 Positive engagement       │  │
│ │          │ │ poses    │ │ tension  │ │ │   📈 Improving adherence       │  │
│ │ [Scroll] │ │ [Scroll] │ │ [Scroll] │ │ │                                │  │
│ │          │ │          │ │          │ │ │ ▼ Suggested Agenda             │  │
│ │          │ │          │ │          │ │ │   • Review breathing goals     │  │
│ │          │ │          │ │          │ │ │   • Address cancellation trend │  │
│ │          │ │          │ │          │ │ │                                │  │
│ └──────────┘ └──────────┘ └──────────┘ │ │ [Internal Scroll if needed]    │  │
│                                        │ └────────────────────────────────┘  │
│                                        │                                     │
│ ┌────────────────────────────────────┐   ┌────────────────────────────────┐  │
│ │ Latest Smart Notes (Timeline)      │   │ Next Steps & Goals             │  │
│ │                                    │   │ ▼ Next Steps (expanded)        │  │
│ │ Oct 10  ●  Hot Stones Massage      │   │   • Practice breathing 3x/week │  │
│ │         🟢 Client reported relief  │   │   • Schedule follow-up session │  │
│ │                                    │   │                                │  │
│ │ Oct 3   ●  Yoga Class              │   │ ► Goals (collapsed)            │  │
│ │         🔵 Maintained routine      │   │                                │  │
│ │                                    │   │                                │  │
│ │ Sep 26  ●  Email received          │   │                                │  │
│ │         🟢 Confirmed next appt     │   │                                │  │
│ │                                    │   │                                │  │
│ │ [Load more...]                     │   │                                │  │
│ └────────────────────────────────────┘   └────────────────────────────────┘  │
└──────────────────────────────────────┴───────────────────────────────────────┘

STATE 2: AI Insights Collapsed (DEFAULT state on page load)
┌──────────────────────────────────────┬────────────────────────────────────── ─┐
│ Left Column (70%)                    │ Right Column (30%)                     │
│                                      │                                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ ┌────────────────────────────────┐   │
│ │ Note 1   │ │ Note 2   │ │ Note 3   │ │ │ ► AI Insights [Expand Icon] 🔵 │   │
│ │ [Same height as above]             │ └──────────────────────────────────┘   │
│ │          │ │          │ │          │ │                                      │
│ │          │ │          │ │          │ │                                      │
│ │          │ │          │ │          │ │                                      │
│ └──────────┘ └──────────┘ └──────────┘ │                                      │
│                                      │                                        │
│ ┌────────────────────────────────────┐ ┌────────────────────────────────────┐ │
│ │ Latest Smart Notes (Timeline)      │ │ Next Steps & Goals                 │ │
│ │ [Timeline aligned on same line]    │ │ [Aligned on same line]             │ │
│ └────────────────────────────────────┘ └────────────────────────────────────┘ │
└──────────────────────────────────────┴────────────────────────────────────────┘

Tabs: [Overview] [All Notes] [Contact Details]
```

---

## 14. Final Notes for Implementation Team

### Key Success Factors

1. **Practitioner-first design**: Every UI decision should reduce friction for busy practitioners
2. **Notes immutability**: AI enriches but never modifies practitioner-authored content
3. **Progressive disclosure**: Show most relevant info first, hide complexity until needed
4. **Performance obsession**: Fast capture and instant feedback are non-negotiable

### Risks & Mitigations

- **Risk**: OpenAI Whisper API downtime → **Mitigation**: Queue audio files for retry, show clear error message
- **Risk**: LLM hallucinations in AI insights → **Mitigation**: Always cite source notes, allow practitioners to dismiss insights
- **Risk**: PII leakage → **Mitigation**: Server-side redaction as mandatory step, never trust client-side detection alone
- **Risk**: User confusion with card-based UI → **Mitigation**: Comprehensive onboarding tour, tooltips on first visit

### Communication Plan

- **Weekly demos**: Show progress to stakeholders every Friday
- **User testing**: Involve 3-5 wellness practitioners at end of each phase for feedback
- **Documentation**: Update Storybook with new components as they're built
- **Retrospectives**: Bi-weekly retros to adjust course based on learnings

---

**Document Status:** Ready for Implementation
**Next Steps:** Begin Phase 1 (Rapid Note Capture) after stakeholder approval
**Questions?** Contact: Product Owner (User) or Engineering Lead (AI Assistant)

---

_END OF PRD_
