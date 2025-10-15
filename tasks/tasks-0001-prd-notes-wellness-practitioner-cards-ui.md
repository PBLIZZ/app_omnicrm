# Task List: Smart Notes System for Wellness Practitioners

**Based on PRD:** `0001-prd-notes-wellness-practitioner-cards-ui.md`
**Created:** October 14, 2025
**Status:** Phase 1 - Parent Tasks Generated

---

## Relevant Files

### New Components (To Be Created)
- `src/components/notes/RapidNoteModal.tsx` - Full-screen capture modal with text/voice input
- `src/components/notes/VoiceRecorder.tsx` - Waveform visualization and mic controls
- `src/components/notes/LatestNotesCards.tsx` - 3-card horizontal layout for recent notes
- `src/components/notes/AITimelineCard.tsx` - Vertical timeline with sentiment indicators
- `src/components/notes/NextStepsGoalsCard.tsx` - Collapsible sections for next steps and goals
- `src/components/notes/AIInsightsCard.tsx` - Collapsible card at top of right column
- `src/components/notes/ContactDetailsHeader.tsx` - Photo + name + tags + quick stats
- `src/components/notes/NoteTagPicker.tsx` - Multi-select dropdown with 36 wellness tags

### New API Routes (To Be Created)
- `src/app/api/notes/transcribe/route.ts` - OpenAI Whisper transcription endpoint
- `src/app/api/notes/rapid-capture/route.ts` - Simplified save endpoint for quick capture
- `src/app/api/ai-insights/[contactId]/route.ts` - Fetch AI insights for contact
- `src/app/api/contacts/[contactId]/timeline/route.ts` - Merged timeline endpoint

### New Services (To Be Created)
- `src/server/services/transcription.service.ts` - OpenAI Whisper API integration
- `src/server/services/ai-insights.service.ts` - Background job for insight generation
- `src/server/services/timeline.service.ts` - Merge notes + interactions + emails

### New Background Jobs (To Be Created)
- `src/server/jobs/processors/ai-insight-timeline.processor.ts` - Generate timeline summaries
- `src/server/jobs/processors/ai-insight-sentiment.processor.ts` - Analyze sentiment
- `src/server/jobs/processors/ai-insight-next-steps.processor.ts` - Extract action items
- `src/server/jobs/processors/ai-insight-risk-flags.processor.ts` - Identify concerning patterns
- `src/server/jobs/processors/ai-insight-agenda.processor.ts` - Generate suggested agenda

### Existing Files to Update
- `src/server/db/business-schemas/notes.ts` - Add schemas for rapid capture and transcription
- `src/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NoteEditor.tsx` - Add tag picker and goal linking
- `src/lib/constants/wellness-tags.ts` - Create wellness tag taxonomy constants (new file)
- `src/hooks/use-notes.ts` - Add hooks for rapid capture and timeline queries

### Test Files (To Be Created)
- `src/components/notes/RapidNoteModal.test.tsx` - Unit tests for rapid note modal
- `src/components/notes/VoiceRecorder.test.tsx` - Unit tests for voice recorder
- `src/server/services/transcription.service.test.ts` - Unit tests for transcription service
- `src/server/services/ai-insights.service.test.ts` - Unit tests for AI insights service
- `tests/e2e/notes-rapid-capture.spec.ts` - E2E tests for rapid note workflow

### Notes
- Unit tests should be placed alongside the code files they are testing
- Use `pnpm test` to run all tests
- Use `pnpm test:e2e` to run Playwright E2E tests

---

## Tasks

