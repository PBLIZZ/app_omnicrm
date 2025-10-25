-- Remove parent_task_id column from tasks table
-- Migration created: 2025-10-24
-- Subtasks are now stored in the details JSONB column, eliminating circular dependency

BEGIN;

-- Step 1: Drop the foreign key constraint (self-referential)
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_parent_task_id_fkey;

-- Step 2: Drop the parent_task_id column
ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS parent_task_id;

COMMIT;

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE 'tasks.parent_task_id column successfully removed';
  RAISE NOTICE 'Subtasks are now managed via details.subtasks JSONB field';
END $$;
