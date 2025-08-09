-- embeddings
create policy if not exists "embeddings_select_own" on embeddings for
select
  to authenticated using (user_id = auth.uid ());

-- no insert/update/delete policies -> only SUPABASE_SECRET_KEY may write
-- ai_insights
create policy if not exists "ai_insights_select_own" on ai_insights for
select
  to authenticated using (user_id = auth.uid ());

-- no insert/update/delete