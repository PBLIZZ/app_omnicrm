-- ====================================================================
-- Performance + integrity tweaks 
-- ====================================================================

-- -------- RAW EVENTS --------
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS raw_events_uidx
  ON public.raw_events(user_id, provider, source_id)
  WHERE source_id IS NOT NULL;

-- -------- JOBS -------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_user_status_updated_idx
  ON public.jobs (user_id, status, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_queued_idx
  ON public.jobs (updated_at)
  WHERE status = 'queued';

-- -------- INTERACTIONS -----------------------
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS interactions_user_source_source_id_uniq
  ON public.interactions (user_id, source, source_id)
  WHERE source_id IS NOT NULL;

-- -------- AI USAGE ----------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_usage_user_created_at_idx
  ON public.ai_usage (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_usage_user_model_created_at_idx
  ON public.ai_usage (user_id, model, created_at DESC);