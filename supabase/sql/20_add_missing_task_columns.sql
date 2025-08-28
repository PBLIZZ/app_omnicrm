-- Add missing columns to tasks table to match current schema
-- This migration adds columns that were added to the Drizzle schema but missing from the database

-- Add parent_task_id column for subtasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES tasks(id);

-- Add source column for tracking task origin
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source text DEFAULT 'user' NOT NULL;

-- Add approval_status column for AI task approval workflow
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved' NOT NULL;

-- Add tagged_contacts column for storing contact references as JSONB
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tagged_contacts jsonb;

-- Add estimated_minutes column for time estimation
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_minutes integer;

-- Add actual_minutes column for actual time tracking
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_minutes integer;

-- Add ai_context column for storing AI reasoning and metadata
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_context jsonb;

-- Rename 'name' column to 'title' to match current schema (if it exists)
-- First check if 'name' column exists and 'title' doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'name')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'title') THEN
        ALTER TABLE tasks RENAME COLUMN name TO title;
    END IF;
END $$;

-- Update status check constraint to include 'done' instead of 'completed'
-- First drop the existing constraint if it exists
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
    CHECK (status IN ('todo', 'in_progress', 'waiting', 'done', 'cancelled'));

-- Add assignee column if missing (it might exist from original migration)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee text DEFAULT 'user' NOT NULL;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source);
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON tasks(approval_status);

-- Add comment for documentation
COMMENT ON COLUMN tasks.parent_task_id IS 'References parent task for subtasks hierarchy';
COMMENT ON COLUMN tasks.source IS 'Origin of the task: user or ai_generated';
COMMENT ON COLUMN tasks.approval_status IS 'Approval status for AI-generated tasks: pending_approval, approved, rejected';
COMMENT ON COLUMN tasks.tagged_contacts IS 'Array of contact IDs tagged in this task (stored as JSONB)';
COMMENT ON COLUMN tasks.estimated_minutes IS 'Estimated time in minutes to complete this task';
COMMENT ON COLUMN tasks.actual_minutes IS 'Actual time in minutes spent on this task';
COMMENT ON COLUMN tasks.ai_context IS 'AI reasoning, suggestions, and metadata for this task (stored as JSONB)';
