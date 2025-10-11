-- Migration 46: ADD contact_extraction_status TO raw_events
-- Description: Adds the contact_extraction_status column to enable the efficient, multi-stage
-- contact identification workflow. This column tracks the processing state of each raw event
-- through the contact extraction pipeline.

-- Step 1: Add the contact_extraction_status column
ALTER TABLE public.raw_events
  ADD COLUMN IF NOT EXISTS contact_extraction_status TEXT;

-- Step 2: Add a CHECK constraint to ensure only valid status values are used.
-- This enforces the state machine we designed.
ALTER TABLE public.raw_events
  ADD CONSTRAINT contact_extraction_status_check
  CHECK (contact_extraction_status IN (
    'NO_IDENTIFIERS',    -- Processed: No potential contact info found.
    'IDENTIFIERS_FOUND', -- Processed: Has potential contact info, needs matching.
    'PENDING',           -- Processed: Blocked on user approval for a new contact.
    'YES',               -- Processed: Matched to an existing contact.
    'REJECTED'           -- Processed: User rejected the suggested contact.
  ));

-- Step 3: Create a highly efficient partial index for the triage job.
-- The job to find new, unprocessed events will be extremely fast using this index.
CREATE INDEX IF NOT EXISTS raw_events_pending_extraction_idx
  ON public.raw_events (user_id, created_at)
  WHERE (contact_extraction_status IS NULL);

-- Step 4: Create an index for finding events that have identifiers but need matching
CREATE INDEX IF NOT EXISTS raw_events_identifiers_found_idx
  ON public.raw_events (user_id, created_at)
  WHERE (contact_extraction_status = 'IDENTIFIERS_FOUND');

-- Step 5: Create an index for finding events that are pending user approval
CREATE INDEX IF NOT EXISTS raw_events_pending_approval_idx
  ON public.raw_events (user_id, created_at)
  WHERE (contact_extraction_status = 'PENDING');

-- Step 6: Create an index for finding events that are ready for interaction creation
CREATE INDEX IF NOT EXISTS raw_events_ready_for_interactions_idx
  ON public.raw_events (user_id, created_at)
  WHERE (contact_extraction_status = 'YES');

-- Add a comment to document the new column and workflow
COMMENT ON COLUMN public.raw_events.contact_extraction_status IS 'Tracks the contact extraction workflow state: NULL (unprocessed), NO_IDENTIFIERS (no contacts found), IDENTIFIERS_FOUND (has contacts, needs matching), PENDING (awaiting user approval), YES (matched to contact), REJECTED (user rejected). Added Oct 7, 2025.';
