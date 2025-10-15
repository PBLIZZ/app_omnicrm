# Embeddings & Dual Search PRD

## 1. Product Vision

Provide a single, trustworthy search experience that pivots between lightning-fast keyword lookup and deeply contextual semantic retrieval, powering both global search and the AI assistant without compromising client privacy.

## 2. Personas

- **Primary:** Maya (wellness coach) and peers who manage holistic client journeys. They expect fast answers and transparent provenance when AI is involved.

## 3. Goals & KPIs

- ≥60% of searches surface a relevant entity in top 3 results.
- ≥40% of assistant replies cite retrieved context from embeddings.
- <1% of searches result in privacy complaints or surfaced redacted content.

## 4. User Stories & Acceptance

| Story ID | User Story | Acceptance Criteria |
| --- | --- | --- |
| ES-01 | As a Pilates instructor I need quick keyword search so I can find “prenatal core” tasks/notes instantly. | `/api/search` endpoint returns keyword results < 500 ms; UI shows grouped entities with direct links. |
| ES-02 | As a wellness coach I want a semantic toggle to find “clients interested in detox programs” even if exact phrase isn’t present. | Search bar toggle triggers embedding workflow; returns contacts with matching insights/notes; each result shows snippet & source. |
| ES-03 | As a practitioner I need the assistant to cite session notes when I ask contextual questions. | Assistant backend performs RAG retrieval, attaches top-N snippets, and displays citations linkable to source entities. |
| ES-04 | As a reiki master I want to preview text the semantic engine pulled so I confirm relevance before referencing it. | Search results have “View context” modal with snippet, creation date, data source labels. |
| ES-05 | As a user I want to mark sensitive notes as non-embeddable to protect confidences. | Notes UI includes “Exclude from AI search” toggle; service layer respects attribute when regenerating embeddings. |
| ES-06 | As an ops admin I want embedding health metrics to spot stale or failed vectors. | Internal dashboard showing counts of embeddings by status, failed jobs, last refresh. |
| ES-07 | As an AI user I want to see a history of what data the assistant accessed. | Conversation transcript includes retrieval log entries (timestamp, entity, snippet). |
| ES-08 | As any practitioner I want to flag wrong search results so relevance improves. | Result cards include “Mark as irrelevant”; logs feedback for future tuning. |

## 5. Scope & Non-Goals

### In Scope

- Dual-mode search bar (keyword + semantic).
- Embedding ingestion pipeline leveraging AI insights, notes, interactions.
- RAG integration for assistant responses.
- Privacy controls + exclusion flags.
- Monitoring & feedback loops.

### Out of Scope

- Automated outbound responses by AI assistant.
- Multi-tenant team search.
- Predictive analytics beyond retrieval.

## 6. Existing Infrastructure & Gaps

| Component | Status | Notes |
| --- | --- | --- |
| Postgres (Supabase) with pgvector | ✅ Ready | Already in use; embeddings table stores vectors. |
| Embeddings service (`src/server/services/embeddings.service.ts`) | ✅ CRUD | Supports creation, bulk insert, update, delete. |
| AI insights generation | ✅ Source text | Provides rich summaries for embedding. |
| RAG orchestrator / search endpoints | ❌ Missing | Need new service & API routes. |
| Background job framework | ✅ Basic jobs exist | Reuse existing job scheduling (see `src/server/jobs`). |
| Assistant retrieval logger | ❌ Missing | Implement retrieval logging. |
| Note privacy flag | ❌ Missing | Requires schema change & enforcement. |
| Feedback capture | ❌ Missing | Add endpoint + table. |

## 7. Functional Requirements

1. **Search API (`/api/search`):**
   - Accept query, mode (`keyword`/`semantic`), filters (entity types).
   - Returns unified schema: `{ hits: Array<{ type, id, title, snippet, score, source }> }`.
2. **Semantic Retrieval Flow:**
   - Embed query via embedding model.
   - Perform KNN over pgvector `embeddings` table (ownerType filter).
   - Fetch source entities (contacts, notes, tasks, documents) via services.
3. **Embedding Ingestion Pipeline:**
   - Job processes new AI insights, notes, documents.
   - Chunks long content, normalizes text, calls embedding LLM.
   - Stores vector using `createEmbeddingsBulk` with metadata & freshness timestamps.
   - Records success/failure metrics in `embedding_jobs` table.
4. **Privacy Controls:**
   - Add `allow_embeddings` boolean to notes, documents, AI insights. Default to `true` for documents and AI insights, while new notes marked as private default to `false` (must be explicitly enabled). Surface a user-facing toggle everywhere content is created.
   - Enforce in ingestion pipeline & search queries.
