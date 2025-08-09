-- Extensions
create extension if not exists vector;

-- Embedding column lives in SQL, not Drizzle
alter table public.embeddings
  add column if not exists embedding vector(1536);

-- Vector index (cosine)
create index if not exists embeddings_vec_idx
  on public.embeddings using ivfflat (embedding vector_cosine_ops);
