-- =========================
-- 35_merge_calendar_events_into_interactions.sql
-- Phase 1: Add calendar-specific columns to interactions table
-- This allows interactions to store calendar event data alongside emails, calls, etc.
-- =========================

-- Step 1: Add calendar-specific columns to interactions table
ALTER TABLE public.interactions 
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS attendees jsonb,
  ADD COLUMN IF NOT EXISTS event_status text,  -- renamed from 'status' to avoid confusion
  ADD COLUMN IF NOT EXISTS time_zone text,
  ADD COLUMN IF NOT EXISTS is_all_day boolean,
  ADD COLUMN IF NOT EXISTS visibility text,
  ADD COLUMN IF NOT EXISTS event_category text,  -- renamed from 'eventType' to avoid conflict with 'type'
  ADD COLUMN IF NOT EXISTS keywords jsonb,
  ADD COLUMN IF NOT EXISTS google_updated timestamptz,
  ADD COLUMN IF NOT EXISTS last_synced timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN public.interactions.start_time IS 'Start time for calendar events';
COMMENT ON COLUMN public.interactions.end_time IS 'End time for calendar events';
COMMENT ON COLUMN public.interactions.event_status IS 'Calendar event status (confirmed, tentative, cancelled)';
COMMENT ON COLUMN public.interactions.event_category IS 'Calendar event category/type';

-- Step 2: Populate calendar columns from source_meta for existing calendar_event records
UPDATE public.interactions
SET 
  start_time = (source_meta->>'startTime')::timestamptz,
  end_time = (source_meta->>'endTime')::timestamptz,
  location = source_meta->>'location',
  attendees = source_meta->'attendees',
  event_status = source_meta->>'status',
  time_zone = source_meta->>'timeZone',
  is_all_day = (source_meta->>'isAllDay')::boolean,
  visibility = COALESCE(source_meta->>'visibility', 'default'),
  event_category = source_meta->>'eventType',
  keywords = source_meta->'keywords',
  last_synced = (source_meta->>'lastSynced')::timestamptz
WHERE type = 'calendar_event' 
  AND source_meta IS NOT NULL;

-- Step 3: Add check constraint to ensure calendar events have start/end times
ALTER TABLE public.interactions 
  ADD CONSTRAINT interactions_calendar_times_check 
  CHECK (
    (type = 'calendar_event' AND start_time IS NOT NULL AND end_time IS NOT NULL)
    OR type != 'calendar_event'
  );

-- Step 4: Add indexes for calendar queries
-- Note: These must be run separately outside a transaction using execute_sql
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS interactions_user_start_time_idx 
--   ON public.interactions(user_id, start_time DESC) 
--   WHERE start_time IS NOT NULL;
-- 
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS interactions_attendees_gin 
--   ON public.interactions USING gin(attendees) 
--   WHERE attendees IS NOT NULL;
