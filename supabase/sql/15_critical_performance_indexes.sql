-- ====================================================================
-- CRITICAL Performance Indexes - Phase 1 Optimizations
-- Estimated Impact: 50-70% query performance improvement
-- ====================================================================
-- Performance note: Run these index creations separately, not in a transaction block

-- CONTACTS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS contacts_user_search_name_idx
  ON public.contacts (user_id, display_name)
  WHERE display_name IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS contacts_user_search_email_idx  
  ON public.contacts (user_id, primary_email)
  WHERE primary_email IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS contacts_user_created_display_idx
  ON public.contacts (user_id, created_at DESC, display_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS contacts_user_email_dedup_idx
  ON public.contacts (user_id, primary_email)
  WHERE primary_email IS NOT NULL AND primary_email != '';

CREATE INDEX CONCURRENTLY IF NOT EXISTS contacts_user_phone_dedup_idx
  ON public.contacts (user_id, primary_phone)  
  WHERE primary_phone IS NOT NULL AND primary_phone != '';

-- INTERACTIONS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS interactions_user_timeline_idx
  ON public.interactions (user_id, occurred_at DESC, type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS interactions_user_unlinked_idx
  ON public.interactions (user_id, type, contact_id)
  WHERE contact_id IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS interactions_user_source_batch_idx
  ON public.interactions (user_id, source, batch_id)
  WHERE batch_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS interactions_contact_timeline_idx
  ON public.interactions (contact_id, occurred_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS interactions_user_type_recent_idx
  ON public.interactions (user_id, type, occurred_at DESC);

-- RAW_EVENTS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS raw_events_user_provider_occurred_idx
  ON public.raw_events (user_id, provider, occurred_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS raw_events_user_batch_idx
  ON public.raw_events (user_id, batch_id)
  WHERE batch_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS raw_events_user_source_idx
  ON public.raw_events (user_id, provider, source_id)
  WHERE source_id IS NOT NULL;

-- JOBS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_user_status_created_idx
  ON public.jobs (user_id, status, created_at ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_status_kind_priority_idx
  ON public.jobs (status, kind, created_at ASC)
  WHERE status IN ('queued', 'running');

CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_user_batch_idx
  ON public.jobs (user_id, batch_id)
  WHERE batch_id IS NOT NULL;

-- AI_INSIGHTS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_insights_user_subject_idx
  ON public.ai_insights (user_id, subject_type, subject_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_insights_user_kind_created_idx
  ON public.ai_insights (user_id, kind, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_insights_user_recent_idx
  ON public.ai_insights (user_id, created_at DESC);

-- AI_USAGE Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_usage_user_date_idx
  ON public.ai_usage (user_id, created_at::date);

-- AI_QUOTAS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_quotas_period_credits_idx
  ON public.ai_quotas (period_start, credits_left);

-- USER_INTEGRATIONS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_integrations_user_provider_service_idx
  ON public.user_integrations (user_id, provider, service);

-- USER_SYNC_PREFS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_sync_prefs_updated_idx
  ON public.user_sync_prefs (user_id, updated_at DESC);

-- SYNC_AUDIT Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS sync_audit_user_provider_created_idx
  ON public.sync_audit (user_id, provider, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS sync_audit_user_recent_idx
  ON public.sync_audit (user_id, created_at DESC);

-- EMBEDDINGS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS embeddings_user_owner_idx
  ON public.embeddings (user_id, owner_type, owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS embeddings_user_created_idx
  ON public.embeddings (user_id, created_at DESC);

-- DOCUMENTS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS documents_user_contact_idx
  ON public.documents (user_id, owner_contact_id)
  WHERE owner_contact_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS documents_user_created_idx
  ON public.documents (user_id, created_at DESC);

-- THREADS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS threads_user_updated_idx
  ON public.threads (user_id, updated_at DESC);

-- MESSAGES Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_thread_created_idx
  ON public.messages (thread_id, created_at ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_user_thread_idx
  ON public.messages (user_id, thread_id, created_at ASC);

-- TOOL_INVOCATIONS Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS tool_invocations_message_created_idx
  ON public.tool_invocations (message_id, created_at ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS tool_invocations_user_tool_idx
  ON public.tool_invocations (user_id, tool, created_at DESC);