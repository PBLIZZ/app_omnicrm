-- Minimal RLS and policies for core tables
-- Enable RLS
alter table if exists public.contacts enable row level security;
alter table if exists public.raw_events enable row level security;
alter table if exists public.documents enable row level security;
alter table if exists public.interactions enable row level security;
alter table if exists public.embeddings enable row level security;
alter table if exists public.ai_insights enable row level security;
alter table if exists public.jobs enable row level security;
alter table if exists public.threads enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.tool_invocations enable row level security;

-- Generic tenant policies (assumes user_id column exists)
create policy if not exists contacts_tenant_read on public.contacts for select using (auth.uid() = user_id);
create policy if not exists contacts_tenant_write on public.contacts for insert with check (auth.uid() = user_id);
create policy if not exists contacts_tenant_update on public.contacts for update using (auth.uid() = user_id);
create policy if not exists contacts_tenant_delete on public.contacts for delete using (auth.uid() = user_id);

create policy if not exists raw_events_tenant_read on public.raw_events for select using (auth.uid() = user_id);
create policy if not exists raw_events_tenant_write on public.raw_events for insert with check (auth.uid() = user_id);
create policy if not exists raw_events_tenant_update on public.raw_events for update using (auth.uid() = user_id);
create policy if not exists raw_events_tenant_delete on public.raw_events for delete using (auth.uid() = user_id);

create policy if not exists documents_tenant_read on public.documents for select using (auth.uid() = user_id);
create policy if not exists documents_tenant_write on public.documents for insert with check (auth.uid() = user_id);
create policy if not exists documents_tenant_update on public.documents for update using (auth.uid() = user_id);
create policy if not exists documents_tenant_delete on public.documents for delete using (auth.uid() = user_id);

create policy if not exists interactions_tenant_read on public.interactions for select using (auth.uid() = user_id);
create policy if not exists interactions_tenant_write on public.interactions for insert with check (auth.uid() = user_id);
create policy if not exists interactions_tenant_update on public.interactions for update using (auth.uid() = user_id);
create policy if not exists interactions_tenant_delete on public.interactions for delete using (auth.uid() = user_id);

create policy if not exists embeddings_tenant_read on public.embeddings for select using (auth.uid() = user_id);
create policy if not exists embeddings_tenant_write on public.embeddings for insert with check (auth.uid() = user_id);
create policy if not exists embeddings_tenant_update on public.embeddings for update using (auth.uid() = user_id);
create policy if not exists embeddings_tenant_delete on public.embeddings for delete using (auth.uid() = user_id);

create policy if not exists ai_insights_tenant_read on public.ai_insights for select using (auth.uid() = user_id);
create policy if not exists ai_insights_tenant_write on public.ai_insights for insert with check (auth.uid() = user_id);
create policy if not exists ai_insights_tenant_update on public.ai_insights for update using (auth.uid() = user_id);
create policy if not exists ai_insights_tenant_delete on public.ai_insights for delete using (auth.uid() = user_id);

create policy if not exists jobs_tenant_read on public.jobs for select using (auth.uid() = user_id);
create policy if not exists jobs_tenant_write on public.jobs for insert with check (auth.uid() = user_id);
create policy if not exists jobs_tenant_update on public.jobs for update using (auth.uid() = user_id);
create policy if not exists jobs_tenant_delete on public.jobs for delete using (auth.uid() = user_id);

create policy if not exists threads_tenant_read on public.threads for select using (auth.uid() = user_id);
create policy if not exists threads_tenant_write on public.threads for insert with check (auth.uid() = user_id);
create policy if not exists threads_tenant_update on public.threads for update using (auth.uid() = user_id);
create policy if not exists threads_tenant_delete on public.threads for delete using (auth.uid() = user_id);

create policy if not exists messages_tenant_read on public.messages for select using (auth.uid() = user_id);
create policy if not exists messages_tenant_write on public.messages for insert with check (auth.uid() = user_id);
create policy if not exists messages_tenant_update on public.messages for update using (auth.uid() = user_id);
create policy if not exists messages_tenant_delete on public.messages for delete using (auth.uid() = user_id);

create policy if not exists toolinv_tenant_read on public.tool_invocations for select using (auth.uid() = user_id);
create policy if not exists toolinv_tenant_write on public.tool_invocations for insert with check (auth.uid() = user_id);
create policy if not exists toolinv_tenant_update on public.tool_invocations for update using (auth.uid() = user_id);
create policy if not exists toolinv_tenant_delete on public.tool_invocations for delete using (auth.uid() = user_id);


