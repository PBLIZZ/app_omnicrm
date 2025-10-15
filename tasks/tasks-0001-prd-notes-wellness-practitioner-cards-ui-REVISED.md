# Task List: Smart Notes System for Wellness Practitioners (TDD Approach)

**Based on PRD:** `0001-prd-notes-wellness-practitioner-cards-ui.md`
**Created:** October 14, 2025
**Status:** Phase 2 - Sub-tasks Generated with Integrated Testing
**Approach:** Test-Driven Development - Tests written alongside implementation

---

## Relevant Files

### New Components (To Be Created)

- `src/components/notes/RapidNoteModal.tsx` - Full-screen modal for rapid note capture (implementation pending)
- ✅ `src/components/notes/__tests__/RapidNoteModal.test.tsx` - Comprehensive unit tests for RapidNoteModal (17 tests covering full-screen layout, input bar, contact selector, character limit, save button)
- ✅ `src/components/notes/VoiceRecorder.tsx` - Voice recording component with MediaRecorder API integration, waveform visualization, and 3-minute timer
- ✅ `src/components/notes/__tests__/VoiceRecorder.test.tsx` - Unit tests for VoiceRecorder covering rendering, MediaRecorder API, timer, and waveform
- `src/components/notes/LatestNotesCards.tsx` + `LatestNotesCards.test.tsx`
- `src/components/notes/AITimelineCard.tsx` + `AITimelineCard.test.tsx`
- `src/components/notes/NextStepsGoalsCard.tsx` + `NextStepsGoalsCard.test.tsx`
- `src/components/notes/AIInsightsCard.tsx` + `AIInsightsCard.test.tsx`
- `src/components/notes/ContactDetailsHeader.tsx` + `ContactDetailsHeader.test.tsx`
- `src/components/notes/NoteTagPicker.tsx` + `NoteTagPicker.test.tsx`

### New API Routes (To Be Created)

- `src/app/api/notes/transcribe/route.ts` + `route.test.ts`
- `src/app/api/notes/rapid-capture/route.ts` + `route.test.ts`
- `src/app/api/ai-insights/[contactId]/route.ts` + `route.test.ts`
- `src/app/api/contacts/[contactId]/timeline/route.ts` + `route.test.ts`

### New Services (To Be Created)

- `src/server/services/transcription.service.ts` + `transcription.service.test.ts`
- `src/server/services/ai-insights.service.ts` + `ai-insights.service.test.ts`
- `src/server/services/timeline.service.ts` + `timeline.service.test.ts`

### New Background Jobs (To Be Created)

- `src/server/jobs/processors/ai-insight-timeline.processor.ts` + `.test.ts`
- `src/server/jobs/processors/ai-insight-sentiment.processor.ts` + `.test.ts`
- `src/server/jobs/processors/ai-insight-next-steps.processor.ts` + `.test.ts`
- `src/server/jobs/processors/ai-insight-risk-flags.processor.ts` + `.test.ts`
- `src/server/jobs/processors/ai-insight-agenda.processor.ts` + `.test.ts`

### E2E Tests (To Be Created)

- `tests/e2e/notes-rapid-capture.spec.ts`
- `tests/e2e/notes-cards-ui.spec.ts`
- `tests/e2e/notes-timeline.spec.ts`

### Existing Files to Update

- `src/server/db/business-schemas/notes.ts` - Add schemas for rapid capture and transcription
- `src/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NoteEditor.tsx` - Add tag picker and goal linking
- `src/lib/constants/wellness-tags.ts` - Create wellness tag taxonomy constants (new file)
- `src/hooks/use-notes.ts` - Add hooks for rapid capture and timeline queries

### Notes

- **TDD Approach**: Write tests alongside (or before) implementation code
- Unit tests should be placed alongside the code files they are testing
- Use `pnpm test` to run all tests
- Use `pnpm test:e2e` to run Playwright E2E tests
- Each implementation sub-task now has corresponding test sub-tasks

---

## Tasks

