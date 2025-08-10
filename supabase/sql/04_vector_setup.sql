-- =========================
-- 04_vector_setup.sql
-- Enable pgvector and add the vector column + ANN index.
-- =========================

-- Extension
create extension if not exists vector;

-- Add vector column to embeddings (idempotent)
alter table public.embeddings
  add column if not exists embedding vector(1536);

-- ANN index (cosine)
create index if not exists embeddings_vec_idx
  on public.embeddings using ivfflat (embedding vector_cosine_ops);
