-- ====================================================================
-- Performance + integrity tweaks (idempotent)
-- ====================================================================

-- -------- RAW EVENTS: latest lookups, batch, and dedupe --------
CREATE INDEX IF NOT EXISTS raw_events_user_provider_occurred_at_idx
  ON public.raw_events (user_id, provider, occurred_at DESC);

CREATE INDEX IF NOT EXISTS raw_events_user_provider_created_at_idx
  ON public.raw_events (user_id, provider, created_at DESC);

CREATE INDEX IF NOT EXISTS raw_events_user_provider_batch_idx
  ON public.raw_events (user_id, provider, batch_id);

ALTER TABLE public.raw_events
  ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Optional hygiene FK (soft): keep data if contact deleted
ALTER TABLE public.raw_events
  DROP CONSTRAINT IF EXISTS raw_events_contact_fk,
  ADD CONSTRAINT raw_events_contact_fk
    FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- -------- JOBS: queue pulls, backoff, and batch ops -------------
CREATE INDEX IF NOT EXISTS jobs_user_status_kind_idx
  ON public.jobs (user_id, status, kind);

CREATE INDEX IF NOT EXISTS jobs_user_batch_id_idx
  ON public.jobs (user_id, batch_id);

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- -------- SYNC AUDIT: fast last approve/preview -----------------
CREATE INDEX IF NOT EXISTS sync_audit_user_provider_action_created_at_idx
  ON public.sync_audit (user_id, provider, action, created_at DESC);

CREATE INDEX IF NOT EXISTS sync_audit_user_created_at_idx
  ON public.sync_audit (user_id, created_at DESC);

-- -------- INTERACTIONS: timeline + dedupe -----------------------
CREATE INDEX IF NOT EXISTS interactions_user_occurred_at_idx
  ON public.interactions (user_id, occurred_at DESC);

-- Optional hygiene FK (soft)
ALTER TABLE public.interactions
  DROP CONSTRAINT IF EXISTS interactions_contact_fk,
  ADD CONSTRAINT interactions_contact_fk
    FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;