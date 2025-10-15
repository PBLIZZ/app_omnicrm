<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# here is a list of every file that touches notes,

📚 Documentation Files (3 files)docs/features/notes-wellness-practitioner-spec.md (34 matches)docs/features/contact-table-notes-tags-enhancement-2025-01-21.md (43 matches)

🗄️ Database \& Schema Files (4 files)src/server/db/schema.ts (9 matches)src/server/db/business-schemas/notes.ts (3 matches)src/server/db/database.types.ts (3 matches)supabase/sql/17_enhanced_contacts_schema.sql (9 matches)

🔌 API Routes (2 files)src/app/api/notes/route.ts (5 matches)src/app/api/notes/[noteId]/route.ts (5 matches)

⚙️ Service Layer (3 files)src/server/services/notes.service.ts (9 matches)src/server/services/contacts.service.ts (17 matches)src/server/services/user-deletion.service.ts (7 matches)

🏗️ Repository Layer (2 files)packages/repo/src/notes.repo.ts (22 matches)packages/repo/src/notes.repo.test.ts (11 matches)

🎨 React Components (6 files)src/app/(authorisedRoute)/contacts/_components/ContactDetailsCard.tsx (9 matches)src/app/(authorisedRoute)/contacts/_components/__tests__/NotesHoverCard.test.tsx (26 matches)src/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NotesMainPane.tsx (17 matches)src/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NotesHoverCard.tsx (11 matches)src/app/onboard/[token]/_components/PreferencesSection.tsx (4 matches)src/app/onboard/[token]/_components/OnboardingForm.tsx (3 matches)

🎣 React Hooks (1 file)src/hooks/use-notes.ts (27 matches)

📝 Type Definitions \& Validation (2 files)src/lib/validation/jsonb.ts (4 matches)src/lib/validation/tests/jsonb.test.ts (7 matches)

🤖 AI Integration (2 files)src/server/ai/contacts/utils/contact-utils.ts (5 matches)src/server/ai/contacts/utils/validation-utils.ts (4 matches)

🔍 Search \& Intelligence (2 files)packages/repo/src/search.repo.ts (10 matches)src/server/jobs/processors/insight.ts (6 matches)