- [ ] 1.0 Implement Rapid Note Capture Modal
  - [ ] 1.1 Create VoiceRecorder component with waveform visualization
    - [ ] 1.1.1 Set up MediaRecorder API integration with browser audio capture
    - [ ] 1.1.2 Implement waveform visualization using canvas or audio visualization library
    - [ ] 1.1.3 Add 3-minute timer with visual countdown indicator
    - [ ] 1.1.4 Create recording controls (start, pause, finish with checkmark button)
    - [ ] 1.1.5 Handle microphone permissions and error states
    - [ ] 1.1.6 Export audio blob in webm format for transcription
  - [ ] 1.2 Build RapidNoteModal component with full-screen layout
    - [ ] 1.2.1 Create full-screen modal using shadcn Dialog component
    - [ ] 1.2.2 Add dimmed background overlay that blocks app interaction
    - [ ] 1.2.3 Implement input bar with text area and mic icon
    - [ ] 1.2.4 Add contact selector dropdown (with last-viewed-contact default)
    - [ ] 1.2.5 Create inline editing area with cursor positioning support
    - [ ] 1.2.6 Implement 1200 character limit with visual indicator
    - [ ] 1.2.7 Add "Save" button with loading state
    - [ ] 1.2.8 Display helper text: "For advanced editing, visit Contact Details"
  - [ ] 1.3 Implement auto-save draft functionality
    - [ ] 1.3.1 Set up localStorage hook for draft persistence
    - [ ] 1.3.2 Auto-save draft every 5 seconds while typing
    - [ ] 1.3.3 Restore draft on modal reopen if unsaved content exists
    - [ ] 1.3.4 Clear draft after successful save
    - [ ] 1.3.5 Add "Restore draft" prompt on modal open if draft exists
  - [ ] 1.4 Add global header button for rapid note access
    - [ ] 1.4.1 Create lightning bolt icon button in header component
    - [ ] 1.4.2 Add "Rapid Note" tooltip on hover
    - [ ] 1.4.3 Implement keyboard shortcut (Cmd+Shift+N / Ctrl+Shift+N)
    - [ ] 1.4.4 Wire button click to open RapidNoteModal
  - [ ] 1.5 Create transcription service integration
    - [ ] 1.5.1 Set up OpenAI Whisper API client configuration
    - [ ] 1.5.2 Create transcription service function (accepts audio blob, returns text)
    - [ ] 1.5.3 Implement multipart/form-data upload with audio file
    - [ ] 1.5.4 Add retry logic with exponential backoff for network failures
    - [ ] 1.5.5 Handle error states (API unavailable, invalid audio format)
    - [ ] 1.5.6 Display transcription progress indicator in modal
  - [ ] 1.6 Integrate PII redaction for rapid notes
    - [ ] 1.6.1 Reuse existing PII detection function from notes.service.ts
    - [ ] 1.6.2 Run PII detection on save before sending to server
    - [ ] 1.6.3 Display amber warning banner if PII detected client-side
    - [ ] 1.6.4 Show red toast notification after server-side redaction
  - [ ] 1.7 Implement toast notifications for save confirmation
    - [ ] 1.7.1 Show green "Note saved" toast on successful save (3s duration)
    - [ ] 1.7.2 Show red "PII detected and redacted" toast if applicable (5s duration)
    - [ ] 1.7.3 Show error toast if save fails with retry option

