--
-- Wellness Tracking Performance Indexes
-- Created: October 25, 2025
-- Description: Adds performance indexes for pulse logs and habit tracking queries
--

-- ============================================================================
-- PULSE LOGS INDEXES
-- ============================================================================

-- Index for getting pulse logs by user and date (most common query)
CREATE INDEX IF NOT EXISTS idx_pulse_logs_user_date
  ON daily_pulse_logs(user_id, log_date DESC);

-- Index for analytics queries with date ranges
CREATE INDEX IF NOT EXISTS idx_pulse_logs_user_created
  ON daily_pulse_logs(user_id, created_at DESC);

-- ============================================================================
-- HABIT COMPLETIONS INDEXES
-- ============================================================================

-- Index for getting completions by habit and date (streak calculation)
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date
  ON habit_completions(habit_id, completed_date DESC);

-- Index for getting completions by user and date (daily summary)
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date
  ON habit_completions(user_id, completed_date DESC);

-- Index for checking today's completions
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_habit_date
  ON habit_completions(user_id, habit_id, completed_date DESC);

-- ============================================================================
-- HABITS INDEXES
-- ============================================================================

-- Index for filtering active habits by user
CREATE INDEX IF NOT EXISTS idx_habits_user_active
  ON habits(user_id, is_active)
  WHERE is_active = true;

-- Index for updated_at (for ordering)
CREATE INDEX IF NOT EXISTS idx_habits_user_updated
  ON habits(user_id, updated_at DESC);