5. **Assistant Integration:**
   - Update assistant service to call retrieval pipeline before LLM response.
   - Return citations array for UI display.
6. **Monitoring & Feedback:**
   - `embedding_health` view aggregating counts by status.
   - `/api/search-feedback` endpoint to capture user marking of false positives/negatives.
   - Admin UI with latest failed embeddings.

## 8. Detailed Implementation Plan (Atomic Tasks)

### 8.1 Database / Supabase Migrations

- [ ] Add `allow_embeddings` column (boolean) to `notes`, `documents`, `ai_insights`.
- [ ] Create `embedding_jobs` table with columns: `id`, `source_type`, `source_id`, `status`, `error`, `processed_at`.
- [ ] Create `search_feedback` table recording userId, query, resultId, feedbackType.
- [ ] Ensure pgvector index exists on `embeddings.embedding` (confirm or create).

### 8.2 Service Layer

- [ ] Implement `search.service.ts` with keyword & semantic handlers.
- [ ] Add `retrieveEmbeddings` helper performing vector similarity using `pgvector` SQL (`<->` operator).
- [ ] Extend `embeddings` service with `markStaleByOwner` (trigger re-embedding when source updates).
- [ ] Create `embedding-ingestion.job.ts` orchestrating chunking/embedding.
- [ ] Add retrieval logger utility writing to `assistant_retrieval_log`.
- [ ] Extend assistant service to inject RAG context.
- [ ] Implement `searchFeedback.service.ts` to persist feedback.

### 8.3 API Routes

- [ ] Create `src/app/api/search/route.ts` supporting GET (keyword) & POST (semantic with body for complex filters).
- [ ] Add `src/app/api/search/feedback/route.ts` for logging results feedback.
- [ ] Add `src/app/api/search/history/route.ts` to return retrieval history for user.
- [ ] Add `src/app/api/data-intelligence/embeddings/refresh/route.ts` to trigger re-embedding (admin).

### 8.4 Background Jobs & Workers

- [ ] Nightly job to re-embed AI insights, notes updated in last 24h.
- [ ] Streaming job triggered upon note save if `allow_embeddings` true.
- [ ] Health check job reporting stale embeddings (>14 days).

### 8.5 Frontend / Hooks

- [ ] Create `useGlobalSearch` hook with mode toggle; caches last 5 searches.
- [ ] Build `GlobalSearchBar` component with mode toggle, type filters, suggestions.
- [ ] Implement results list with grouped sections (Contacts, Tasks, Notes, Documents).
- [ ] Add `SemanticResultPreview` modal showing snippet, metadata, privacy badge.
- [ ] Update assistant chat pane to show “Used sources” panel with citations.
- [ ] Add settings toggle on notes/documents detail to exclude from embeddings.
- [ ] Build `EmbeddingHealthPanel` for admin dashboard.
- [ ] Add `SearchHistoryDrawer` for user to review past queries & retrievals.
- [ ] Create feedback buttons on result cards hooking into `/api/search/feedback`.

## 9. Technical Considerations

- Use pgvector KNN query:  
  `await db.execute(sql\`SELECT *, embedding <-> ${queryVector} AS distance FROM embeddings WHERE user_id = ${userId} AND owner_type = ANY(${ownerTypes}) ORDER BY embedding <-> ${queryVector} LIMIT ${limit}\`);`
- Embedding model: OpenAI `text-embedding-3-small` (fast, cost-effective). Add config to `AI_PROVIDER` env.
- Chunking: Use ~512 tokens per chunk, overlap 64 tokens.
- Cache results: optional Redis layer (future) if semantic search latency needs improvement.

## 10. Privacy & Compliance

- Default behavior: documents and AI insights start with `allow_embeddings = true`; newly created private notes default to `false` and require explicit opt-in before indexing.
- Retrieval logs accessible per user; redacted content never displayed without permission.
- Assistant prompts must include guardrails to avoid divulging excluded notes.

## 11. Telemetry

- Capture search latency, number of hits, mode usage.
- Track assistant retrieval count & citation coverage.
- Log feedback events; feed into offline evaluation pipeline.

## 12. Risks & Mitigations

- **Latency spikes:** Pre-compute embeddings overnight; consider asynchronous UI spinner for semantic mode.
- **Wrong or sensitive context surfaced:** Enforce exclusion flags; show previews before quoting AI suggestions.
- **Model drift:** Monitor relevance via feedback metrics; allow quick re-embedding triggered by ops.

## 13. Deployment Phases

1. **Phase 1:** Keyword + semantic backend, ingestion job, basic UI toggles.
2. **Phase 2:** Assistant integration with citations, privacy controls, feedback capture.
3. **Phase 3:** Admin health dashboards, search history insights, continuous tuning.
