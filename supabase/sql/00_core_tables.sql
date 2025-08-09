-- Core application tables (idempotent where possible)
-- Source: derived from prior Drizzle migrations 0000/0001

-- AI insights
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid() not null,
  subject_type text not null,
  subject_id uuid,
  kind text not null,
  content jsonb not null,
  model text,
  created_at timestamp not null default now()
);

-- Contacts
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid() not null,
  display_name text not null,
  primary_email text,
  primary_phone text,
  source text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid() not null,
  owner_contact_id uuid,
  title text,
  mime text,
  text text,
  meta jsonb,
  created_at timestamp not null default now()
);

-- Embeddings
create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid() not null,
  owner_type text not null,
  owner_id uuid not null,
  meta jsonb,
  created_at timestamp not null default now()
);

-- Interactions
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

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid() not null,
  kind text not null,
  payload jsonb not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Raw events
create table if not exists public.raw_events (
  id uuid primary key default gen_random_uuid() not null,
  provider text not null,
  payload jsonb not null,
  contact_id uuid,
  occurred_at timestamp not null,
  created_at timestamp not null default now()
);

-- FKs
alter table public.interactions
  add constraint interactions_contact_id_contacts_id_fk
  foreign key (contact_id) references public.contacts (id);

-- Indexes
create index if not exists interactions_contact_timeline_idx
  on public.interactions using btree (contact_id, occurred_at desc);

create index if not exists raw_events_provider_timeline_idx
  on public.raw_events using btree (provider, occurred_at);


