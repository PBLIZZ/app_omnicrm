-- =========================
-- 23_enhanced_sync_preferences.sql
-- Enhanced sync preferences for comprehensive sync system
-- Adds new fields to user_sync_prefs table for Phase 3 implementation
-- =========================

-- Add new columns to user_sync_prefs table for enhanced preferences
ALTER TABLE user_sync_prefs
ADD COLUMN IF NOT EXISTS gmail_time_range_days INTEGER DEFAULT 365 CHECK (gmail_time_range_days >= 1 AND gmail_time_range_days <= 365),
ADD COLUMN IF NOT EXISTS calendar_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS calendar_future_days INTEGER DEFAULT 90 CHECK (calendar_future_days >= 0 AND calendar_future_days <= 90),
ADD COLUMN IF NOT EXISTS drive_max_size_mb INTEGER DEFAULT 5 CHECK (drive_max_size_mb >= 1 AND drive_max_size_mb <= 5),
ADD COLUMN IF NOT EXISTS initial_sync_completed BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS initial_sync_date TIMESTAMPTZ DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_sync_prefs.gmail_time_range_days IS 'Number of days back to sync Gmail (1-365, one-time setting)';
COMMENT ON COLUMN user_sync_prefs.calendar_ids IS 'Array of selected Google Calendar IDs to sync';
COMMENT ON COLUMN user_sync_prefs.calendar_future_days IS 'Number of days forward to sync Calendar events (0-90)';
COMMENT ON COLUMN user_sync_prefs.drive_max_size_mb IS 'Maximum file size in MB for Drive sync (1-5)';
COMMENT ON COLUMN user_sync_prefs.initial_sync_completed IS 'Whether the initial sync has been completed (prevents re-modification)';
COMMENT ON COLUMN user_sync_prefs.initial_sync_date IS 'Timestamp when initial sync was completed';

-- Create index for efficient queries on initial sync status
CREATE INDEX IF NOT EXISTS idx_user_sync_prefs_initial_sync ON user_sync_prefs(user_id, initial_sync_completed);