- [ ] 1.0 Implement Rapid Note Capture Modal
  - [x] 1.1 Create VoiceRecorder component with waveform visualization
    - [x] 1.1.1 Write unit test: VoiceRecorder renders with microphone button
    - [x] 1.1.2 Write unit test: Mock MediaRecorder API and test initialization
    - [x] 1.1.3 Implement: Set up MediaRecorder API integration with browser audio capture
    - [x] 1.1.4 Write unit test: Waveform canvas element renders during recording
    - [x] 1.1.5 Implement: Waveform visualization using canvas or audio visualization library
    - [x] 1.1.6 Write unit test: 3-minute timer counts down correctly and auto-stops
    - [x] 1.1.7 Implement: Add 3-minute timer with visual countdown indicator
    - [x] 1.1.8 Write unit test: Recording controls (start, pause, finish) trigger correct states
    - [x] 1.1.9 Implement: Create recording controls (start, pause, finish with checkmark button)
    - [x] 1.1.10 Write unit test: Microphone permissions denied shows error state
    - [x] 1.1.11 Implement: Handle microphone permissions and error states
    - [x] 1.1.12 Write unit test: Finished recording returns audio blob in webm format
    - [x] 1.1.13 Implement: Export audio blob in webm format for transcription
  - [ ] 1.2 Build RapidNoteModal component with full-screen layout
    - [x] 1.2.1 Write unit test: Modal renders full-screen with dimmed background
    - [ ] 1.2.2 Implement: Create full-screen modal using shadcn Dialog component
    - [x] 1.2.3 Write unit test: Modal blocks background interactions when open
    - [ ] 1.2.4 Implement: Add dimmed background overlay that blocks app interaction
    - [x] 1.2.5 Write unit test: Input bar renders with text area and mic icon
    - [ ] 1.2.6 Implement: Implement input bar with text area and mic icon
    - [x] 1.2.7 Write unit test: Contact selector dropdown populates with contacts
    - [x] 1.2.8 Write unit test: Last-viewed contact pre-selected in dropdown
    - [ ] 1.2.9 Implement: Add contact selector dropdown (with last-viewed-contact default)
    - [x] 1.2.10 Write unit test: Inline editing area supports cursor positioning
    - [ ] 1.2.11 Implement: Create inline editing area with cursor positioning support
    - [x] 1.2.12 Write unit test: Character limit enforced at 1200 chars with visual indicator
    - [ ] 1.2.13 Implement: Implement 1200 character limit with visual indicator
    - [x] 1.2.14 Write unit test: Save button shows loading state during API call
    - [ ] 1.2.15 Implement: Add "Save" button with loading state
    - [x] 1.2.16 Write unit test: Helper text displays correctly
    - [ ] 1.2.17 Implement: Display helper text: "For advanced editing, visit Contact Details"
  - [ ] 1.3 Implement auto-save draft functionality
    - [ ] 1.3.1 Write unit test: Draft saves to localStorage every 5 seconds
    - [ ] 1.3.2 Implement: Set up localStorage hook for draft persistence
    - [ ] 1.3.3 Implement: Auto-save draft every 5 seconds while typing
    - [ ] 1.3.4 Write unit test: Draft restored on modal reopen with unsaved content
    - [ ] 1.3.5 Implement: Restore draft on modal reopen if unsaved content exists
    - [ ] 1.3.6 Write unit test: Draft cleared after successful save
    - [ ] 1.3.7 Implement: Clear draft after successful save
    - [ ] 1.3.8 Write unit test: "Restore draft" prompt shows when draft exists
    - [ ] 1.3.9 Implement: Add "Restore draft" prompt on modal open if draft exists
  - [ ] 1.4 Add global header button for rapid note access
    - [ ] 1.4.1 Write unit test: Lightning bolt icon button renders in header
    - [ ] 1.4.2 Implement: Create lightning bolt icon button in header component
    - [ ] 1.4.3 Write unit test: Tooltip "Rapid Note" shows on hover
    - [ ] 1.4.4 Implement: Add "Rapid Note" tooltip on hover
    - [ ] 1.4.5 Write unit test: Keyboard shortcut (Cmd+Shift+N) opens modal
    - [ ] 1.4.6 Implement: Implement keyboard shortcut (Cmd+Shift+N / Ctrl+Shift+N)
    - [ ] 1.4.7 Write unit test: Button click opens RapidNoteModal
    - [ ] 1.4.8 Implement: Wire button click to open RapidNoteModal
  - [ ] 1.5 Create transcription service integration
    - [ ] 1.5.1 Write unit test: Transcription service sends correct multipart/form-data
    - [ ] 1.5.2 Write unit test: Mock OpenAI Whisper API and test successful transcription
    - [ ] 1.5.3 Implement: Set up OpenAI Whisper API client configuration
    - [ ] 1.5.4 Implement: Create transcription service function (accepts audio blob, returns text)
    - [ ] 1.5.5 Implement: Implement multipart/form-data upload with audio file
    - [ ] 1.5.6 Write unit test: Retry logic triggers on network failure with exponential backoff
    - [ ] 1.5.7 Implement: Add retry logic with exponential backoff for network failures
    - [ ] 1.5.8 Write unit test: Invalid audio format returns proper error message
    - [ ] 1.5.9 Write unit test: API unavailable scenario handled gracefully
    - [ ] 1.5.10 Implement: Handle error states (API unavailable, invalid audio format)
    - [ ] 1.5.11 Write unit test: Progress indicator displays during transcription
    - [ ] 1.5.12 Implement: Display transcription progress indicator in modal
  - [ ] 1.6 Integrate PII redaction for rapid notes
    - [ ] 1.6.1 Write unit test: PII detection function identifies emails, phones, SSNs
    - [ ] 1.6.2 Implement: Reuse existing PII detection function from notes.service.ts
    - [ ] 1.6.3 Write unit test: PII detection runs before sending to server
    - [ ] 1.6.4 Implement: Run PII detection on save before sending to server
    - [ ] 1.6.5 Write unit test: Amber warning banner shows when PII detected client-side
    - [ ] 1.6.6 Implement: Display amber warning banner if PII detected client-side
    - [ ] 1.6.7 Write unit test: Red toast shows after server-side redaction
    - [ ] 1.6.8 Implement: Show red toast notification after server-side redaction
  - [ ] 1.7 Implement toast notifications for save confirmation
    - [ ] 1.7.1 Write unit test: Green "Note saved" toast shows on successful save
    - [ ] 1.7.2 Implement: Show green "Note saved" toast on successful save (3s duration)
    - [ ] 1.7.3 Write unit test: Red "PII detected" toast shows when applicable
    - [ ] 1.7.4 Implement: Show red "PII detected and redacted" toast if applicable (5s duration)
    - [ ] 1.7.5 Write unit test: Error toast with retry option shows on save failure
    - [ ] 1.7.6 Implement: Show error toast if save fails with retry option
  - [ ] 1.8 Write E2E tests for Rapid Note Capture
    - [ ] 1.8.1 E2E test: Open modal → Type note → Save → Verify toast
    - [ ] 1.8.2 E2E test: Open modal → Record voice → Save → Verify transcription
    - [ ] 1.8.3 E2E test: Close modal without saving → Reopen → Restore draft
    - [ ] 1.8.4 E2E test: Complete capture → View in contact details → Verify display
    - [ ] 1.8.5 E2E test: Test mobile responsive behavior

