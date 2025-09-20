-- =============================================================================
-- OmniMomentum Module: V1 Schema Migration
--
-- This migration creates the new OmniMomentum productivity suite schema based on
-- extensive wellness practitioner research and PRD requirements.
--
-- Features:
-- - AI-powered inbox for quick capture
-- - Hierarchical task structure (projects -> tasks -> subtasks)
-- - Life-business zones for contextual organization
-- - Goal tracking for practitioners and clients
-- - Daily pulse logging for wellness tracking
-- - Proper ENUMs for data integrity
-- - Comprehensive RLS policies
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: SAFELY DROP EXISTING MOMENTUM TABLES
-- =============================================================================

-- Drop existing momentum tables (they will be replaced with new schema)
DROP TABLE IF EXISTS public.momentum_actions CASCADE;
DROP TABLE IF EXISTS public.momentums CASCADE;
DROP TABLE IF EXISTS public.momentum_projects CASCADE;
DROP TABLE IF EXISTS public.momentum_workspaces CASCADE;

-- Also drop old task/project tables if they exist
DROP TABLE IF EXISTS public.task_actions CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;

RAISE NOTICE 'SUCCESS: Old momentum and task tables dropped.';

-- =============================================================================
-- PART 2: CREATE CUSTOM TYPES (ENUMs)
-- =============================================================================

-- Drop existing ENUMs if they exist
DROP TYPE IF EXISTS public.project_status CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.task_priority CASCADE;
DROP TYPE IF EXISTS public.goal_type CASCADE;
DROP TYPE IF EXISTS public.goal_status CASCADE;
DROP TYPE IF EXISTS public.inbox_item_status CASCADE;

-- Create new ENUMs for data integrity
CREATE TYPE public.project_status AS ENUM ('active', 'on_hold', 'completed', 'archived');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done', 'canceled');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.goal_type AS ENUM ('practitioner_business', 'practitioner_personal', 'client_wellness');
CREATE TYPE public.goal_status AS ENUM ('on_track', 'at_risk', 'achieved', 'abandoned');
CREATE TYPE public.inbox_item_status AS ENUM ('unprocessed', 'processed', 'archived');

RAISE NOTICE 'SUCCESS: Custom ENUM types created.';

-- =============================================================================
-- PART 3: CREATE NEW TABLES
-- =============================================================================

-- Table: zones (Lookup Table for Life-Business Zones)
-- A pre-populated table to define contexts like 'Client Care', 'Admin', etc.
CREATE TABLE public.zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  icon_name TEXT
);

-- Table: inbox_items (The AI Quick Capture "Dump Everything" Zone)
CREATE TABLE public.inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  status inbox_item_status NOT NULL DEFAULT 'unprocessed',
  created_task_id UUID, -- Nullable, will be populated after processing
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: projects (The "Pathways" top-level containers)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zone_id INTEGER REFERENCES public.zones(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'active',
  due_date DATE,
  details JSONB DEFAULT '{}'::jsonb, -- For description, icon, metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: tasks (Core table for tasks and subtasks via self-reference)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- Task is deleted if project is
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE, -- Subtask is deleted if parent is
  name TEXT NOT NULL,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  details JSONB DEFAULT '{}'::jsonb, -- For description, steps, blockers
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: task_contact_tags (Many-to-Many Join Table)
-- Links tasks to clients (from your existing `public.contacts` table).
CREATE TABLE public.task_contact_tags (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, contact_id)
);

-- Table: goals (Tracks practitioner and client goals)
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE, -- Nullable for practitioner goals
  goal_type goal_type NOT NULL,
  name TEXT NOT NULL,
  status goal_status NOT NULL DEFAULT 'on_track',
  target_date DATE,
  details JSONB DEFAULT '{}'::jsonb, -- For description, metrics, values, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: daily_pulse_logs (Logs the daily self-assessment)
CREATE TABLE public.daily_pulse_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  details JSONB DEFAULT '{}'::jsonb, -- For energy, sleep, mood, custom questions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date) -- Ensures only one entry per user per day
);

