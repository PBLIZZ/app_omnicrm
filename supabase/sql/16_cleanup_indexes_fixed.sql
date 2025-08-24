-- ====================================================================
-- FIXED Cleanup and Maintenance Indexes 
-- ====================================================================

-- These indexes will help with maintenance queries without immutability issues

-- AI Usage: Rate limiting optimization (recent records first)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_usage_user_recent_idx
  ON public.ai_usage (user_id, created_at DESC);

-- User Integrations: Expired token cleanup (no time predicate)
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_integrations_expiry_cleanup_idx
  ON public.user_integrations (expiry_date ASC)
  WHERE expiry_date IS NOT NULL;

-- Jobs: Completed job management (no time predicate)
CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_completed_status_created_idx
  ON public.jobs (status, created_at ASC)
  WHERE status = 'completed';

-- Raw Events: General cleanup support (no time predicate) 
CREATE INDEX CONCURRENTLY IF NOT EXISTS raw_events_created_provider_idx
  ON public.raw_events (created_at ASC, provider);