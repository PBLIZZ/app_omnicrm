-- =========================
-- 37_backup_calendar_events_table.sql
-- Phase 3: Rename calendar_events table as backup (keep for 1 week)
-- Safe to drop after 2025-10-13
-- =========================

-- Rename table instead of dropping (safety measure)
ALTER TABLE calendar_events RENAME TO calendar_events_backup_20251006;

-- Add comment
COMMENT ON TABLE calendar_events_backup_20251006 IS 
  'Backup of calendar_events table. Migrated to interactions on 2025-10-06. Safe to drop after 2025-10-13.';
