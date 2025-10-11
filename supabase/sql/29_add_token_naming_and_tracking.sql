-- Add naming and tracking fields to onboarding tokens
-- This migration adds fields for better token management and analytics

-- Add name/label field to onboarding_tokens
ALTER TABLE public.onboarding_tokens 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add tracking fields for analytics
ALTER TABLE public.onboarding_tokens 
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS access_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS submission_count INTEGER NOT NULL DEFAULT 0;

-- Create index for better performance on tracking queries
CREATE INDEX IF NOT EXISTS onboarding_tokens_name_idx ON public.onboarding_tokens(name);
CREATE INDEX IF NOT EXISTS onboarding_tokens_last_accessed_idx ON public.onboarding_tokens(last_accessed_at);

-- Add comment to explain the new fields
COMMENT ON COLUMN public.onboarding_tokens.name IS 'User-friendly name for the token (e.g., "Client Intake - John Smith")';
COMMENT ON COLUMN public.onboarding_tokens.description IS 'Optional description of the token purpose';
COMMENT ON COLUMN public.onboarding_tokens.last_accessed_at IS 'When the token was last accessed (clicked)';
COMMENT ON COLUMN public.onboarding_tokens.access_count IS 'Total number of times the token has been accessed';
COMMENT ON COLUMN public.onboarding_tokens.submission_count IS 'Total number of successful form submissions';

-- Create function to increment access count
CREATE OR REPLACE FUNCTION increment_access_count(token_value TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Get current access count
  SELECT access_count INTO current_count
  FROM public.onboarding_tokens
  WHERE token = token_value;
  
  -- Return incremented count (will be used in UPDATE)
  RETURN COALESCE(current_count, 0) + 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment submission count
CREATE OR REPLACE FUNCTION increment_submission_count(token_value TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Get current submission count
  SELECT submission_count INTO current_count
  FROM public.onboarding_tokens
  WHERE token = token_value;
  
  -- Return incremented count (will be used in UPDATE)
  RETURN COALESCE(current_count, 0) + 1;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE 'SUCCESS: Added naming and tracking fields to onboarding tokens.';
