-- Rebuild schema safely in dependency order (safe baseline)
-- Note: Supabase provides auth.users; we do not create it here.

-- 1) Extensions
create extension if not exists vector;

-- 2) Core tables (no user_id yet)
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid() not null,
  display_name text not null,
  primary_email text,
  primary_phone text,
  source text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.raw_events (
  id uuid primary key default gen_random_uuid() not null,
  provider text not null,
  payload jsonb not null,
  contact_id uuid,
  occurred_at timestamp not null,
  created_at timestamp not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid() not null,
  owner_contact_id uuid,
  title text,
  mime text,
  text text,
  meta jsonb,
  created_at timestamp not null default now()
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid() not null,
  contact_id uuid,
  type text not null,
  subject text,
  body_text text,
  body_raw jsonb,
  occurred_at timestamp not null,
  source text,
  source_id text,
  created_at timestamp not null default now()
);

create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid() not null,
  owner_type text not null,
  owner_id uuid not null,
  meta jsonb,
  created_at timestamp not null default now()
);

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid() not null,
  subject_type text not null,
  subject_id uuid,
  kind text not null,
  content jsonb not null,
  model text,
  created_at timestamp not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid() not null,
  kind text not null,
  payload jsonb not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- 3) Add tenant user_id columns + indexes (FK to auth.users)
alter table public.contacts   add column if not exists user_id uuid not null references auth.users(id);
create index if not exists contacts_user_id_idx on public.contacts (user_id);

alter table public.raw_events add column if not exists user_id uuid not null references auth.users(id);
create index if not exists raw_events_user_id_idx on public.raw_events (user_id);

alter table public.documents  add column if not exists user_id uuid not null references auth.users(id);
create index if not exists documents_user_id_idx on public.documents (user_id);

alter table public.interactions add column if not exists user_id uuid not null references auth.users(id);
create index if not exists interactions_user_id_idx on public.interactions (user_id);

alter table public.embeddings add column if not exists user_id uuid not null references auth.users(id);
create index if not exists embeddings_user_id_idx on public.embeddings (user_id);

alter table public.ai_insights add column if not exists user_id uuid not null references auth.users(id);
create index if not exists ai_insights_user_id_idx on public.ai_insights (user_id);

alter table public.jobs add column if not exists user_id uuid not null references auth.users(id);
create index if not exists jobs_user_id_idx on public.jobs (user_id);

-- 4) FK between app tables
alter table public.interactions
  add constraint if not exists interactions_contact_id_contacts_id_fk
  foreign key (contact_id) references public.contacts(id);

-- 5) Chat tables
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

-- 6) Additional indexes
create index if not exists interactions_contact_timeline_idx
  on public.interactions using btree (contact_id, occurred_at desc);

create index if not exists interactions_user_contact_time_idx
  on public.interactions using btree (user_id, contact_id, occurred_at desc);

create index if not exists raw_events_provider_timeline_idx
  on public.raw_events using btree (provider, occurred_at);

create index if not exists raw_events_user_provider_time_idx
  on public.raw_events using btree (user_id, provider, occurred_at);

create index if not exists ai_insights_user_subject_time_idx
  on public.ai_insights using btree (user_id, subject_type, subject_id, created_at desc);

-- 7) Vector column + index
alter table public.embeddings add column if not exists embedding vector(1536);
create index if not exists embeddings_vec_idx
  on public.embeddings using ivfflat (embedding vector_cosine_ops);


