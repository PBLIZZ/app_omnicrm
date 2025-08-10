-- =========================
-- 06_sync_prefs_and_audit.sql
-- User-set filters for Gmail/Calendar/Drive + audit trail.
-- =========================

-- Per-user sync/ingestion preferences (defaults are privacy-first)
create table if not exists public.user_sync_prefs (
  user_id                         uuid primary key references auth.users(id),
  gmail_query                     text    not null default 'category:primary -in:chats -in:drafts newer_than:30d',
  gmail_label_includes            text[]  not null default '{}',
  gmail_label_excludes            text[]  not null default '{Promotions,Social,Forums,Updates}',
  calendar_include_organizer_self boolean not null default true,
  calendar_include_private        boolean not null default false,
  calendar_time_window_days       integer not null default 60,
  drive_ingestion_mode            text    not null default 'none',   -- 'none' | 'picker' | 'folders'
  drive_folder_ids                text[]  not null default '{}',
  created_at                      timestamp not null default now(),
  updated_at                      timestamp not null default now()
);

alter table public.user_sync_prefs enable row level security;
drop policy if exists user_sync_prefs_select_own on public.user_sync_prefs;
drop policy if exists user_sync_prefs_upsert_own on public.user_sync_prefs;

create policy user_sync_prefs_select_own on public.user_sync_prefs
  for select to authenticated using (user_id = auth.uid());
-- allow insert/update via same policy name (upsert pattern)
create policy user_sync_prefs_upsert_own on public.user_sync_prefs
  for insert to authenticated with check (user_id = auth.uid());
create policy user_sync_prefs_update_own on public.user_sync_prefs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sync/audit log (preview, approve, undo)
create table if not exists public.sync_audit (
  id        uuid primary key default gen_random_uuid() not null,
  user_id   uuid not null references auth.users(id),
  provider  text not null,                   -- 'gmail' | 'calendar' | 'drive'
  action    text not null,                   -- 'preview' | 'approve' | 'undo'
  payload   jsonb,
  created_at timestamp not null default now()
);

create index if not exists sync_audit_user_id_idx on public.sync_audit(user_id);

alter table public.sync_audit enable row level security;
drop policy if exists sync_audit_select_own on public.sync_audit;
drop policy if exists sync_audit_insert_own on public.sync_audit;

create policy sync_audit_select_own on public.sync_audit
  for select to authenticated using (user_id = auth.uid());
create policy sync_audit_insert_own on public.sync_audit
  for insert to authenticated with check (user_id = auth.uid());
