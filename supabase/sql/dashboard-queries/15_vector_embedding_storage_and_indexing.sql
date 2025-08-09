alter table embeddings
add column if not exists embedding vector (1536);

create index if not exists embeddings_vec_idx on embeddings using ivfflat (embedding vector_cosine_ops);