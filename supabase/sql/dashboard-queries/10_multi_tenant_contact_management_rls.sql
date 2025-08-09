-- add tenant column (nullable first so you can backfill)
alter table contacts
add column user_id uuid references auth.users (id);

-- index it (important for performance)
create index IF not exists contacts_user_id_idx on contacts (user_id);

-- enable RLS
alter table contacts ENABLE row LEVEL SECURITY;

-- policies
create policy "contacts_select_own" on contacts for
select
  to authenticated using (user_id = auth.uid ());

create policy "contacts_insert_own" on contacts for INSERT to authenticated
with
  check (user_id = auth.uid ());

create policy "contacts_update_own" on contacts
for update
  to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy "contacts_delete_own" on contacts for DELETE to authenticated using (user_id = auth.uid ());