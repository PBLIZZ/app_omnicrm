-- THREADS
alter table public.threads enable row level security;
drop policy if exists threads_select_own on public.threads;
drop policy if exists threads_insert_own on public.threads;
drop policy if exists threads_update_own on public.threads;
drop policy if exists threads_delete_own on public.threads;

create policy threads_select_own on public.threads
  for select to authenticated using (user_id = auth.uid());
create policy threads_insert_own on public.threads
  for insert to authenticated with check (user_id = auth.uid());
create policy threads_update_own on public.threads
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy threads_delete_own on public.threads
  for delete to authenticated using (user_id = auth.uid());

-- MESSAGES
alter table public.messages enable row level security;
drop policy if exists messages_select_own on public.messages;
drop policy if exists messages_insert_own on public.messages;
drop policy if exists messages_update_own on public.messages;
drop policy if exists messages_delete_own on public.messages;

create policy messages_select_own on public.messages
  for select to authenticated using (user_id = auth.uid());
create policy messages_insert_own on public.messages
  for insert to authenticated with check (user_id = auth.uid());
create policy messages_update_own on public.messages
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy messages_delete_own on public.messages
  for delete to authenticated using (user_id = auth.uid());

-- TOOL_INVOCATIONS
alter table public.tool_invocations enable row level security;
drop policy if exists toolinv_select_own on public.tool_invocations;
drop policy if exists toolinv_insert_own on public.tool_invocations;
drop policy if exists toolinv_update_own on public.tool_invocations;
drop policy if exists toolinv_delete_own on public.tool_invocations;

create policy toolinv_select_own on public.tool_invocations
  for select to authenticated using (user_id = auth.uid());
create policy toolinv_insert_own on public.tool_invocations
  for insert to authenticated with check (user_id = auth.uid());
create policy toolinv_update_own on public.tool_invocations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy toolinv_delete_own on public.tool_invocations
  for delete to authenticated using (user_id = auth.uid());
