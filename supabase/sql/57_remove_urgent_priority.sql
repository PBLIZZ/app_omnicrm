-- Remove 'urgent' from task_priority enum
-- Migration created: 2025-10-24
-- This safely removes the 'urgent' value from the enum and converts existing urgent tasks to 'high'

BEGIN;

-- Step 1: Update any existing 'urgent' tasks to 'high'
UPDATE public.tasks
SET priority = 'high'
WHERE priority = 'urgent';

-- Step 2: Drop the default constraint temporarily
ALTER TABLE public.tasks
  ALTER COLUMN priority DROP DEFAULT;

-- Step 3: Create new enum type without 'urgent'
CREATE TYPE task_priority_new AS ENUM ('low', 'medium', 'high');

-- Step 4: Alter the column to use the new type
ALTER TABLE public.tasks
  ALTER COLUMN priority TYPE task_priority_new
  USING priority::text::task_priority_new;

-- Step 5: Drop the old enum type
DROP TYPE task_priority;

-- Step 6: Rename new enum type to original name
ALTER TYPE task_priority_new RENAME TO task_priority;

-- Step 7: Re-add the default constraint
ALTER TABLE public.tasks
  ALTER COLUMN priority SET DEFAULT 'medium'::task_priority;

COMMIT;

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE 'task_priority enum successfully updated to: low, medium, high';
END $$;
