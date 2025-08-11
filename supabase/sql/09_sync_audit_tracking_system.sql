-- Table
create table if not exists public.sync_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  provider text not null,             -- e.g. 'google'
  action   text not null,             -- e.g. 'oauth_init' | 'preview' | 'approve' | 'runner'
  payload  jsonb,
  created_at timestamp not null default now()
);

-- Indexes
create index if not exists sync_audit_user_created_idx
  on public.sync_audit (user_id, created_at desc);

-- RLS
alter table public.sync_audit enable row level security;

drop policy if exists sync_audit_rw_own on public.sync_audit;
create policy sync_audit_rw_own
on public.sync_audit
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());