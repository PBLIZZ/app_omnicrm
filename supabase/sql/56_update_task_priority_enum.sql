-- Update task_priority enum to remove 'urgent' and keep only low, medium, high
-- This aligns with the TickTick-style priority system

-- First, update any existing 'urgent' tasks to 'high'
UPDATE public.tasks 
SET priority = 'high' 
WHERE priority = 'urgent';

-- Drop the old enum type (this will fail if there are still references)
-- We need to recreate the enum type
DROP TYPE IF EXISTS task_priority CASCADE;

-- Create the new enum type with only low, medium, high
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- Add the column back with the new enum type
ALTER TABLE public.tasks 
ADD COLUMN priority_new task_priority DEFAULT 'medium' NOT NULL;

-- Copy data from old column to new column
UPDATE public.tasks 
SET priority_new = priority::text::task_priority;

-- Drop the old column
ALTER TABLE public.tasks 
DROP COLUMN priority;

-- Rename the new column to priority
ALTER TABLE public.tasks 
RENAME COLUMN priority_new TO priority;

RAISE NOTICE 'SUCCESS: task_priority enum updated to low, medium, high only.';
