-- THREADS
create table if not exists threads (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id),
  title text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

alter table threads enable row level security;

create index if not exists threads_user_id_idx on threads (user_id);

create policy "threads_select_own" on threads for
select
  to authenticated using (user_id = auth.uid ());

create policy "threads_insert_own" on threads for insert to authenticated
with
  check (user_id = auth.uid ());

create policy "threads_update_own" on threads
for update
  to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "threads_delete_own" on threads for delete to authenticated using (user_id = auth.uid ());

-- MESSAGES
create table if not exists messages (
  id uuid primary key default gen_random_uuid (),
  thread_id uuid not null references threads (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  role text not null check (role in ('user', 'assistant', 'tool')),
  content jsonb not null,
  created_at timestamp not null default now()
);

alter table messages enable row level security;

create index if not exists messages_thread_id_idx on messages (thread_id);

create index if not exists messages_user_id_idx on messages (user_id);

create policy "messages_select_own" on messages for
select
  to authenticated using (user_id = auth.uid ());

create policy "messages_insert_own" on messages for insert to authenticated
with
  check (user_id = auth.uid ());

create policy "messages_update_own" on messages
for update
  to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "messages_delete_own" on messages for delete to authenticated using (user_id = auth.uid ());

-- TOOL INVOCATIONS
create table if not exists tool_invocations (
  id uuid primary key default gen_random_uuid (),
  message_id uuid not null references messages (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  tool text not null,
  args jsonb not null,
  result jsonb,
  latency_ms integer,
  created_at timestamp not null default now()
);

alter table tool_invocations enable row level security;

create index if not exists tool_invocations_user_id_idx on tool_invocations (user_id);

create index if not exists tool_invocations_message_id_idx on tool_invocations (message_id);

create policy "toolinv_select_own" on tool_invocations for
select
  to authenticated using (user_id = auth.uid ());

create policy "toolinv_insert_own" on tool_invocations for insert to authenticated
with
  check (user_id = auth.uid ());

create policy "toolinv_update_own" on tool_invocations
for update
  to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "toolinv_delete_own" on tool_invocations for delete to authenticated using (user_id = auth.uid ());