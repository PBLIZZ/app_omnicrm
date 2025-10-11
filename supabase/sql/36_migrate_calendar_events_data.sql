-- =========================
-- 36_migrate_calendar_events_data.sql
-- Phase 2: Migrate data from calendar_events table to interactions table
-- =========================

-- Migrate calendar_events to interactions
INSERT INTO interactions (
  user_id, type, subject, body_text, occurred_at,
  source, source_id, source_meta,
  start_time, end_time, location, attendees,
  event_status, time_zone, is_all_day, visibility,
  event_category, keywords, google_updated, last_synced,
  created_at
)
SELECT 
  user_id,
  'calendar_event' as type,
  title as subject,
  description as body_text,
  start_time as occurred_at,  -- Use start_time as the occurrence time
  'google_calendar' as source,
  google_event_id as source_id,
  jsonb_build_object('migrated_from', 'calendar_events') as source_meta,
  start_time,
  end_time,
  location,
  attendees,
  status as event_status,
  time_zone,
  is_all_day,
  visibility,
  event_type as event_category,  -- Map eventType to event_category
  keywords,
  google_updated,
  last_synced,
  created_at
FROM calendar_events
ON CONFLICT (user_id, source, source_id) DO NOTHING;  -- Skip duplicates if any

-- Verify migration
SELECT 
  'calendar_events' as source_table,
  COUNT(*) as count 
FROM calendar_events
UNION ALL
SELECT 
  'interactions (calendar type)' as source_table,
  COUNT(*) as count 
FROM interactions 
WHERE type = 'calendar_event';