- [ ] 2.0 Build Contact Details Page Cards UI
  - [ ] 2.1 Create LatestNotesCards component (3-card horizontal layout)
    - [ ] 2.1.1 Set up responsive grid layout (3 columns desktop, stack mobile)
    - [ ] 2.1.2 Create individual NoteCard component with fixed ~300px height
    - [ ] 2.1.3 Add card header: Session type + date (from session, not note creation)
    - [ ] 2.1.4 Implement scrollable body with hidden scrollbar (overflow-y-auto scrollbar-hide)
    - [ ] 2.1.5 Add footer with tag chips if tags exist
    - [ ] 2.1.6 Implement hover state with shadow elevation
    - [ ] 2.1.7 Add "View Full Note" link routing to `/contacts/[contactId]/notes/[noteId]`
    - [ ] 2.1.8 Fetch only latest 3 notes via API query optimization
  - [ ] 2.2 Build AITimelineCard component with vertical timeline
    - [ ] 2.2.1 Create vertical timeline layout with circular nodes
    - [ ] 2.2.2 Implement date display on left side (muted gray, small font)
    - [ ] 2.2.3 Add event type on right side (e.g., "Hot Stones Massage", "Email received")
    - [ ] 2.2.4 Display AI-generated summary as main text (100-250 chars)
    - [ ] 2.2.5 Add sentiment indicator circles (🔴 red, 🔵 blue, 🟢 green)
    - [ ] 2.2.6 Implement infinite scroll with intersection observer (load 20 events at a time)
    - [ ] 2.2.7 Hide scrollbar (overflow-y-auto scrollbar-hide)
    - [ ] 2.2.8 Add responsive behavior: hide dates on mobile, show only circles + text
  - [ ] 2.3 Create NextStepsGoalsCard with collapsible sections
    - [ ] 2.3.1 Set up card container with two collapsible sections
    - [ ] 2.3.2 Build "Next Steps" section (expanded by default)
    - [ ] 2.3.3 Fetch next steps from ai_insights table (kind = 'next_steps')
    - [ ] 2.3.4 Display action items as bulleted list
    - [ ] 2.3.5 Build "Goals" section (collapsed by default)
    - [ ] 2.3.6 Query goals table for active goals (status != 'abandoned')
    - [ ] 2.3.7 Display goal name + progress bar if measurable
    - [ ] 2.3.8 Implement expand/collapse interaction with smooth animation
  - [ ] 2.4 Build AIInsightsCard (collapsible, top of right column)
    - [ ] 2.4.1 Create collapsed state: small header with expand icon and pulsating indicator
    - [ ] 2.4.2 Implement pulsating animation for trigger icon (subtle glow effect)
    - [ ] 2.4.3 Create expanded state: fixed height matching 3 notes cards (~300px)
    - [ ] 2.4.4 Add three sections: Risk Flags, Sentiment Trends, Suggested Agenda
    - [ ] 2.4.5 Fetch last 6 insights from ai_insights table for contact
    - [ ] 2.4.6 Implement internal scrolling if content exceeds card height
    - [ ] 2.4.7 Add collapse button to minimize back to small header
    - [ ] 2.4.8 Persist user preference (collapsed/expanded) in localStorage
    - [ ] 2.4.9 Implement smooth expand/collapse animation
  - [ ] 2.5 Update ContactDetailsHeader component
    - [ ] 2.5.1 Add contact photo display with fallback avatar
    - [ ] 2.5.2 Display name, lifecycle stage, and top 3 tags as chips
    - [ ] 2.5.3 Add quick stats: Last session date, Next session date, Sentiment score
    - [ ] 2.5.4 Implement responsive layout for mobile
  - [ ] 2.6 Implement two-column responsive layout
    - [ ] 2.6.1 Set up 70/30 column split for desktop (min-width: 1024px)
    - [ ] 2.6.2 Stack cards vertically for mobile (max-width: 640px)
    - [ ] 2.6.3 Implement dynamic repositioning: NextStepsGoals aligns with Timeline when AI Insights collapsed
    - [ ] 2.6.4 Handle tablet layout (768px - 1024px): single column with AI sidebar overlay