📄 Additional Documentation \& References (docs/roadmap/implementation/00_wellness_platform_master_prd.md (5 matches)
src/app/api/contacts/[contactId]/route.ts (3 matches)

If you're looking to understand or modify the notes implementation, focus on these core files:
src/server/db/schema.ts - Database table definition
packages/repo/src/notes.repo.ts - Repository layer
src/server/services/notes.service.ts - Business logic
src/app/api/notes/route.ts \& src/app/api/notes/[noteId]/route.ts - API endpoints
src/hooks/use-notes.ts - React hook for notes
src/app/(authorisedRoute)/contacts/_components/ContactDetailsCard.tsx - Main UI component

This covers the complete notes ecosystem from database to UI!

Notes Ecosystem: End-to-End Architecture

1. Documentation \& Design
Key specs describing notes workflows, UI/UX priorities, and implementation roadmap.
docs/features/notes-wellness-practitioner-spec.md
docs/features/contact-table-notes-tags-enhancement-2025-01-21.md
2. Data Layer
Database schema, junction tables, integrations for goal/tag linkage, and metadata fields.
Table: notes
Junction: noteGoals
Columns: contentPlain, contentRich (JSONB), tags, pii
Entities, sourceType, hasUnscheduledAction
Related tables: contacts, goals, ai_insights, interactions
3. API Layer
CRUD routes, batch/voice uploads, AI integration endpoints.
Notes: 
GET/POST /api/notes, 
GET/PUT/DELETE /api/notes/[noteId]
Voice: 
POST /api/contacts/[contactId]/voice-notes
AI: /api/notes/[noteId]/process, 
/api/contacts/[contactId]/insights, 
/api/contacts/[contactId]/suggest-tags
4. Service Layer \& Repository
Business logic for notes creation, updates, goal/tag association, and deletion.
Service: 
src/server/services/notes.service.ts
Repo: 
packages/repo/src/notes.repo.ts
5. Frontend Components
Core UI for notes feed, contact details display, editing/creation, hover cards, etc.
Main display: ContactDetailsCard.tsx, NotesMainPane.tsx, NotesHoverCard.tsx
Entry/edit: Rich text editor (TipTap), voice recorder with Whisper API integration, file upload for extraction.
6. React Hooks
Centralized state management and data fetching for notes:
src/hooks/use-notes.ts
7. Validation and Sanitization
Ensures data safety for notes and prevents sensitive data leaks (esp. JSONB fields).
src/lib/validation/jsonb.ts
8. AI \& Advanced Features
Insight extraction, tagging, timeline stitching, recommendation and next-step logic, etc.
AI: src/server/ai/contacts/utils/contact-utils.ts
Timeline: Stitched with interactions, tasks, notes
Smart search/filtering: Tag/goal/date range, sentiment/plan/health searches

Okay , so this is from here on my vision , and previously was all the files that exist and the plans that exist, but I want to give you more context. The notes Section is very important. And The... Research . The Notes Wellness Practitioner is back. MG talks about the Research that was done That that lists all of the features, how they should appear for the user, so I really want to stick to that. M . We've implemented some of the things . And the rest of them are still to be implemented . But I want to make sure that The AI is Eg C atching up with What we're doing. So for instance The Notes interactions will be There needs to be a button They can be placed anywhere on the website, either dashboard , contacts, wherever. that allows the user to quickly capture Note It needs to have a Search Drop down or search filter. for the contact. Type in JOH for John McAv oy. and all the John will come up in her list and she'll click the contact she wants to leave a note for and then she can click on the record note , which is the voice activated capture. It's speech to text So it doesn't have to be voice to voice or understanding anything, it's transcription, literally. I'm fine Okay, so this is from here on my vision, and previously was all the files that exist and the plans that exist, but I want to give you more context. The notes Section is very important. And The... Research. The Notes Wellness Practitioner is back. MG talks about the Research that was done That that lists all of the features, how they should appear for the user, so I really want to stick to that. M. We've implemented some of the things. And the rest of them are still to be implemented. But I want to make sure that The AI is Eg Catching up with What we're doing. So for instance The Notes interactions will be There needs to be a button They can be placed anywhere on the website, either dashboard, contacts, wherever. that allows the user to quickly capture Note It needs to have a Search Drop down or search filter. for the contact. Type in JOH for John McAvoy. and all the John will come up in her list and she'll click the contact she wants to leave a note for and then she can click on the record note, which is the voice activated capture. It's speech to text So it doesn't have to be voice to voice or understanding anything, it's transcription, literally. into I'm fine Okay, so this is from here on my vision, and previously was all the files that exist and the plans that exist, but I want to give you more context. The notes Section is very important. And The... Research. The Notes Wellness Practitioner is back. MG talks about the Research that was done That that lists all of the features, how they should appear for the user, so I really want to stick to that. M. We've implemented some of the things. And the rest of them are still to be implemented. But I want to make sure that The AI is Eg Catching up with What we're doing. So for instance The Notes interactions will be There needs to be a button They can be placed anywhere on the website, either dashboard, contacts, wherever. that allows the user to quickly capture Note It needs to have a Search Drop down or search filter. for the contact. Type in JOH for John McAvoy. and all the John will come up in her list and she'll click the contact she wants to leave a note for and then she can click on the record note, which is the voice activated capture. It's speech to text So it doesn't have to be voice to voice or understanding anything, it's transcription, literally. into the I'm fine Okay, so this is from here on my vision, and previously was all the files that exist and the plans that exist, but I want to give you more context. The notes Section is very important. And The... Research. The Notes Wellness Practitioner is back. MG talks about the Research that was done That that lists all of the features, how they should appear for the user, so I really want to stick to that. M. We've implemented some of the things. And the rest of them are still to be implemented. But I want to make sure that The AI is Eg Catching up with What we're doing. So for instance The Notes interactions will be There needs to be a button They can be placed anywhere on the website, either dashboard, contacts, wherever. that allows the user to quickly capture Note It needs to have a Search Drop down or search filter. for the contact. Type in JOH for John McAvoy. and all the John will come up in her list and she'll click the contact she wants to leave a note for and then she can click on the record note, which is the voice activated capture. It's speech to text So it doesn't have to be voice to voice or understanding anything, it's transcription, literally. into the node I'm fine Okay, so this is from here on my vision, and previously was all the files that exist and the plans that exist, but I want to give you more context. The notes Section is very important. And The... Research. The Notes Wellness Practitioner is back. MG talks about the Research that was done That that lists all of the features, how they should appear for the user, so I really want to stick to that. M. We've implemented some of the things. And the rest of them are still to be implemented. But I want to make sure that The AI is Eg Catching up with What we're doing. So for instance The Notes interactions will be There needs to be a button They can be placed anywhere on the website, either dashboard, contacts, wherever. that allows the user to quickly capture Note It needs to have a Search Drop down or search filter. for the contact. Type in JOH for John McAvoy. and all the John will come up in her list and she'll click the contact she wants to leave a note for and then she can click on the record note, which is the voice activated capture. It's speech to text So it doesn't have to be voice to voice or understanding anything, it's transcription, literally. into the node row I'm fine It is em Secondly , table The contacts table We'll have one column that says C notes. that upon hover The last note record ed or typed will appear in text. Just a last note, a preview. L ange . Em If she wants to See the notion full She needs to access the contact card. and the contact card will be mainly Above the line The Http Okay, so this is from here on my vision, and previously was all the files that exist and the plans that exist, but I want to give you more context. The notes Section is very important. And The... Research. The Notes Wellness Practitioner is back. MG talks about the Research that was done That that lists all of the features, how they should appear for the user, so I really want to stick to that. M. We've implemented some of the things. And the rest of them are still to be implemented. But I want to make sure that The AI is Eg Catching up with What we're doing. So for instance The Notes interactions will be There needs to be a button They can be placed anywhere on the website, either dashboard, contacts, wherever. that allows the user to quickly capture Note It needs to have a Search Drop down or search filter. for the contact. Type in JOH for John McAvoy. and all the John will come up in her list and she'll click the contact she wants to leave a note for and then she can click on the record note, which is the voice activated capture. It's speech to text So it doesn't have to be voice to voice or understanding anything, it's transcription, literally. into the node row I'm fine It is em Secondly, table The contacts table We'll have one column that says C notes. that upon hover The last note recorded or typed will appear in text. Just a last note, a preview. Lange. Em If she wants to See the notion full She needs to access the contact card. and the contact card will be mainly Above the line The The notes, the timeline, Http Okay, so this is from here on my vision, and previously was all the files that exist and the plans that exist, but I want to give you more context. The notes Section is very important. And The... Research. The Notes Wellness Practitioner is back. MG talks about the Research that was done That that lists all of the features, how they should appear for the user, so I really want to stick to that. M. We've implemented some of the things. And the rest of them are still to be implemented. But I want to make sure that The AI is Eg Catching up with What we're doing. So for instance The Notes interactions will be There needs to be a button They can be placed anywhere on the website, either dashboard, contacts, wherever. that allows the user to quickly capture Note It needs to have a Search Drop down or search filter. for the contact. Type in JOH for John McAvoy. and all the John will come up in her list and she'll click the contact she wants to leave a note for and then she can click on the record note, which is the voice activated capture. It's speech to text So it doesn't have to be voice to voice or understanding anything, it's transcription, literally. into the node row I'm fine It is em Secondly, table The contacts table We'll have one column that says C notes. that upon hover The last note recorded or typed will appear in text. Just a last note, a preview. Lange. Em If she wants to See the notion full She needs to access the contact card. and the contact card will be mainly Above the line The The notes, the timeline, the AI insights Http And when I say timeline, I'm talking about The stitched together timeline T ash can be created. As a result of The Interactions And notes . put together This table doesn't exist yet so forget about that . Once she's in the contact card. Ehm Basically , she wants to see everything in one place . It says this in the research. She's going to see everything that she needs to see. And so we need to make sure that the notes section is front and center. And that it's Int uitive and easy . It doesn't get in the way, but also it allows her to quickly scan all of the notes that exist for that client. and record a new note when she wants to, typing or by voice. She should be able to copy in Text And the Text editor is rich text editor The notes that the user takes the time to format and use colors and shading and headings, this needs to be saved so that when she looks at her notes scrolling through them , They have that Formatting Because I think at the moment S aves the note. It disappears into plain text and never to be seen again in rich text format. You can also and look for more research how users need to have their contact card organized. But I think it'll Back up what I said about the notes front and center . Aside Part four of the AI insights , which are only derived from the table AI insights. The LLM process is background and it updates the AI insights table from the processes that it does, and from the AI insights table the AI insights For the notes is. Pop ulated.

Based on the comprehensive documentation and your vision for the notes system, I can see you have a well-researched foundation and clear requirements. Let me analyze the current state and create a detailed implementation plan aligned with your priorities.

# Notes System Implementation Analysis \& Roadmap

## Current State Assessment

Your wellness practitioner research clearly identifies notes as the **primary workflow driver** for healthcare professionals. The documentation shows you have solid foundations in place:

**✅ Already Implemented:**

- Notes table with `contentPlain`, `contentRich` (JSONB), PII redaction
- TipTap rich text editor with SSR-safe rendering
- API routes (`GET/POST /api/notes`, `GET/PUT/DELETE /api/notes/[noteId]`)
- Server-side PII detection and client-side warnings
- Basic CRUD operations and repository layer

**🔄 Partially Implemented:**

- Contact card notes display (exists but needs refinement)
- Rich text formatting (saves but may lose formatting on display)


## Critical Gap: Quick Capture Button System

Your vision for a **global quick capture button** is spot-on but appears missing from the current implementation. This is the highest-impact feature for practitioner adoption.

## Implementation Priority Roadmap

### **Phase 1: Global Quick Capture System (Highest Impact)**

**1.1 Universal Notes Button Component**

```typescript
// src/components/global/QuickNoteCapture.tsx
interface QuickNoteCaptureProps {
  position?: 'floating' | 'inline' | 'header'
  className?: string
}

export function QuickNoteCapture({ position = 'floating' }: QuickNoteCaptureProps) {
  // Contact search dropdown
  // Voice recording capability  
  // Direct save to selected contact
}
```

**Key Features:**

- **Contact Search**: Type "JOH" → shows "John McAvoy" and other matches
- **Voice Recording**: Click record → speech-to-text via OpenAI Whisper
- **Global Placement**: Available on dashboard, contacts table, anywhere
- **Zero Friction**: 3 clicks maximum (search contact → record → save)

**1.2 Contact Search Integration**

```typescript
// Enhanced contact search with fuzzy matching
const useContactSearch = (query: string) => {
  // Search by name, email, phone
  // Prioritize recent interactions
  // Show contact context (last session, etc.)
}
```


### **Phase 2: Rich Text Preservation (Critical UX)**

**2.1 Fix Rich Text Display Pipeline**
The documentation indicates rich text formatting may be lost during save/display. Priority fixes:

```typescript
// Ensure contentRich (JSONB) preserves:
- Text colors and highlighting
- Headings (H1-H6) 
- Bold, italic, formatting
- Bullet points and lists
- Custom wellness practitioner blocks
```

**2.2 Contact Table Notes Column Enhancement**

```typescript
// Replace notes count with actual preview
interface NotesColumnProps {
  lastNotePreview: string // 2-line clamp, ~100 chars
  hoverCard: {
    fullPreview: string // 6-10 lines
    quickActions: ['Add Note', 'Record Note', 'Open Notes']
  }
}
```


### **Phase 3: Contact Card Notes-First Layout**

**3.1 Notes Front and Center**
Based on your research: *"she wants to see everything in one place"* and *"notes section is front and center"*

```typescript
// Contact card layout priority:
1. Latest Note Excerpt (always visible, 300-500 chars)
2. Quick Actions (Type, Voice, Upload) 
3. Notes History (reverse-chronological, grouped by date)
4. AI Insights (secondary sidebar, collapsed by default)
```

**3.2 Notes History with Preserved Formatting**

```typescript
// Features needed:
- Reverse-chronological display (newest first)
- Date separators (sticky headers)
- Rich text rendering with original formatting
- Infinite scroll for long histories
- Search and filter capabilities
```


### **Phase 4: Voice Integration Excellence**

**4.1 OpenAI Whisper Integration**

```typescript
// src/server/services/transcription.service.ts
export async function transcribeAudio(audioBlob: Blob): Promise<{
  text: string
  confidence: number
  language?: string
}> {
  // POST to https://api.openai.com/v1/audio/transcriptions
  // Model: whisper-1
  // Return sanitized transcript
}
```

**4.2 Voice UX Flow**

1. **Permission Handling**: Microphone access with fallback
2. **Recording States**: Visual indicator, timer, waveform
3. **Transcription**: Loading state, error handling
4. **Review \& Edit**: Allow editing before save
5. **Auto-Save**: Direct to contact notes with PII scanning

## Recommended Implementation Sequence

**Week 1: Quick Capture Foundation**

- Global QuickNoteCapture component
- Contact search with fuzzy matching
- Basic voice recording setup

**Week 2: Rich Text \& Display**

- Fix contentRich preservation pipeline
- Enhanced contact table notes column
- Notes hover cards with formatting

**Week 3: Contact Card Redesign**

- Notes-first layout implementation
- History view with date grouping
- Full-screen notes sheet

**Week 4: Voice \& Polish**

- OpenAI Whisper integration
- Advanced voice UX features
- Performance optimization


## Technical Architecture Decisions

**1. Preserve Existing Schema**
Your current notes table structure is solid. Continue using:

- `contentPlain` for search and PII scanning
- `contentRich` for formatted display
- Existing PII redaction pipeline

**2. Component Strategy**

```typescript
// Core components needed:
- QuickNoteCapture (global)
- ContactSearch (reusable)  
- VoiceRecorder (with Whisper)
- RichNoteDisplay (formatting preservation)
- NotesTimeline (contact card)
```

**3. State Management**

- Continue with React Query for notes data
- Optimistic updates for quick captures
- Real-time sync between components

The research you referenced is excellent - it clearly shows practitioners need **fast capture** and **notes front-and-center**. The global quick capture button will be transformational for user adoption, and fixing the rich text preservation will ensure their careful formatting work isn't lost.

Would you like me to dive deeper into any specific phase or create detailed technical specifications for the quick capture system?
<span style="display:none">[^1]</span>

<div align="center">⁂</div>

[^1]: combined_docs.txt

