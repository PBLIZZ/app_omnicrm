-- ====================================================================
-- Add Token Labels for Better Management
-- ====================================================================
-- This migration adds a label field to onboarding tokens so users can
-- identify which tokens they sent to which clients for follow-up.

-- Add label field to onboarding_tokens table
ALTER TABLE public.onboarding_tokens 
ADD COLUMN IF NOT EXISTS label TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.onboarding_tokens.label IS 'User-friendly label to identify the token purpose (e.g., "Client Intake - John Smith")';

-- Create index for better performance on label queries
CREATE INDEX IF NOT EXISTS onboarding_tokens_label_idx ON public.onboarding_tokens(label);

RAISE NOTICE 'SUCCESS: Token labels added to onboarding_tokens table.';