- [ ] 2.0 Build Contact Details Page Cards UI
  - [ ] 2.1 Create LatestNotesCards component (3-card horizontal layout)
    - [ ] 2.1.1 Write unit test: Component renders 3 cards in horizontal grid
    - [ ] 2.1.2 Write unit test: Cards stack vertically on mobile viewport
    - [ ] 2.1.3 Implement: Set up responsive grid layout (3 columns desktop, stack mobile)
    - [ ] 2.1.4 Write unit test: NoteCard has fixed ~300px height
    - [ ] 2.1.5 Implement: Create individual NoteCard component with fixed ~300px height
    - [ ] 2.1.6 Write unit test: Card header displays session type and session date (not note creation date)
    - [ ] 2.1.7 Implement: Add card header: Session type + date (from session, not note creation)
    - [ ] 2.1.8 Write unit test: Card body content is scrollable with hidden scrollbar
    - [ ] 2.1.9 Implement: Implement scrollable body with hidden scrollbar (overflow-y-auto scrollbar-hide)
    - [ ] 2.1.10 Write unit test: Card footer renders tag chips when tags exist
    - [ ] 2.1.11 Implement: Add footer with tag chips if tags exist
    - [ ] 2.1.12 Write unit test: Hover state applies shadow elevation
    - [ ] 2.1.13 Implement: Implement hover state with shadow elevation
    - [ ] 2.1.14 Write unit test: "View Full Note" link routes to correct URL
    - [ ] 2.1.15 Implement: Add "View Full Note" link routing to `/contacts/[contactId]/notes/[noteId]`
    - [ ] 2.1.16 Write unit test: API query fetches only latest 3 notes
    - [ ] 2.1.17 Implement: Fetch only latest 3 notes via API query optimization
  - [ ] 2.2 Build AITimelineCard component with vertical timeline
    - [ ] 2.2.1 Write unit test: Vertical timeline renders with circular nodes
    - [ ] 2.2.2 Implement: Create vertical timeline layout with circular nodes
    - [ ] 2.2.3 Write unit test: Date displays on left side with correct styling
    - [ ] 2.2.4 Implement: Implement date display on left side (muted gray, small font)
    - [ ] 2.2.5 Write unit test: Event type displays on right side
    - [ ] 2.2.6 Implement: Add event type on right side (e.g., "Hot Stones Massage", "Email received")
    - [ ] 2.2.7 Write unit test: AI-generated summary displays as main text (100-250 chars)
    - [ ] 2.2.8 Implement: Display AI-generated summary as main text (100-250 chars)
    - [ ] 2.2.9 Write unit test: Sentiment indicators render with correct colors
    - [ ] 2.2.10 Implement: Add sentiment indicator circles (🔴 red, 🔵 blue, 🟢 green)
    - [ ] 2.2.11 Write unit test: Intersection observer triggers load more events
    - [ ] 2.2.12 Implement: Implement infinite scroll with intersection observer (load 20 events at a time)
    - [ ] 2.2.13 Write unit test: Scrollbar is hidden
    - [ ] 2.2.14 Implement: Hide scrollbar (overflow-y-auto scrollbar-hide)
    - [ ] 2.2.15 Write unit test: Mobile responsive - dates hidden, only circles + text
    - [ ] 2.2.16 Implement: Add responsive behavior: hide dates on mobile, show only circles + text
  - [ ] 2.3 Create NextStepsGoalsCard with collapsible sections
    - [ ] 2.3.1 Write unit test: Card renders with two collapsible sections
    - [ ] 2.3.2 Implement: Set up card container with two collapsible sections
    - [ ] 2.3.3 Write unit test: "Next Steps" section expanded by default
    - [ ] 2.3.4 Implement: Build "Next Steps" section (expanded by default)
    - [ ] 2.3.5 Write unit test: Next steps fetched from ai_insights table
    - [ ] 2.3.6 Implement: Fetch next steps from ai_insights table (kind = 'next_steps')
    - [ ] 2.3.7 Write unit test: Action items display as bulleted list
    - [ ] 2.3.8 Implement: Display action items as bulleted list
    - [ ] 2.3.9 Write unit test: "Goals" section collapsed by default
    - [ ] 2.3.10 Implement: Build "Goals" section (collapsed by default)
    - [ ] 2.3.11 Write unit test: Active goals queried correctly (status != 'abandoned')
    - [ ] 2.3.12 Implement: Query goals table for active goals (status != 'abandoned')
    - [ ] 2.3.13 Write unit test: Goal displays with progress bar when measurable
    - [ ] 2.3.14 Implement: Display goal name + progress bar if measurable
    - [ ] 2.3.15 Write unit test: Expand/collapse animation is smooth
    - [ ] 2.3.16 Implement: Implement expand/collapse interaction with smooth animation
  - [ ] 2.4 Build AIInsightsCard (collapsible, top of right column)
    - [ ] 2.4.1 Write unit test: Collapsed state shows small header with expand icon
    - [ ] 2.4.2 Implement: Create collapsed state: small header with expand icon and pulsating indicator
    - [ ] 2.4.3 Write unit test: Pulsating animation renders on trigger icon
    - [ ] 2.4.4 Implement: Implement pulsating animation for trigger icon (subtle glow effect)
    - [ ] 2.4.5 Write unit test: Expanded state matches height of 3 notes cards (~300px)
    - [ ] 2.4.6 Implement: Create expanded state: fixed height matching 3 notes cards (~300px)
    - [ ] 2.4.7 Write unit test: Three sections render: Risk Flags, Sentiment Trends, Suggested Agenda
    - [ ] 2.4.8 Implement: Add three sections: Risk Flags, Sentiment Trends, Suggested Agenda
    - [ ] 2.4.9 Write unit test: Last 6 insights fetched from ai_insights table
    - [ ] 2.4.10 Implement: Fetch last 6 insights from ai_insights table for contact
    - [ ] 2.4.11 Write unit test: Internal scrolling works when content exceeds height
    - [ ] 2.4.12 Implement: Implement internal scrolling if content exceeds card height
    - [ ] 2.4.13 Write unit test: Collapse button minimizes card to small header
    - [ ] 2.4.14 Implement: Add collapse button to minimize back to small header
    - [ ] 2.4.15 Write unit test: User preference persisted in localStorage
    - [ ] 2.4.16 Implement: Persist user preference (collapsed/expanded) in localStorage
    - [ ] 2.4.17 Write unit test: Expand/collapse animation is smooth
    - [ ] 2.4.18 Implement: Implement smooth expand/collapse animation
  - [ ] 2.5 Update ContactDetailsHeader component
    - [ ] 2.5.1 Write unit test: Contact photo displays with fallback avatar
    - [ ] 2.5.2 Implement: Add contact photo display with fallback avatar
    - [ ] 2.5.3 Write unit test: Name, lifecycle stage, and top 3 tags display as chips
    - [ ] 2.5.4 Implement: Display name, lifecycle stage, and top 3 tags as chips
    - [ ] 2.5.5 Write unit test: Quick stats display correctly (last session, next session, sentiment)
    - [ ] 2.5.6 Implement: Add quick stats: Last session date, Next session date, Sentiment score
    - [ ] 2.5.7 Write unit test: Component responsive on mobile viewport
    - [ ] 2.5.8 Implement: Implement responsive layout for mobile
  - [ ] 2.6 Implement two-column responsive layout
    - [ ] 2.6.1 Write unit test: Desktop layout shows 70/30 column split
    - [ ] 2.6.2 Implement: Set up 70/30 column split for desktop (min-width: 1024px)
    - [ ] 2.6.3 Write unit test: Mobile layout stacks cards vertically
    - [ ] 2.6.4 Implement: Stack cards vertically for mobile (max-width: 640px)
    - [ ] 2.6.5 Write unit test: NextStepsGoals aligns with Timeline when AI Insights collapsed
    - [ ] 2.6.6 Implement: Implement dynamic repositioning: NextStepsGoals aligns with Timeline when AI Insights collapsed
    - [ ] 2.6.7 Write unit test: Tablet layout shows single column with AI sidebar overlay
    - [ ] 2.6.8 Implement: Handle tablet layout (768px - 1024px): single column with AI sidebar overlay
  - [ ] 2.7 Write E2E tests for Cards UI
    - [ ] 2.7.1 E2E test: Navigate to contact details → Verify 3 cards display
    - [ ] 2.7.2 E2E test: Click "View Full Note" → Verify navigation
    - [ ] 2.7.3 E2E test: Scroll timeline → Verify infinite scroll loads more
    - [ ] 2.7.4 E2E test: Expand/collapse AI Insights → Verify animation
    - [ ] 2.7.5 E2E test: Mobile viewport → Verify single column stack

