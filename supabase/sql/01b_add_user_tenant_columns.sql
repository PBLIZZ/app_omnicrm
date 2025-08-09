-- Add user_id tenant columns and indexes (idempotent)

alter table public.ai_insights
  add column if not exists user_id uuid not null references auth.users(id);
create index if not exists ai_insights_user_id_idx on public.ai_insights (user_id);

alter table public.contacts
  add column if not exists user_id uuid not null references auth.users(id);
create index if not exists contacts_user_id_idx on public.contacts (user_id);

alter table public.documents
  add column if not exists user_id uuid not null references auth.users(id);
create index if not exists documents_user_id_idx on public.documents (user_id);

alter table public.embeddings
  add column if not exists user_id uuid not null references auth.users(id);
create index if not exists embeddings_user_id_idx on public.embeddings (user_id);

alter table public.interactions
  add column if not exists user_id uuid not null references auth.users(id);
create index if not exists interactions_user_id_idx on public.interactions (user_id);

alter table public.jobs
  add column if not exists user_id uuid not null references auth.users(id);
create index if not exists jobs_user_id_idx on public.jobs (user_id);

alter table public.raw_events
  add column if not exists user_id uuid not null references auth.users(id);
create index if not exists raw_events_user_id_idx on public.raw_events (user_id);