- [ ] 3.0 Create API Endpoints for Notes and Timeline
  - [ ] 3.1 Build POST /api/notes/transcribe endpoint
    - [ ] 3.1.1 Create route handler at `src/app/api/notes/transcribe/route.ts`
    - [ ] 3.1.2 Add business schema for transcription request (audioBlob, contactId)
    - [ ] 3.1.3 Implement authentication check using handleAuth wrapper
    - [ ] 3.1.4 Parse multipart/form-data audio upload
    - [ ] 3.1.5 Call transcription service (OpenAI Whisper API)
    - [ ] 3.1.6 Return transcribed text + duration in response
    - [ ] 3.1.7 Add error handling for API failures and invalid audio formats
    - [ ] 3.1.8 Implement rate limiting (max 10 transcriptions per minute per user)
  - [ ] 3.2 Build POST /api/notes/rapid-capture endpoint
    - [ ] 3.2.1 Create route handler at `src/app/api/notes/rapid-capture/route.ts`
    - [ ] 3.2.2 Add business schema: RapidCaptureBodySchema (contactId, contentPlain, sourceType)
    - [ ] 3.2.3 Implement authentication using handleAuth
    - [ ] 3.2.4 Validate contactId exists and belongs to user
    - [ ] 3.2.5 Run PII redaction via notes service
    - [ ] 3.2.6 Save note to database with sourceType ('typed' | 'voice')
    - [ ] 3.2.7 Return saved note + redactionWarning boolean
    - [ ] 3.2.8 Enqueue background job for AI insights generation
  - [ ] 3.3 Build GET /api/contacts/[contactId]/timeline endpoint
    - [ ] 3.3.1 Create route handler at `src/app/api/contacts/[contactId]/timeline/route.ts`
    - [ ] 3.3.2 Add query schema: TimelineQuerySchema (limit, offset)
    - [ ] 3.3.3 Implement authentication using handleGetWithQueryAuth
    - [ ] 3.3.4 Call timeline service to merge notes + interactions + emails
    - [ ] 3.3.5 Fetch AI-generated summaries from ai_insights table
    - [ ] 3.3.6 Apply sentiment indicators to each timeline event
    - [ ] 3.3.7 Implement pagination with limit/offset
    - [ ] 3.3.8 Return { events: TimelineEvent[], hasMore: boolean }
  - [ ] 3.4 Build GET /api/ai-insights/[contactId] endpoint
    - [ ] 3.4.1 Create route handler at `src/app/api/ai-insights/[contactId]/route.ts`
    - [ ] 3.4.2 Add query schema: AIInsightsQuerySchema (limit, types[])
    - [ ] 3.4.3 Implement authentication check
    - [ ] 3.4.4 Query ai_insights table filtered by contactId and kind types
    - [ ] 3.4.5 Return last N insights ordered by createdAt DESC
    - [ ] 3.4.6 Add caching headers (cache for 5 minutes)
  - [ ] 3.5 Update existing POST /api/notes endpoint
    - [ ] 3.5.1 Add support for linkedSessionId field in request body
    - [ ] 3.5.2 Add support for tags array field
    - [ ] 3.5.3 Add support for goalIds array field
    - [ ] 3.5.4 Update note creation to insert into note_goals junction table
    - [ ] 3.5.5 Enqueue AI insights background job after save
  - [ ] 3.6 Update existing PUT /api/notes/[noteId] endpoint
    - [ ] 3.6.1 Allow updating tags array
    - [ ] 3.6.2 Allow updating goalIds (upsert note_goals junction table)
    - [ ] 3.6.3 Allow updating linkedSessionId
    - [ ] 3.6.4 Re-enqueue AI insights job on significant content changes

