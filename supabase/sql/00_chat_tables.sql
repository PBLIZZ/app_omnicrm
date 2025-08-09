-- Chat tables (threads, messages, tool_invocations)

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid() not null,
  user_id uuid not null references auth.users(id),
  title text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists threads_user_id_idx on public.threads (user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid() not null,
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('user','assistant','tool')),
  content jsonb not null,
  created_at timestamp not null default now()
);

create index if not exists messages_thread_id_idx on public.messages (thread_id);
create index if not exists messages_user_id_idx on public.messages (user_id);

create table if not exists public.tool_invocations (
  id uuid primary key default gen_random_uuid() not null,
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  tool text not null,
  args jsonb not null,
  result jsonb,
  latency_ms integer,
  created_at timestamp not null default now()
);

create index if not exists tool_invocations_user_id_idx on public.tool_invocations (user_id);
create index if not exists tool_invocations_message_id_idx on public.tool_invocations (message_id);


