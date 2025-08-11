-- --------------------------------------------------------------------
-- user sync preferences (minimal schema + RLS)
-- --------------------------------------------------------------------

create table if not exists public.user_sync_prefs (
  user_id                          uuid primary key references auth.users(id),

  -- Gmail controls
  gmail_query                      text   not null default 'category:primary -in:chats -in:drafts newer_than:30d',
  gmail_label_includes             text[] not null default '{}'::text[],
  gmail_label_excludes             text[] not null default '{Promotions,Social,Forums,Updates}'::text[],

  -- Calendar controls
  calendar_include_organizer_self  boolean not null default true,
  calendar_include_private         boolean not null default false,
  calendar_time_window_days        integer not null default 60,

  -- Drive ingestion mode (read-only MVP may ignore; stored for future)
  drive_ingestion_mode             text    not null default 'none' check (drive_ingestion_mode in ('none','picker','folders')),
  drive_folder_ids                 text[]  not null default '{}'::text[],

  created_at                       timestamp not null default now(),
  updated_at                       timestamp not null default now()
);

-- RLS: owner-only read/write
alter table public.user_sync_prefs enable row level security;

drop policy if exists user_sync_prefs_rw_own on public.user_sync_prefs;
create policy user_sync_prefs_rw_own
on public.user_sync_prefs
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());