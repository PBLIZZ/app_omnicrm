alter table interactions
add column user_id uuid not null references auth.users (id);

alter table raw_events
add column user_id uuid not null references auth.users (id);

alter table documents
add column user_id uuid not null references auth.users (id);

alter table embeddings
add column user_id uuid not null references auth.users (id);

alter table ai_insights
add column user_id uuid not null references auth.users (id);

alter table jobs
add column user_id uuid not null references auth.users (id);

-- Create indexes for RLS performance
create index interactions_user_id_idx on interactions (user_id);

create index raw_events_user_id_idx on raw_events (user_id);

create index documents_user_id_idx on documents (user_id);

create index embeddings_user_id_idx on embeddings (user_id);

create index ai_insights_user_id_idx on ai_insights (user_id);

create index jobs_user_id_idx on jobs (user_id);