RAISE NOTICE 'SUCCESS: New OmniMomentum tables created successfully.';

-- =============================================================================
-- PART 4: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for zones
CREATE INDEX IF NOT EXISTS idx_zones_name ON public.zones(name);

-- Indexes for inbox_items
CREATE INDEX IF NOT EXISTS idx_inbox_items_user_id ON public.inbox_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_items_status ON public.inbox_items(status);
CREATE INDEX IF NOT EXISTS idx_inbox_items_created_at ON public.inbox_items(created_at DESC);

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_zone_id ON public.projects(zone_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON public.projects(due_date);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON public.tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- Indexes for task_contact_tags
CREATE INDEX IF NOT EXISTS idx_task_contact_tags_contact_id ON public.task_contact_tags(contact_id);

-- Indexes for goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_contact_id ON public.goals(contact_id);
CREATE INDEX IF NOT EXISTS idx_goals_goal_type ON public.goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON public.goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON public.goals(created_at DESC);

-- Indexes for daily_pulse_logs
CREATE INDEX IF NOT EXISTS idx_daily_pulse_logs_user_id ON public.daily_pulse_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_pulse_logs_log_date ON public.daily_pulse_logs(log_date DESC);

-- GIN indexes for efficient JSONB searching
CREATE INDEX IF NOT EXISTS idx_projects_details_gin ON public.projects USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_tasks_details_gin ON public.tasks USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_goals_details_gin ON public.goals USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_daily_pulse_logs_details_gin ON public.daily_pulse_logs USING GIN (details);

RAISE NOTICE 'SUCCESS: Performance indexes created.';

-- =============================================================================
-- PART 5: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_pulse_logs ENABLE ROW LEVEL SECURITY;

-- Zones: Any authenticated user can read them (they are not user-specific)
CREATE POLICY "authenticated_users_can_read_zones" ON public.zones
  FOR SELECT USING (auth.role() = 'authenticated');

-- Inbox Items: Users can manage their own items
CREATE POLICY "users_can_manage_own_inbox_items" ON public.inbox_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Projects: Users can manage their own projects
CREATE POLICY "users_can_manage_own_projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tasks: Users can manage their own tasks
CREATE POLICY "users_can_manage_own_tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Task Contact Tags: Users can manage tags for their own tasks
CREATE POLICY "users_can_manage_own_task_tags" ON public.task_contact_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_contact_tags.task_id
      AND tasks.user_id = auth.uid()
    )
  );

-- Goals: Users can manage their own goals
CREATE POLICY "users_can_manage_own_goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Daily Pulse Logs: Users can manage their own logs
CREATE POLICY "users_can_manage_own_pulse_logs" ON public.daily_pulse_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

RAISE NOTICE 'SUCCESS: Row Level Security policies created.';

-- =============================================================================
-- PART 6: SEED ZONES WITH WELLNESS-SPECIFIC DATA
-- =============================================================================

INSERT INTO public.zones (name, color, icon_name) VALUES
  ('Personal Wellness', '#10B981', 'heart'),
  ('Self Care', '#F59E0B', 'spa'),
  ('Admin & Finances', '#6366F1', 'calculator'),
  ('Business Development', '#8B5CF6', 'trending-up'),
  ('Social Media & Marketing', '#EC4899', 'megaphone'),
  ('Client Care', '#06B6D4', 'users')
ON CONFLICT (name) DO NOTHING;

RAISE NOTICE 'SUCCESS: Wellness zones seeded.';

-- =============================================================================
-- PART 7: ADD TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Add updated_at triggers (assuming the function exists from previous migrations)
CREATE TRIGGER update_inbox_items_updated_at
  BEFORE UPDATE ON public.inbox_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set completed_at when task status changes to done
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'done' AND OLD.status != 'done' THEN
        NEW.completed_at = now();
    ELSIF NEW.status != 'done' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_task_completed_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

RAISE NOTICE 'SUCCESS: Triggers created.';

COMMIT;

RAISE NOTICE 'MIGRATION COMPLETE: OmniMomentum module is ready! 🚀';