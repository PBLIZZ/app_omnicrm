-- =========================
-- 42_consolidate_sync_and_error_tables.sql
-- CONSOLIDATE Sync, Preferences, and Error Tables
-- Description: Merges sync preferences into user_integrations, and deprecates
-- the sync_sessions, sync_audit, and raw_event_errors tables in favor of the
-- new, more robust 'jobs' table.
-- =========================

-- Step 1: Add a 'config' column to user_integrations to hold all sync settings.
-- This column will store sync preferences, last sync timestamps, etc.
ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Step 2: Migrate existing sync preferences into the new 'config' column.
-- We will create a JSON object from the user_sync_prefs table and store it
-- on the primary 'auth' integration record for that user.
UPDATE public.user_integrations AS ui
SET
  config = jsonb_build_object(
    'calendar_include_organizer_self', usp.calendar_include_organizer_self,
    'calendar_include_private', usp.calendar_include_private,
    'calendar_time_window_days', usp.calendar_time_window_days,
    'drive_ingestion_mode', usp.drive_ingestion_mode,
    'drive_folder_ids', usp.drive_folder_ids,
    'gmail_time_range_days', usp.gmail_time_range_days,
    'calendar_ids', usp.calendar_ids,
    'calendar_future_days', usp.calendar_future_days,
    'drive_max_size_mb', usp.drive_max_size_mb,
    'initial_sync_completed', usp.initial_sync_completed,
    'initial_sync_date', usp.initial_sync_date
  )
FROM public.user_sync_prefs AS usp
WHERE
  ui.user_id = usp.user_id
  AND ui.provider = 'google'
  AND ui.service = 'auth';

-- Step 3: Drop the now-obsolete tables.
-- Their functionality is now fully covered by user_integrations.config and the jobs table.
DROP TABLE IF EXISTS public.user_sync_prefs CASCADE;
DROP TABLE IF EXISTS public.sync_sessions CASCADE;
DROP TABLE IF EXISTS public.sync_audit CASCADE;
DROP TABLE IF EXISTS public.raw_event_errors CASCADE;

-- Add comments to document the changes.
COMMENT ON COLUMN public.user_integrations.config IS 'Stores all integration-specific configurations, including sync preferences, last sync timestamps, and other settings. Migrated from user_sync_prefs on 2025-10-07.';
COMMENT ON TABLE public.jobs IS 'Single source of truth for all background processing, replacing sync_sessions and sync_audit. Errors are logged in the last_error and result columns.';
