-- =========================
-- 05_user_integrations.sql
-- Store OAuth tokens per user/provider.
-- =========================

create table if not exists public.user_integrations (
  user_id      uuid not null references auth.users(id),
  provider     text not null,                          -- 'google'
  access_token text not null,                          -- store app-encrypted value
  refresh_token text,                                  -- store app-encrypted value
  expiry_date  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, provider)
);

create index if not exists idx_user_integrations_user_id on public.user_integrations(user_id);

alter table public.user_integrations enable row level security;

drop policy if exists user_integrations_select_own on public.user_integrations;
drop policy if exists user_integrations_insert_own on public.user_integrations;
drop policy if exists user_integrations_update_own on public.user_integrations;
drop policy if exists user_integrations_delete_own on public.user_integrations;

create policy user_integrations_select_own on public.user_integrations
  for select to authenticated using (user_id = auth.uid());
create policy user_integrations_insert_own on public.user_integrations
  for insert to authenticated with check (user_id = auth.uid());
create policy user_integrations_update_own on public.user_integrations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_integrations_delete_own on public.user_integrations
  for delete to authenticated using (user_id = auth.uid());
