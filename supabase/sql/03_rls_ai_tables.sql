-- EMBEDDINGS (owner read-only)
alter table public.embeddings enable row level security;
drop policy if exists embeddings_select_own on public.embeddings;

create policy embeddings_select_own on public.embeddings
  for select to authenticated using (user_id = auth.uid());
-- no insert/update/delete -> only SUPABASE_SECRET_KEY bypassing RLS can write

-- AI_INSIGHTS (owner read-only)
alter table public.ai_insights enable row level security;
drop policy if exists ai_insights_select_own on public.ai_insights;

create policy ai_insights_select_own on public.ai_insights
  for select to authenticated using (user_id = auth.uid());
-- no insert/update/delete