- [ ] 3.0 Create API Endpoints for Notes and Timeline
  - [ ] 3.1 Build POST /api/notes/transcribe endpoint
    - [ ] 3.1.1 Write integration test: Endpoint returns 401 without authentication
    - [ ] 3.1.2 Write integration test: Endpoint accepts multipart/form-data audio file
    - [ ] 3.1.3 Implement: Create route handler at `src/app/api/notes/transcribe/route.ts`
    - [ ] 3.1.4 Write integration test: Business schema validates audioBlob and contactId
    - [ ] 3.1.5 Implement: Add business schema for transcription request (audioBlob, contactId)
    - [ ] 3.1.6 Implement: Implement authentication check using handleAuth wrapper
    - [ ] 3.1.7 Write integration test: Multipart/form-data parsed correctly
    - [ ] 3.1.8 Implement: Parse multipart/form-data audio upload
    - [ ] 3.1.9 Write integration test: Transcription service called with correct params
    - [ ] 3.1.10 Implement: Call transcription service (OpenAI Whisper API)
    - [ ] 3.1.11 Write integration test: Response contains transcribed text + duration
    - [ ] 3.1.12 Implement: Return transcribed text + duration in response
    - [ ] 3.1.13 Write integration test: Invalid audio format returns 400 error
    - [ ] 3.1.14 Implement: Add error handling for API failures and invalid audio formats
    - [ ] 3.1.15 Write integration test: Rate limiting returns 429 after threshold
    - [ ] 3.1.16 Implement: Implement rate limiting (max 10 transcriptions per minute per user)
  - [ ] 3.2 Build POST /api/notes/rapid-capture endpoint
    - [ ] 3.2.1 Write integration test: Endpoint returns 401 without authentication
    - [ ] 3.2.2 Write integration test: Business schema validates required fields
    - [ ] 3.2.3 Implement: Create route handler at `src/app/api/notes/rapid-capture/route.ts`
    - [ ] 3.2.4 Implement: Add business schema: RapidCaptureBodySchema (contactId, contentPlain, sourceType)
    - [ ] 3.2.5 Implement: Implement authentication using handleAuth
    - [ ] 3.2.6 Write integration test: Invalid contactId returns 404
    - [ ] 3.2.7 Implement: Validate contactId exists and belongs to user
    - [ ] 3.2.8 Write integration test: PII redaction runs before save
    - [ ] 3.2.9 Implement: Run PII redaction via notes service
    - [ ] 3.2.10 Write integration test: Note saved with correct sourceType
    - [ ] 3.2.11 Implement: Save note to database with sourceType ('typed' | 'voice')
    - [ ] 3.2.12 Write integration test: Response includes redactionWarning boolean
    - [ ] 3.2.13 Implement: Return saved note + redactionWarning boolean
    - [ ] 3.2.14 Write integration test: AI insights job enqueued after save
    - [ ] 3.2.15 Implement: Enqueue background job for AI insights generation
  - [ ] 3.3 Build GET /api/contacts/[contactId]/timeline endpoint
    - [ ] 3.3.1 Write integration test: Endpoint returns 401 without authentication
    - [ ] 3.3.2 Write integration test: Query schema validates limit and offset
    - [ ] 3.3.3 Implement: Create route handler at `src/app/api/contacts/[contactId]/timeline/route.ts`
    - [ ] 3.3.4 Implement: Add query schema: TimelineQuerySchema (limit, offset)
    - [ ] 3.3.5 Implement: Implement authentication using handleGetWithQueryAuth
    - [ ] 3.3.6 Write integration test: Timeline service merges notes + interactions + emails
    - [ ] 3.3.7 Implement: Call timeline service to merge notes + interactions + emails
    - [ ] 3.3.8 Write integration test: AI summaries fetched from ai_insights table
    - [ ] 3.3.9 Implement: Fetch AI-generated summaries from ai_insights table
    - [ ] 3.3.10 Write integration test: Sentiment indicators applied to events
    - [ ] 3.3.11 Implement: Apply sentiment indicators to each timeline event
    - [ ] 3.3.12 Write integration test: Pagination works with limit/offset
    - [ ] 3.3.13 Implement: Implement pagination with limit/offset
    - [ ] 3.3.14 Write integration test: Response has correct shape { events, hasMore }
    - [ ] 3.3.15 Implement: Return { events: TimelineEvent[], hasMore: boolean }
  - [ ] 3.4 Build GET /api/ai-insights/[contactId] endpoint
    - [ ] 3.4.1 Write integration test: Endpoint returns 401 without authentication
    - [ ] 3.4.2 Write integration test: Query schema validates limit and types array
    - [ ] 3.4.3 Implement: Create route handler at `src/app/api/ai-insights/[contactId]/route.ts`
    - [ ] 3.4.4 Implement: Add query schema: AIInsightsQuerySchema (limit, types[])
    - [ ] 3.4.5 Implement: Implement authentication check
    - [ ] 3.4.6 Write integration test: Query filters by contactId and kind types
    - [ ] 3.4.7 Implement: Query ai_insights table filtered by contactId and kind types
    - [ ] 3.4.8 Write integration test: Results ordered by createdAt DESC
    - [ ] 3.4.9 Implement: Return last N insights ordered by createdAt DESC
    - [ ] 3.4.10 Write integration test: Caching headers set correctly (5 minutes)
    - [ ] 3.4.11 Implement: Add caching headers (cache for 5 minutes)
  - [ ] 3.5 Update existing POST /api/notes endpoint
    - [ ] 3.5.1 Write integration test: linkedSessionId field accepted in request
    - [ ] 3.5.2 Implement: Add support for linkedSessionId field in request body
    - [ ] 3.5.3 Write integration test: tags array field accepted in request
    - [ ] 3.5.4 Implement: Add support for tags array field
    - [ ] 3.5.5 Write integration test: goalIds array field accepted in request
    - [ ] 3.5.6 Implement: Add support for goalIds array field
    - [ ] 3.5.7 Write integration test: note_goals junction table updated on save
    - [ ] 3.5.8 Implement: Update note creation to insert into note_goals junction table
    - [ ] 3.5.9 Write integration test: AI insights job enqueued after save
    - [ ] 3.5.10 Implement: Enqueue AI insights background job after save
  - [ ] 3.6 Update existing PUT /api/notes/[noteId] endpoint
    - [ ] 3.6.1 Write integration test: Tags array can be updated
    - [ ] 3.6.2 Implement: Allow updating tags array
    - [ ] 3.6.3 Write integration test: goalIds upserted in note_goals junction
    - [ ] 3.6.4 Implement: Allow updating goalIds (upsert note_goals junction table)
    - [ ] 3.6.5 Write integration test: linkedSessionId can be updated
    - [ ] 3.6.6 Implement: Allow updating linkedSessionId
    - [ ] 3.6.7 Write integration test: AI insights job re-enqueued on content change
    - [ ] 3.6.8 Implement: Re-enqueue AI insights job on significant content changes

