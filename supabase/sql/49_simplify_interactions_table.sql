-- =========================
-- 49_simplify_interactions_table.sql
-- SIMPLIFY interactions table - remove redundant columns
-- Description: Interactions must be linked to contacts. All provider-specific data
-- goes into sourceMeta JSONB. Raw events remain the lossless ingestion layer.
-- =========================

-- Step 1: Make contactId NOT NULL after cleaning up
-- First, delete any interactions without contacts (they shouldn't exist)
DELETE FROM public.interactions WHERE contact_id IS NULL;

-- Make contactId required
ALTER TABLE public.interactions 
  ALTER COLUMN contact_id SET NOT NULL;

-- Step 2: Drop redundant columns (calendar data stays in sourceMeta)
ALTER TABLE public.interactions
  DROP COLUMN IF EXISTS start_time,
  DROP COLUMN IF EXISTS end_time,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS attendees,
  DROP COLUMN IF EXISTS event_status,
  DROP COLUMN IF EXISTS time_zone,
  DROP COLUMN IF EXISTS is_all_day,
  DROP COLUMN IF EXISTS visibility,
  DROP COLUMN IF EXISTS event_category,
  DROP COLUMN IF EXISTS keywords,
  DROP COLUMN IF EXISTS google_updated,
  DROP COLUMN IF EXISTS last_synced,
  DROP COLUMN IF EXISTS body_raw;

-- Step 3: Drop calendar_events backup table (no longer needed)
DROP TABLE IF EXISTS public.calendar_events_backup_20251006;

-- Step 4: Add constraint comment
COMMENT ON COLUMN public.interactions.contact_id IS 
  'Required: Interactions must be linked to a contact. Unlinked events stay in raw_events.';

-- Step 5: Update table comment
COMMENT ON TABLE public.interactions IS 
  'Normalized interactions (emails, calendar events, calls, meetings) that are linked to contacts. All provider-specific data stored in sourceMeta JSONB. Raw events table holds lossless ingestion data.';
