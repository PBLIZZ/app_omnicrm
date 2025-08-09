-- Drop existing policies for embeddings
drop policy "Embeddings: Delete own" on embeddings;

drop policy "Embeddings: Insert own" on embeddings;

drop policy "Embeddings: Update own" on embeddings;

drop policy "Embeddings: Select own" on embeddings;

-- Drop existing policies for ai_insights
drop policy "AI Insights: Delete own" on ai_insights;

drop policy "AI Insights: Insert own" on ai_insights;

drop policy "AI Insights: Update own" on ai_insights;

drop policy "AI Insights: Select own" on ai_insights;

-- Create SELECT-only policies
create policy "embeddings_select_own" on embeddings for
select
  to authenticated using (user_id = auth.uid ());

create policy "ai_insights_select_own" on ai_insights for
select
  to authenticated using (user_id = auth.uid ());