- [ ] 4.0 Implement AI Insights Background Jobs
  - [ ] 4.1 Create timeline summary generation job
    - [ ] 4.1.1 Write unit test: Job handler queries notes + interactions correctly
    - [ ] 4.1.2 Implement: Create processor at `src/server/jobs/processors/ai-insight-timeline.processor.ts`
    - [ ] 4.1.3 Implement: Implement job handler to query notes + interactions for contact
    - [ ] 4.1.4 Write unit test: LLM prompt template generates correct format
    - [ ] 4.1.5 Implement: Build LLM prompt template for timeline summarization (100-250 chars)
    - [ ] 4.1.6 Write unit test: Mock OpenRouter API and test successful LLM call
    - [ ] 4.1.7 Implement: Call OpenRouter API with prompt (use free model like DeepSeek)
    - [ ] 4.1.8 Write unit test: LLM response parsed correctly
    - [ ] 4.1.9 Implement: Parse LLM response and extract summary text
    - [ ] 4.1.10 Write unit test: Fingerprint hash computed correctly (SHA256)
    - [ ] 4.1.11 Implement: Compute fingerprint hash for deduplication (SHA256 of input data)
    - [ ] 4.1.12 Write unit test: Deduplication check skips if fingerprint exists (< 24 hours)
    - [ ] 4.1.13 Implement: Check if insight already exists with same fingerprint (< 24 hours old)
    - [ ] 4.1.14 Write unit test: Timeline summary written to ai_insights table
    - [ ] 4.1.15 Implement: Write timeline summary to ai_insights table (kind = 'timeline_summary')
    - [ ] 4.1.16 Write unit test: Job status updated to 'completed' or 'failed'
    - [ ] 4.1.17 Implement: Update job status to 'completed' or 'failed' with error message
  - [ ] 4.2 Create sentiment analysis job
    - [ ] 4.2.1 Write unit test: Recent notes (last 1-3) and goal progress queried
    - [ ] 4.2.2 Implement: Create processor at `src/server/jobs/processors/ai-insight-sentiment.processor.ts`
    - [ ] 4.2.3 Implement: Query recent notes (last 1-3) and goal progress for contact
    - [ ] 4.2.4 Write unit test: LLM prompt generates correct sentiment classification format
    - [ ] 4.2.5 Implement: Build LLM prompt for sentiment classification (positive/neutral/negative)
    - [ ] 4.2.6 Write unit test: Mock LLM and test sentiment response parsing
    - [ ] 4.2.7 Implement: Call LLM and parse sentiment response
    - [ ] 4.2.8 Write unit test: Sentiment mapped to correct colors (🟢🔵🔴)
    - [ ] 4.2.9 Implement: Map sentiment to color: 🟢 positive, 🔵 neutral, 🔴 negative
    - [ ] 4.2.10 Write unit test: Sentiment written to ai_insights table
    - [ ] 4.2.11 Implement: Write sentiment insight to ai_insights table (kind = 'sentiment')
    - [ ] 4.2.12 Write unit test: Deduplication logic prevents duplicate sentiments
    - [ ] 4.2.13 Implement: Implement deduplication logic
  - [ ] 4.3 Create next steps extraction job
    - [ ] 4.3.1 Write unit test: Latest 1-3 notes queried correctly
    - [ ] 4.3.2 Implement: Create processor at `src/server/jobs/processors/ai-insight-next-steps.processor.ts`
    - [ ] 4.3.3 Implement: Query latest 1-3 notes for contact
    - [ ] 4.3.4 Write unit test: LLM prompt extracts action items with keywords
    - [ ] 4.3.5 Implement: Build LLM prompt to extract action items (keywords: "client will", "homework", "follow-up")
    - [ ] 4.3.6 Write unit test: Mock LLM returns JSON array of action items
    - [ ] 4.3.7 Implement: Call LLM and parse JSON array of action items
    - [ ] 4.3.8 Write unit test: Steps stored in ai_insights with correct structure
    - [ ] 4.3.9 Implement: Store extracted steps in ai_insights table (kind = 'next_steps', content = { steps: [], extractedFrom: [] })
    - [ ] 4.3.10 Write unit test: Deduplication based on note IDs works correctly
    - [ ] 4.3.11 Implement: Implement deduplication based on note IDs
  - [ ] 4.4 Create risk flag detection job
    - [ ] 4.4.1 Write unit test: Notes + sessions queried for last 30 days
    - [ ] 4.4.2 Implement: Create processor at `src/server/jobs/processors/ai-insight-risk-flags.processor.ts`
    - [ ] 4.4.3 Implement: Query notes + sessions for contact (last 30 days)
    - [ ] 4.4.4 Write unit test: LLM prompt identifies concerning patterns
    - [ ] 4.4.5 Implement: Build LLM prompt to identify concerning patterns (e.g., "3 cancellations in 2 weeks")
    - [ ] 4.4.6 Write unit test: Mock LLM returns risk flags with severity levels
    - [ ] 4.4.7 Implement: Call LLM and parse JSON array of risk flags with severity (low/medium/high)
    - [ ] 4.4.8 Write unit test: Risk flags written to ai_insights with correct structure
    - [ ] 4.4.9 Implement: Write risk flags to ai_insights table (kind = 'risk_flag', content = { flag, severity, evidence })
  - [ ] 4.5 Create suggested agenda generation job
    - [ ] 4.5.1 Write unit test: Recent notes + upcoming session queried correctly
    - [ ] 4.5.2 Implement: Create processor at `src/server/jobs/processors/ai-insight-agenda.processor.ts`
    - [ ] 4.5.3 Implement: Query recent notes + upcoming session for contact
    - [ ] 4.5.4 Write unit test: LLM prompt generates talking points for next session
    - [ ] 4.5.5 Implement: Build LLM prompt to generate talking points for next session
    - [ ] 4.5.6 Write unit test: Mock LLM returns agenda topics with priority
    - [ ] 4.5.7 Implement: Call LLM and parse JSON array of agenda topics with priority
    - [ ] 4.5.8 Write unit test: Agenda written to ai_insights with correct structure
    - [ ] 4.5.9 Implement: Write agenda to ai_insights table (kind = 'agenda', content = { topics, priority })
  - [ ] 4.6 Implement job scheduling infrastructure
    - [ ] 4.6.1 Write unit test: Job enqueued after note save
    - [ ] 4.6.2 Implement: Create service to enqueue AI insight jobs after note save
    - [ ] 4.6.3 Write unit test: Cron job processes active contacts every 6 hours
    - [ ] 4.6.4 Implement: Set up cron job for batch processing (every 6 hours for active contacts)
    - [ ] 4.6.5 Write unit test: Job retry logic with exponential backoff (max 3 retries)
    - [ ] 4.6.6 Implement: Implement job retry logic with exponential backoff (max 3 retries)
    - [ ] 4.6.7 Write unit test: Job monitoring logs latency and success/failure rates
    - [ ] 4.6.8 Implement: Add job monitoring and logging (track job latency, success/failure rates)
    - [ ] 4.6.9 Write unit test: Deduplication check prevents duplicate job enqueueing
    - [ ] 4.6.10 Implement: Implement deduplication check before enqueuing jobs

