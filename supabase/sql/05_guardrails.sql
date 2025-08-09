create table if not exists ai_quotas (
  user_id uuid primary key references auth.users(id),
  period_start date not null,
  credits_left int not null
);
alter table ai_quotas enable row level security;
drop policy if exists ai_quotas_rw_own on ai_quotas;
create policy ai_quotas_rw_own on ai_quotas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(8,4) not null default 0,
  created_at timestamp not null default now()
);
alter table ai_usage enable row level security;
drop policy if exists ai_usage_rw_own on ai_usage;
create policy ai_usage_rw_own on ai_usage
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists ai_usage_user_id_idx on ai_usage(user_id);
create index if not exists ai_usage_created_at_idx on ai_usage(created_at desc);
