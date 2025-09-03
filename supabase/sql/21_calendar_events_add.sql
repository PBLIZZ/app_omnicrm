-- Add missing columns that your repo/services reference
alter table public.calendar_events
  add column if not exists time_zone text,
  add column if not exists is_all_day boolean default false,
  add column if not exists visibility text,
  add column if not exists event_type text,
  add column if not exists business_category text,
  add column if not exists keywords jsonb,
  add column if not exists google_updated timestamptz,
  add column if not exists last_synced timestamptz;

-- Backfill minimal sane defaults (optional but helpful)
update public.calendar_events
set
  time_zone = coalesce(time_zone, 'UTC'),
  is_all_day = coalesce(is_all_day, false),
  visibility = coalesce(visibility, 'default'),
  last_synced = coalesce(last_synced, now()),
  google_updated = coalesce(google_updated, updated_at)
where
  time_zone is null
  or is_all_day is null
  or visibility is null
  or last_synced is null
  or google_updated is null;