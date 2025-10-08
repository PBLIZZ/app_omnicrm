# Data Intelligence Experience PRD

## 1. Product Vision
Deliver a calm, trustworthy command center that arms wellness solopreneurs with relationship‑building insights prepared overnight by AI, while keeping human empathy, privacy, and personal tone in the foreground.

## 2. Persona Snapshot
- **Primary:** Maya (36) – yoga teacher & bodywork coach, juggling studios, remote clients, and a toddler. She needs quick situational awareness each morning and subtle AI cues that respect client confidentiality.

## 3. Problem / Opportunity
- Practitioners drown in fragmented notes, emails, calendar events, and approvals.
- They want AI support to surface context and risks, not to replace their voice or edit confidential notes.

## 4. Goals & Success Metrics
- ≥70% of active users open the Morning Brief card on weekdays.
- ≥50% of AI-suggested follow-ups are acknowledged (accept/skip) weekly.
- Zero reported privacy incidents related to AI surfacing client data.

## 5. User Stories & Acceptance
| Story ID | User Story | Acceptance Criteria |
| --- | --- | --- |
| DI-01 | As Maya I need an overnight digest of today’s schedule with AI contextual notes so I feel prepared before sessions. | Card visible by 6 am user local time, sourced from `aiInsights`/`interactions`; shows session, last note summary, suggested focus; dismissible with “Remind me later”. |
| DI-02 | As a practitioner I want a Contact Storyline card merging interactions, notes, and AI insights so my check-in feels personal. | Contact detail page shows timeline widget using `/api/data-intelligence/ai-insights` & `/api/data-intelligence/raw-events`; expandable entries with sentiment tags. |
| DI-03 | As a therapist I want churn-risk alerts so I can reach out proactively. | Dashboard section “Needs Attention” lists contacts flagged by `aiInsights` risk signal; clicking opens contact detail; supports “Dismiss for 7 days”. |
| DI-04 | As a yoga teacher I want AI to suggest reminder scripts I can accept/edit so my tone stays authentic. | Insight card with Suggested Message; "Accept & Edit" opens modal pre-filled text; acceptance pushes to Momentum approvals queue via `tasks` service. |
| DI-05 | As a massage therapist I want prospect outreach drafts aligned to inquiry so follow-up is faster. | AI suggestions filtered by lifecycle “Prospect”; call-to-action to queue outreach task. |
| DI-06 | As a practitioner I want to see AI-suggested next steps queued in Momentum so approvals transfer seamlessly to tasks. | Accepting suggestion creates Momentum task via `src/server/services/tasks` (existing) with link to originating insight. |
| DI-07 | As a business owner I want a Document & Media view that indicates which materials have insights so I keep them current. | Documents page hitting `/api/data-intelligence/documents`; icons showing embedding freshness (via `embeddings` service). |
| DI-08 | As an admin-minded user I want an Ignored Identifier monitor to keep data hygiene without exposing secrets. | Operational table from `/api/data-intelligence/ignored-identifiers`; inline reason editing; export CSV. |
| DI-09 | As a reiki master I want an audit trail of AI actions to reassure clients their private notes are safe. | Insight history modal showing AI suggestion author, timestamp, data sources (notes, interactions) with read-only labels. |
| DI-10 | As a user I want control toggles to mute AI cards per contact so the interface respects my preferences. | Per-contact settings persisted in `contact_preferences` (new table) or existing preferences structure; UI checkbox on contact profile. |

## 6. Experience Map
1. **Morning Brief (Flow / Rhythm):** aggregated card when user logs in.
2. **Contact Detail (Flow):** timeline widget, AI suggestions, quick actions.
3. **Approvals (Momentum):** AI-sourced tasks appear with context.
4. **Dashboard Widgets:** churn-risk, upcoming sessions, required follow-ups.
5. **Admin Views:** Document freshness, Ignored identifiers, AI audit.

## 7. Feature Requirements / Tasks
### 7.1 API / Service Extensions
- [ ] Extend `src/server/services/ai-insights.service.ts` with filters for lifecycle stage & risk (needs repo support).
- [ ] Add `listContactInsights` aggregator (timeline) combining raw events, notes, insights.
- [ ] Create service to queue Momentum tasks from AI suggestions (`ai-insights` → `tasks` bridge).
- [ ] Introduce `contact_preferences` structure to store AI visibility toggles (DB migration).
- [ ] Add `/api/data-intelligence/settings` routes to expose preferences (new file).
- [ ] Build audit log writer capturing AI suggestion events (`ai_insight_audit` table).

### 7.2 UI / Hooks
- [ ] Create `useAiInsights` hook hitting `/api/data-intelligence/ai-insights`.
- [ ] Create `useContactTimeline(contactId)` combining insights, interactions, notes.
- [ ] Build `MorningBriefCard` component using new hook; slot into dashboard layout.
- [ ] Implement `NeedsAttentionList` component filtering insights by churn-risk.
- [ ] Add `AiSuggestionCard` with Accept/Edit flow (modal).
- [ ] Build `DocumentsInsightTable` showing freshness indicators.
- [ ] Implement `IgnoredIdentifiersPanel` with edit/delete actions.
- [ ] Add `AiAuditModal` component.
- [ ] Integrate contact preference toggle in Contact sidebar.

### 7.3 Background Jobs
- [ ] Nightly job to precompute Morning Brief payload (persist to `daily_briefs` table).
- [ ] Schedule audit-log cleanup/archival.

## 8. Infrastructure & Dependencies
| Component | Status | Notes |
| --- | --- | --- |
| Data services (`aiInsights`, `documents`, etc.) | ✅ Exists | New API endpoints created (`src/app/api/data-intelligence/...`). |
| AI suggestion → task queue | ❌ Missing | Need bridging service + DB migration for tracking mapping. |
| Contact preferences storage | ❌ Missing | Requires schema update & service layer. |
| AI audit log | ❌ Missing | Add table + writer util. |
| Morning brief cache table | ❌ Missing | Add `daily_briefs` or use existing caching infra. |
| Hooks for new APIs | ❌ Missing | Must implement for UI. |
| Dashboard cards | ❌ Missing | To be developed. |
| Privacy controls | ⚠️ Partial | Need UI toggles & enforcement in services. |

## 9. Analytics & Telemetry
- Track interactions per card (view/dismiss/accept).
- Log conversions from AI suggestion → approved task.
- Monitor suppression toggles to ensure defaults align with trust expectations.

## 10. Risks & Mitigations
- **Privacy perception risk:** Provide audit trails & toggles; never allow AI to edit raw notes automatically.
- **Information overload:** Allow dismiss/snooze and limited number of highlighted insights.
- **Incorrect suggestions:** Offer skip/feedback button feeding model improvement queue.

## 11. Timeline (Rough Phasing)
1. **Phase 1:** Backend plumbing (services, preferences, audit) + Morning Brief MVP.
2. **Phase 2:** Contact timeline & suggestions with Momentum handoff.
3. **Phase 3:** Admin panels (documents, ignored identifiers) and audit surfaces.

