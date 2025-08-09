create table public.user_integrations (
  user_id UUID not null references public.users (id),
  provider TEXT not null,
  access_token TEXT not null,
  refresh_token TEXT,
  expiry_date timestamp with time zone,
  created_at timestamp with time zone default NOW() not null,
  updated_at timestamp with time zone default NOW() not null,
  primary key (user_id, provider)
);

-- Create an index on the user_id for performance
create index idx_user_integrations_user_id on public.user_integrations (user_id);

-- Enable Row Level Security
alter table public.user_integrations ENABLE row LEVEL SECURITY;

-- Create RLS policies
create policy "user_integrations_select_own" on user_integrations for
select
  to authenticated using (user_id = auth.uid ());

create policy "user_integrations_insert_own" on user_integrations for INSERT to authenticated
with
  check (user_id = auth.uid ());

create policy "user_integrations_update_own" on user_integrations
for update
  to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "user_integrations_delete_own" on user_integrations for DELETE to authenticated using (user_id = auth.uid ());