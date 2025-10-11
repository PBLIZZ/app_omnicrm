// ===== 4. DATABASE SCHEMA (SQL for Supabase) =====

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table for semantic search
CREATE TABLE document_embeddings (
  id BIGSERIAL PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'client', 'appointment', 'task', 'note', etc.
  content_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- text-embedding-3-small uses 1536 dimensions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX document_embeddings_embedding_idx 
ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create semantic search function
CREATE OR REPLACE FUNCTION semantic_search(
  query_embedding vector(512),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  content_type text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.content_type,
    document_embeddings.title,
    document_embeddings.content,
    document_embeddings.metadata,
    (1 - (document_embeddings.embedding <=> query_embedding)) as similarity
  FROM document_embeddings
  WHERE (1 - (document_embeddings.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