- [ ] 4.0 Implement AI Insights Background Jobs
  - [ ] 4.1 Create timeline summary generation job
    - [ ] 4.1.1 Create processor at `src/server/jobs/processors/ai-insight-timeline.processor.ts`
    - [ ] 4.1.2 Implement job handler to query notes + interactions for contact
    - [ ] 4.1.3 Build LLM prompt template for timeline summarization (100-250 chars)
    - [ ] 4.1.4 Call OpenRouter API with prompt (use free model like DeepSeek)
    - [ ] 4.1.5 Parse LLM response and extract summary text
    - [ ] 4.1.6 Compute fingerprint hash for deduplication (SHA256 of input data)
    - [ ] 4.1.7 Check if insight already exists with same fingerprint (< 24 hours old)
    - [ ] 4.1.8 Write timeline summary to ai_insights table (kind = 'timeline_summary')
    - [ ] 4.1.9 Update job status to 'completed' or 'failed' with error message
  - [ ] 4.2 Create sentiment analysis job
    - [ ] 4.2.1 Create processor at `src/server/jobs/processors/ai-insight-sentiment.processor.ts`
    - [ ] 4.2.2 Query recent notes (last 1-3) and goal progress for contact
    - [ ] 4.2.3 Build LLM prompt for sentiment classification (positive/neutral/negative)
    - [ ] 4.2.4 Call LLM and parse sentiment response
    - [ ] 4.2.5 Map sentiment to color: 🟢 positive, 🔵 neutral, 🔴 negative
    - [ ] 4.2.6 Write sentiment insight to ai_insights table (kind = 'sentiment')
    - [ ] 4.2.7 Implement deduplication logic
  - [ ] 4.3 Create next steps extraction job
    - [ ] 4.3.1 Create processor at `src/server/jobs/processors/ai-insight-next-steps.processor.ts`
    - [ ] 4.3.2 Query latest 1-3 notes for contact
    - [ ] 4.3.3 Build LLM prompt to extract action items (keywords: "client will", "homework", "follow-up")
    - [ ] 4.3.4 Call LLM and parse JSON array of action items
    - [ ] 4.3.5 Store extracted steps in ai_insights table (kind = 'next_steps', content = { steps: [], extractedFrom: [] })
    - [ ] 4.3.6 Implement deduplication based on note IDs
  - [ ] 4.4 Create risk flag detection job
    - [ ] 4.4.1 Create processor at `src/server/jobs/processors/ai-insight-risk-flags.processor.ts`
    - [ ] 4.4.2 Query notes + sessions for contact (last 30 days)
    - [ ] 4.4.3 Build LLM prompt to identify concerning patterns (e.g., "3 cancellations in 2 weeks")
    - [ ] 4.4.4 Call LLM and parse JSON array of risk flags with severity (low/medium/high)
    - [ ] 4.4.5 Write risk flags to ai_insights table (kind = 'risk_flag', content = { flag, severity, evidence })
  - [ ] 4.5 Create suggested agenda generation job
    - [ ] 4.5.1 Create processor at `src/server/jobs/processors/ai-insight-agenda.processor.ts`
    - [ ] 4.5.2 Query recent notes + upcoming session for contact
    - [ ] 4.5.3 Build LLM prompt to generate talking points for next session
    - [ ] 4.5.4 Call LLM and parse JSON array of agenda topics with priority
    - [ ] 4.5.5 Write agenda to ai_insights table (kind = 'agenda', content = { topics, priority })
  - [ ] 4.6 Implement job scheduling infrastructure
    - [ ] 4.6.1 Create service to enqueue AI insight jobs after note save
    - [ ] 4.6.2 Set up cron job for batch processing (every 6 hours for active contacts)
    - [ ] 4.6.3 Implement job retry logic with exponential backoff (max 3 retries)
    - [ ] 4.6.4 Add job monitoring and logging (track job latency, success/failure rates)
    - [ ] 4.6.5 Implement deduplication check before enqueuing jobs

