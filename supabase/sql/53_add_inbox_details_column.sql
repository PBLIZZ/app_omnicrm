-- Add missing details column to inbox_items table
-- This fixes the mismatch between Drizzle schema and database schema

ALTER TABLE public.inbox_items 
ADD COLUMN IF NOT EXISTS details JSONB;

-- Add comment for clarity
COMMENT ON COLUMN public.inbox_items.details IS 'Additional metadata and processing details for inbox items';




