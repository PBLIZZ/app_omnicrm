-- Enable RLS on all tables
alter table interactions ENABLE row LEVEL SECURITY;

alter table raw_events ENABLE row LEVEL SECURITY;

alter table documents ENABLE row LEVEL SECURITY;

alter table embeddings ENABLE row LEVEL SECURITY;

alter table ai_insights ENABLE row LEVEL SECURITY;

alter table jobs ENABLE row LEVEL SECURITY;

-- Create policies for each table
-- Interactions
create policy "Interactions: Select own" on interactions for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Interactions: Insert own" on interactions for INSERT to authenticated
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Interactions: Update own" on interactions
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Interactions: Delete own" on interactions for DELETE to authenticated using (
  (
    select
      auth.uid ()
  ) = user_id
);

-- Raw Events
create policy "Raw Events: Select own" on raw_events for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Raw Events: Insert own" on raw_events for INSERT to authenticated
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Raw Events: Update own" on raw_events
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Raw Events: Delete own" on raw_events for DELETE to authenticated using (
  (
    select
      auth.uid ()
  ) = user_id
);

-- Documents
create policy "Documents: Select own" on documents for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Documents: Insert own" on documents for INSERT to authenticated
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Documents: Update own" on documents
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Documents: Delete own" on documents for DELETE to authenticated using (
  (
    select
      auth.uid ()
  ) = user_id
);

-- Embeddings
create policy "Embeddings: Select own" on embeddings for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Embeddings: Insert own" on embeddings for INSERT to authenticated
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Embeddings: Update own" on embeddings
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Embeddings: Delete own" on embeddings for DELETE to authenticated using (
  (
    select
      auth.uid ()
  ) = user_id
);

-- AI Insights
create policy "AI Insights: Select own" on ai_insights for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "AI Insights: Insert own" on ai_insights for INSERT to authenticated
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "AI Insights: Update own" on ai_insights
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "AI Insights: Delete own" on ai_insights for DELETE to authenticated using (
  (
    select
      auth.uid ()
  ) = user_id
);

-- Jobs
create policy "Jobs: Select own" on jobs for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Jobs: Insert own" on jobs for INSERT to authenticated
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Jobs: Update own" on jobs
for update
  to authenticated using (
    (
      select
        auth.uid ()
    ) = user_id
  )
with
  check (
    (
      select
        auth.uid ()
    ) = user_id
  );

create policy "Jobs: Delete own" on jobs for DELETE to authenticated using (
  (
    select
      auth.uid ()
  ) = user_id
);

-- Optional: Indexes for performance (you already have these)
create index IF not exists interactions_user_id_idx on interactions (user_id);

create index IF not exists raw_events_user_id_idx on raw_events (user_id);

create index IF not exists documents_user_id_idx on documents (user_id);

create index IF not exists embeddings_user_id_idx on embeddings (user_id);

create index IF not exists ai_insights_user_id_idx on ai_insights (user_id);

create index IF not exists jobs_user_id_idx on jobs (user_id);