- [ ] 5.0 Enhance Note Editor with Tags and Goals
  - [ ] 5.1 Create wellness tag taxonomy constants
    - [ ] 5.1.1 Create file at `src/lib/constants/wellness-tags.ts`
    - [ ] 5.1.2 Define 4 tag categories: Services (14), Demographics (11), Goals & Health (11), Engagement (10)
    - [ ] 5.1.3 Export WELLNESS_TAGS constant as array of tag objects with category + color
    - [ ] 5.1.4 Add TypeScript type definitions for WellnessTag and TagCategory
  - [ ] 5.2 Build NoteTagPicker component
    - [ ] 5.2.1 Create multi-select dropdown component using shadcn Popover + Command
    - [ ] 5.2.2 Group tags by category with category headers
    - [ ] 5.2.3 Add search/filter functionality within tag picker
    - [ ] 5.2.4 Display selected tags as chips with remove button
    - [ ] 5.2.5 Implement color coding by category
    - [ ] 5.2.6 Add autocomplete based on user's frequently used tags
    - [ ] 5.2.7 Expose onChange callback with selected tag IDs
  - [ ] 5.3 Build goal picker component
    - [ ] 5.3.1 Create multi-select dropdown for active goals
    - [ ] 5.3.2 Query goals table WHERE contactId = X AND status != 'abandoned'
    - [ ] 5.3.3 Display goal name + progress indicator in dropdown
    - [ ] 5.3.4 Show selected goals as chips below picker
    - [ ] 5.3.5 Expose onChange callback with selected goal IDs
  - [ ] 5.4 Update NoteEditor component with tag and goal pickers
    - [ ] 5.4.1 Add NoteTagPicker component to note editor toolbar
    - [ ] 5.4.2 Add goal picker component below tag picker
    - [ ] 5.4.3 Wire tag selection to form state
    - [ ] 5.4.4 Wire goal selection to form state
    - [ ] 5.4.5 Update save handler to include tags and goalIds in request
  - [ ] 5.5 Add session linking dropdown (optional)
    - [ ] 5.5.1 Create "Link to Session" dropdown in note editor
    - [ ] 5.5.2 Query interactions table for recent sessions (type = 'calendar_event')
    - [ ] 5.5.3 Auto-suggest session if note created within 24 hours of session end
    - [ ] 5.5.4 Display linked session in note metadata on save
  - [ ] 5.6 Display tags on note cards and detail pages
    - [ ] 5.6.1 Update NoteCard component to render tags as chips in footer
    - [ ] 5.6.2 Apply category color coding to tag chips
    - [ ] 5.6.3 Add click handler to tag chips (filter "All Notes" by tag)
    - [ ] 5.6.4 Update note detail page to display tags prominently
  - [ ] 5.7 Update business schemas for tags and goals
    - [ ] 5.7.1 Add tags field to CreateNoteBodySchema (z.array(z.string()).optional())
    - [ ] 5.7.2 Add goalIds field to CreateNoteBodySchema (z.array(z.string().uuid()).optional())
    - [ ] 5.7.3 Add linkedSessionId field to CreateNoteBodySchema (z.string().uuid().optional())
    - [ ] 5.7.4 Update UpdateNoteBodySchema with same fields