- [ ] 5.0 Enhance Note Editor with Tags and Goals
  - [ ] 5.1 Create wellness tag taxonomy constants
    - [ ] 5.1.1 Write unit test: WELLNESS_TAGS constant has 36 tags total
    - [ ] 5.1.2 Write unit test: Tags grouped into 4 categories with correct counts
    - [ ] 5.1.3 Implement: Create file at `src/lib/constants/wellness-tags.ts`
    - [ ] 5.1.4 Implement: Define 4 tag categories: Services (14), Demographics (11), Goals & Health (11), Engagement (10)
    - [ ] 5.1.5 Write unit test: Each tag has category and color properties
    - [ ] 5.1.6 Implement: Export WELLNESS_TAGS constant as array of tag objects with category + color
    - [ ] 5.1.7 Write unit test: TypeScript types enforced correctly
    - [ ] 5.1.8 Implement: Add TypeScript type definitions for WellnessTag and TagCategory
  - [ ] 5.2 Build NoteTagPicker component
    - [ ] 5.2.1 Write unit test: Multi-select dropdown renders with Popover + Command
    - [ ] 5.2.2 Implement: Create multi-select dropdown component using shadcn Popover + Command
    - [ ] 5.2.3 Write unit test: Tags grouped by category with headers
    - [ ] 5.2.4 Implement: Group tags by category with category headers
    - [ ] 5.2.5 Write unit test: Search/filter functionality works within picker
    - [ ] 5.2.6 Implement: Add search/filter functionality within tag picker
    - [ ] 5.2.7 Write unit test: Selected tags display as chips with remove button
    - [ ] 5.2.8 Implement: Display selected tags as chips with remove button
    - [ ] 5.2.9 Write unit test: Color coding by category applied correctly
    - [ ] 5.2.10 Implement: Implement color coding by category
    - [ ] 5.2.11 Write unit test: Autocomplete suggests user's frequently used tags
    - [ ] 5.2.12 Implement: Add autocomplete based on user's frequently used tags
    - [ ] 5.2.13 Write unit test: onChange callback fired with selected tag IDs
    - [ ] 5.2.14 Implement: Expose onChange callback with selected tag IDs
  - [ ] 5.3 Build goal picker component
    - [ ] 5.3.1 Write unit test: Multi-select dropdown renders with active goals
    - [ ] 5.3.2 Implement: Create multi-select dropdown for active goals
    - [ ] 5.3.3 Write unit test: Query filters goals correctly (status != 'abandoned')
    - [ ] 5.3.4 Implement: Query goals table WHERE contactId = X AND status != 'abandoned'
    - [ ] 5.3.5 Write unit test: Goal name + progress indicator displayed in dropdown
    - [ ] 5.3.6 Implement: Display goal name + progress indicator in dropdown
    - [ ] 5.3.7 Write unit test: Selected goals shown as chips below picker
    - [ ] 5.3.8 Implement: Show selected goals as chips below picker
    - [ ] 5.3.9 Write unit test: onChange callback fired with selected goal IDs
    - [ ] 5.3.10 Implement: Expose onChange callback with selected goal IDs
  - [ ] 5.4 Update NoteEditor component with tag and goal pickers
    - [ ] 5.4.1 Write unit test: NoteTagPicker renders in editor toolbar
    - [ ] 5.4.2 Implement: Add NoteTagPicker component to note editor toolbar
    - [ ] 5.4.3 Write unit test: Goal picker renders below tag picker
    - [ ] 5.4.4 Implement: Add goal picker component below tag picker
    - [ ] 5.4.5 Write unit test: Tag selection updates form state
    - [ ] 5.4.6 Implement: Wire tag selection to form state
    - [ ] 5.4.7 Write unit test: Goal selection updates form state
    - [ ] 5.4.8 Implement: Wire goal selection to form state
    - [ ] 5.4.9 Write unit test: Save handler includes tags and goalIds in request
    - [ ] 5.4.10 Implement: Update save handler to include tags and goalIds in request
  - [ ] 5.5 Add session linking dropdown (optional)
    - [ ] 5.5.1 Write unit test: "Link to Session" dropdown renders in editor
    - [ ] 5.5.2 Implement: Create "Link to Session" dropdown in note editor
    - [ ] 5.5.3 Write unit test: Recent sessions queried from interactions table
    - [ ] 5.5.4 Implement: Query interactions table for recent sessions (type = 'calendar_event')
    - [ ] 5.5.5 Write unit test: Auto-suggest session within 24 hours of session end
    - [ ] 5.5.6 Implement: Auto-suggest session if note created within 24 hours of session end
    - [ ] 5.5.7 Write unit test: Linked session displayed in note metadata
    - [ ] 5.5.8 Implement: Display linked session in note metadata on save
  - [ ] 5.6 Display tags on note cards and detail pages
    - [ ] 5.6.1 Write unit test: NoteCard renders tags as chips in footer
    - [ ] 5.6.2 Implement: Update NoteCard component to render tags as chips in footer
    - [ ] 5.6.3 Write unit test: Category color coding applied to tag chips
    - [ ] 5.6.4 Implement: Apply category color coding to tag chips
    - [ ] 5.6.5 Write unit test: Click handler on tag chips filters "All Notes"
    - [ ] 5.6.6 Implement: Add click handler to tag chips (filter "All Notes" by tag)
    - [ ] 5.6.7 Write unit test: Note detail page displays tags prominently
    - [ ] 5.6.8 Implement: Update note detail page to display tags prominently
  - [ ] 5.7 Update business schemas for tags and goals
    - [ ] 5.7.1 Write unit test: CreateNoteBodySchema accepts tags array
    - [ ] 5.7.2 Implement: Add tags field to CreateNoteBodySchema (z.array(z.string()).optional())
    - [ ] 5.7.3 Write unit test: CreateNoteBodySchema accepts goalIds array (UUIDs)
    - [ ] 5.7.4 Implement: Add goalIds field to CreateNoteBodySchema (z.array(z.string().uuid()).optional())
    - [ ] 5.7.5 Write unit test: CreateNoteBodySchema accepts linkedSessionId (UUID)
    - [ ] 5.7.6 Implement: Add linkedSessionId field to CreateNoteBodySchema (z.string().uuid().optional())
    - [ ] 5.7.7 Write unit test: UpdateNoteBodySchema accepts same fields
    - [ ] 5.7.8 Implement: Update UpdateNoteBodySchema with same fields

