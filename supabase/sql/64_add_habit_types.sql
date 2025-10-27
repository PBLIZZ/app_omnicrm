-- Migration: Add Habit Types Support
-- Description: Add fields to support different habit input types (boolean, count, minutes, hours)
-- Date: 2025-01-26

-- Add new columns to habits table
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS habit_type TEXT DEFAULT 'boolean',
  ADD COLUMN IF NOT EXISTS target_value INTEGER,
  ADD COLUMN IF NOT EXISTS target_unit TEXT;

-- Add check constraint for valid habit types
ALTER TABLE habits
  ADD CONSTRAINT habits_type_check
  CHECK (habit_type IN ('boolean', 'count', 'minutes', 'hours'));

-- Update habit_completions to store numeric values
ALTER TABLE habit_completions
  ADD COLUMN IF NOT EXISTS value_completed INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN habits.habit_type IS 'Type of habit input: boolean (checkbox), count (number), minutes (time in minutes), hours (time in hours)';
COMMENT ON COLUMN habits.target_value IS 'Target value for count/minutes/hours habits (e.g., 8 for 8 hours sleep, 30 for 30 minutes meditation)';
COMMENT ON COLUMN habits.target_unit IS 'Display unit for the target (e.g., "glasses", "pages", "steps", "clients")';
COMMENT ON COLUMN habit_completions.value_completed IS 'Actual value logged for count/minutes/hours habits';