- [ ] 6.0 Testing, Performance, and Accessibility
  - [ ] 6.1 Write unit tests for Rapid Note Modal
    - [ ] 6.1.1 Test RapidNoteModal renders correctly with all elements
    - [ ] 6.1.2 Test contact selector dropdown functionality
    - [ ] 6.1.3 Test character limit enforcement (1200 chars)
    - [ ] 6.1.4 Test auto-save draft to localStorage
    - [ ] 6.1.5 Test draft restoration on modal reopen
    - [ ] 6.1.6 Test save button triggers API call with correct data
    - [ ] 6.1.7 Test keyboard shortcut (Cmd+Shift+N) opens modal
  - [ ] 6.2 Write unit tests for VoiceRecorder
    - [ ] 6.2.1 Test MediaRecorder initialization and permissions handling
    - [ ] 6.2.2 Test waveform visualization renders during recording
    - [ ] 6.2.3 Test 3-minute timer countdown and auto-stop
    - [ ] 6.2.4 Test finish button stops recording and returns audio blob
    - [ ] 6.2.5 Mock MediaRecorder API for consistent test environment
  - [ ] 6.3 Write unit tests for transcription service
    - [ ] 6.3.1 Test transcription service calls OpenAI Whisper API correctly
    - [ ] 6.3.2 Test retry logic with exponential backoff on network failures
    - [ ] 6.3.3 Test error handling for invalid audio formats
    - [ ] 6.3.4 Test error handling for API unavailable scenario
    - [ ] 6.3.5 Mock OpenAI API responses for deterministic tests
  - [ ] 6.4 Write integration tests for API endpoints
    - [ ] 6.4.1 Test POST /api/notes/transcribe with mock audio file
    - [ ] 6.4.2 Test POST /api/notes/rapid-capture with PII redaction
    - [ ] 6.4.3 Test GET /api/contacts/[contactId]/timeline pagination
    - [ ] 6.4.4 Test GET /api/ai-insights/[contactId] with different filter types
    - [ ] 6.4.5 Test authentication failures return 401
    - [ ] 6.4.6 Test rate limiting returns 429 after threshold
  - [ ] 6.5 Write E2E tests for rapid capture workflow
    - [ ] 6.5.1 Create Playwright test: Open modal → Type note → Save → Verify toast
    - [ ] 6.5.2 Create Playwright test: Open modal → Record voice → Save → Verify transcription
    - [ ] 6.5.3 Create Playwright test: Close modal without saving → Reopen → Restore draft
    - [ ] 6.5.4 Create Playwright test: Complete note capture → View in contact details → Verify display
    - [ ] 6.5.5 Test mobile responsive behavior in Playwright
  - [ ] 6.6 Write unit tests for AI Insights background jobs
    - [ ] 6.6.1 Test timeline summary processor with mock LLM responses
    - [ ] 6.6.2 Test sentiment analysis processor classification accuracy
    - [ ] 6.6.3 Test next steps extraction with various note formats
    - [ ] 6.6.4 Test risk flag detection logic
    - [ ] 6.6.5 Test deduplication logic prevents duplicate insights
    - [ ] 6.6.6 Test job retry mechanism on failures
  - [ ] 6.7 Perform performance testing
    - [ ] 6.7.1 Measure Rapid Note modal open latency (target: < 500ms)
    - [ ] 6.7.2 Measure transcription latency for 3-minute audio (target: < 10s at p95)
    - [ ] 6.7.3 Measure Contact Details page load time with 100+ notes (target: < 2s at p95)
    - [ ] 6.7.4 Test timeline infinite scroll performance (no lag on load more)
    - [ ] 6.7.5 Measure background job completion time (target: < 60s for contacts with <100 notes)
    - [ ] 6.7.6 Profile and optimize any bottlenecks found
  - [ ] 6.8 Conduct accessibility audit
    - [ ] 6.8.1 Test keyboard navigation through entire rapid capture workflow
    - [ ] 6.8.2 Verify ARIA labels on all interactive elements (buttons, inputs, dropdowns)
    - [ ] 6.8.3 Test screen reader compatibility (VoiceOver, NVDA)
    - [ ] 6.8.4 Verify color contrast ratios meet WCAG 2.1 AA standards
    - [ ] 6.8.5 Test focus management (modal trap, skip links)
    - [ ] 6.8.6 Run automated accessibility audit with axe-core
    - [ ] 6.8.7 Fix any critical or serious accessibility issues found
  - [ ] 6.9 Conduct user acceptance testing
    - [ ] 6.9.1 Recruit 3-5 wellness practitioners for UAT
    - [ ] 6.9.2 Create UAT test plan with key user stories
    - [ ] 6.9.3 Conduct moderated testing sessions
    - [ ] 6.9.4 Collect feedback via survey (1-5 scale satisfaction ratings)
    - [ ] 6.9.5 Document bugs and UX improvement suggestions
    - [ ] 6.9.6 Prioritize and fix high-impact issues
    - [ ] 6.9.7 Validate fixes with follow-up testing

---

**Status:** Sub-tasks Generated - Ready for Implementation
**Total Sub-tasks:** 172 actionable items across 6 parent tasks
**Next Step:** Begin Phase 1 - Rapid Note Capture Modal (Task 1.0)

---