- [ ] 6.0 Final Integration Testing, Performance, and Accessibility
  - [ ] 6.1 Performance testing
    - [ ] 6.1.1 Measure: Rapid Note modal open latency (target: < 500ms)
    - [ ] 6.1.2 Measure: Transcription latency for 3-minute audio (target: < 10s at p95)
    - [ ] 6.1.3 Measure: Contact Details page load time with 100+ notes (target: < 2s at p95)
    - [ ] 6.1.4 Measure: Timeline infinite scroll performance (no lag on load more)
    - [ ] 6.1.5 Measure: Background job completion time (target: < 60s for contacts with <100 notes)
    - [ ] 6.1.6 Profile and optimize any bottlenecks found
  - [ ] 6.2 Accessibility audit
    - [ ] 6.2.1 Test: Keyboard navigation through entire rapid capture workflow
    - [ ] 6.2.2 Verify: ARIA labels on all interactive elements (buttons, inputs, dropdowns)
    - [ ] 6.2.3 Test: Screen reader compatibility (VoiceOver, NVDA)
    - [ ] 6.2.4 Verify: Color contrast ratios meet WCAG 2.1 AA standards
    - [ ] 6.2.5 Test: Focus management (modal trap, skip links)
    - [ ] 6.2.6 Run: Automated accessibility audit with axe-core
    - [ ] 6.2.7 Fix: Any critical or serious accessibility issues found
  - [ ] 6.3 User acceptance testing
    - [ ] 6.3.1 Recruit 3-5 wellness practitioners for UAT
    - [ ] 6.3.2 Create UAT test plan with key user stories
    - [ ] 6.3.3 Conduct moderated testing sessions
    - [ ] 6.3.4 Collect feedback via survey (1-5 scale satisfaction ratings)
    - [ ] 6.3.5 Document bugs and UX improvement suggestions
    - [ ] 6.3.6 Prioritize and fix high-impact issues
    - [ ] 6.3.7 Validate fixes with follow-up testing

---

**Status:** Sub-tasks Generated with Integrated Testing (TDD Approach)
**Total Sub-tasks:** 385 actionable items across 6 parent tasks (including 195 test tasks)
**Testing Coverage:** ~50% of sub-tasks are test-related (unit tests, integration tests, E2E tests)
**Next Step:** Begin Phase 1 - Task 1.1 (Write tests first, then implement VoiceRecorder)

---

**TDD Workflow Pattern:**

1. Write failing test
2. Implement minimum code to pass test
3. Refactor if needed
4. Repeat for next sub-task

This ensures **every implementation sub-task has corresponding test coverage** before moving to the next task.
