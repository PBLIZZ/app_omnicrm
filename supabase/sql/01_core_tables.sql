-- =========================
-- 01_core_tables.sql
-- Core app data model (idempotent)
-- Solo-tenant model: every row scoped by user_id -> auth.users(id)
-- =========================

-- 0) (Optional) ensure extension you'll need later
-- create extension if not exists "uuid-ossp";

-- 1) AI insights
create table if not exists public.ai_insights (
  id          uuid primary key default gen_random_uuid() not null,
  user_id     uuid not null references auth.users(id),
  subject_type text not null,             -- contact | segment | inbox
  subject_id  uuid,
  kind        text not null,              -- summary | next_step | risk | persona
  content     jsonb not null,             -- structured LLM output
  model       text,
  created_at  timestamp not null default now()
);

-- 2) Contacts
create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid() not null,
  user_id       uuid not null references auth.users(id),
  display_name  text not null,
  primary_email text,
  primary_phone text,
  source        text,                     -- gmail_import | manual | upload
  created_at    timestamp not null default now(),
  updated_at    timestamp not null default now()
);

-- 3) Documents (extracted text from uploads/drive)
create table if not exists public.documents (
  id               uuid primary key default gen_random_uuid() not null,
  user_id          uuid not null references auth.users(id),
  owner_contact_id uuid,
  title            text,
  mime             text,
  text             text,                  -- extracted body text
  meta             jsonb,                 -- filename, size, provider ids, etc.
  created_at       timestamp not null default now()
);

-- 4) Embeddings (metadata only here; vector column will be added in a later script)
create table if not exists public.embeddings (
  id          uuid primary key default gen_random_uuid() not null,
  user_id     uuid not null references auth.users(id),
  owner_type  text not null,              -- interaction | document | contact
  owner_id    uuid not null,              -- FK by convention to the owner table
  meta        jsonb,                      -- chunk no., model, token counts
  created_at  timestamp not null default now()
);

-- 5) Interactions (normalized timeline: emails, meetings, notes)
create table if not exists public.interactions (
  id          uuid primary key default gen_random_uuid() not null,
  user_id     uuid not null references auth.users(id),
  contact_id  uuid references public.contacts(id),
  type        text not null,              -- email | call | meeting | note | web
  subject     text,
  body_text   text,
  body_raw    jsonb,                      -- lossless snippet/provider payload
  occurred_at timestamp not null,
  source      text,                       -- gmail | calendar | manual
  source_id   text,                       -- provider message/event id
  source_meta jsonb,                      -- labels, matched query, fetchedAt...
  batch_id    uuid,                       -- for undo imports
  created_at  timestamp not null default now()
);

-- 6) Jobs (simple queue for background work)
create table if not exists public.jobs (
  id         uuid primary key default gen_random_uuid() not null,
  user_id    uuid not null references auth.users(id),
  kind       text not null,               -- normalize | embed | insight | sync_*
  payload    jsonb not null,
  status     text not null default 'queued',
  attempts   integer not null default 0,
  batch_id   uuid,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- 7) Raw events (lossless ingestion store)
create table if not exists public.raw_events (
  id          uuid primary key default gen_random_uuid() not null,
  user_id     uuid not null references auth.users(id),
  provider    text not null,              -- gmail | calendar | drive | upload
  payload     jsonb not null,
  contact_id  uuid,
  occurred_at timestamp not null,
  source_meta jsonb,
  batch_id    uuid,
  created_at  timestamp not null default now()
);

-- Indexes (performance)
create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists interactions_user_id_idx on public.interactions(user_id);
create index if not exists interactions_contact_timeline_idx on public.interactions(contact_id, occurred_at desc);
create index if not exists raw_events_user_id_idx on public.raw_events(user_id);
create index if not exists raw_events_provider_timeline_idx on public.raw_events(provider, occurred_at);
create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists embeddings_user_id_idx on public.embeddings(user_id);
create index if not exists ai_insights_user_id_idx on public.ai_insights(user_id);
create index if not exists jobs_user_id_idx on public.jobs(user_id);
