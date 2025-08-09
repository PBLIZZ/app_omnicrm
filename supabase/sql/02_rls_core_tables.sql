-- CONTACTS
alter table public.contacts enable row level security;
drop policy if exists contacts_select_own on public.contacts;
drop policy if exists contacts_insert_own on public.contacts;
drop policy if exists contacts_update_own on public.contacts;
drop policy if exists contacts_delete_own on public.contacts;

create policy contacts_select_own on public.contacts
  for select to authenticated using (user_id = auth.uid());
create policy contacts_insert_own on public.contacts
  for insert to authenticated with check (user_id = auth.uid());
create policy contacts_update_own on public.contacts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy contacts_delete_own on public.contacts
  for delete to authenticated using (user_id = auth.uid());

-- INTERACTIONS
alter table public.interactions enable row level security;
drop policy if exists interactions_select_own on public.interactions;
drop policy if exists interactions_insert_own on public.interactions;
drop policy if exists interactions_update_own on public.interactions;
drop policy if exists interactions_delete_own on public.interactions;

create policy interactions_select_own on public.interactions
  for select to authenticated using (user_id = auth.uid());
create policy interactions_insert_own on public.interactions
  for insert to authenticated with check (user_id = auth.uid());
create policy interactions_update_own on public.interactions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy interactions_delete_own on public.interactions
  for delete to authenticated using (user_id = auth.uid());

-- RAW_EVENTS
alter table public.raw_events enable row level security;
drop policy if exists raw_events_select_own on public.raw_events;
drop policy if exists raw_events_insert_own on public.raw_events;
drop policy if exists raw_events_update_own on public.raw_events;
drop policy if exists raw_events_delete_own on public.raw_events;

create policy raw_events_select_own on public.raw_events
  for select to authenticated using (user_id = auth.uid());
create policy raw_events_insert_own on public.raw_events
  for insert to authenticated with check (user_id = auth.uid());
create policy raw_events_update_own on public.raw_events
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy raw_events_delete_own on public.raw_events
  for delete to authenticated using (user_id = auth.uid());

-- DOCUMENTS
alter table public.documents enable row level security;
drop policy if exists documents_select_own on public.documents;
drop policy if exists documents_insert_own on public.documents;
drop policy if exists documents_update_own on public.documents;
drop policy if exists documents_delete_own on public.documents;

create policy documents_select_own on public.documents
  for select to authenticated using (user_id = auth.uid());
create policy documents_insert_own on public.documents
  for insert to authenticated with check (user_id = auth.uid());
create policy documents_update_own on public.documents
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy documents_delete_own on public.documents
  for delete to authenticated using (user_id = auth.uid());

-- JOBS
alter table public.jobs enable row level security;
drop policy if exists jobs_select_own on public.jobs;
drop policy if exists jobs_insert_own on public.jobs;
drop policy if exists jobs_update_own on public.jobs;
drop policy if exists jobs_delete_own on public.jobs;

create policy jobs_select_own on public.jobs
  for select to authenticated using (user_id = auth.uid());
create policy jobs_insert_own on public.jobs
  for insert to authenticated with check (user_id = auth.uid());
create policy jobs_update_own on public.jobs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy jobs_delete_own on public.jobs
  for delete to authenticated using (user_id = auth.uid());
