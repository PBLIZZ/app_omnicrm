-- =========================
-- 08_unique_user_interactions_index.sql
-- Create a unique index on interactions table to prevent duplicate entries.
-- =========================

CREATE UNIQUE INDEX IF NOT EXISTS interactions_user_source_sourceid_uidx
ON public.interactions (user_id, source, source_id);
