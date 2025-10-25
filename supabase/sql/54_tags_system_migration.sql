-- Tags System Migration
-- Creates new relational tagging system and removes legacy JSONB tags
-- Migration: 54_tags_system_migration.sql

-- ============================================================================
-- 1. CREATE ENUMS
-- ============================================================================

-- Create tag category enum
CREATE TYPE public.tag_category AS ENUM ('client', 'task', 'note', 'goal', 'general');

-- ============================================================================
-- 2. CREATE NEW TAG TABLES
-- ============================================================================

-- Main tags table (app-wide)
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('client', 'task', 'note', 'goal', 'general')),
  color TEXT NOT NULL DEFAULT '#3B82F6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure tag names are unique per user (case-insensitive)
  CONSTRAINT unique_tag_name_per_user UNIQUE (user_id, LOWER(name))
);

-- Junction table for contact tags
CREATE TABLE public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ensure unique contact-tag combinations
  CONSTRAINT unique_contact_tag UNIQUE (contact_id, tag_id)
);

-- Junction table for task tags
CREATE TABLE public.task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique task-tag combinations
  CONSTRAINT unique_task_tag UNIQUE (task_id, tag_id)
);

-- Junction table for note tags
CREATE TABLE public.note_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique note-tag combinations
  CONSTRAINT unique_note_tag UNIQUE (note_id, tag_id)
);

-- Junction table for goal tags
CREATE TABLE public.goal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique goal-tag combinations
  CONSTRAINT unique_goal_tag UNIQUE (goal_id, tag_id)
);

-- ============================================================================
-- 3. CREATE PERFORMANCE INDEXES
-- ============================================================================

-- Tags table indexes
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_tags_category ON public.tags(category);
CREATE INDEX idx_tags_name_lower ON public.tags(LOWER(name));
CREATE INDEX idx_tags_usage_count ON public.tags(usage_count DESC);

-- Contact tags indexes
CREATE INDEX idx_contact_tags_contact_id ON public.contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag_id ON public.contact_tags(tag_id);
CREATE INDEX idx_contact_tags_created_by ON public.contact_tags(created_by);

-- Task tags indexes
CREATE INDEX idx_task_tags_task_id ON public.task_tags(task_id);
CREATE INDEX idx_task_tags_tag_id ON public.task_tags(tag_id);

-- Note tags indexes
CREATE INDEX idx_note_tags_note_id ON public.note_tags(note_id);
CREATE INDEX idx_note_tags_tag_id ON public.note_tags(tag_id);

-- Goal tags indexes
CREATE INDEX idx_goal_tags_goal_id ON public.goal_tags(goal_id);
CREATE INDEX idx_goal_tags_tag_id ON public.goal_tags(tag_id);

-- ============================================================================
-- 4. CREATE TRIGGERS FOR USAGE COUNT MAINTENANCE
-- ============================================================================

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tags 
    SET usage_count = usage_count + 1, updated_at = now()
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tags 
    SET usage_count = usage_count - 1, updated_at = now()
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all junction tables
CREATE TRIGGER trigger_contact_tags_usage_count
  AFTER INSERT OR DELETE ON public.contact_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER trigger_task_tags_usage_count
  AFTER INSERT OR DELETE ON public.task_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER trigger_note_tags_usage_count
  AFTER INSERT OR DELETE ON public.note_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER trigger_goal_tags_usage_count
  AFTER INSERT OR DELETE ON public.goal_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- ============================================================================
-- 5. REMOVE LEGACY TAGGING SYSTEM
-- ============================================================================

-- Remove legacy JSONB tags column from contacts table
ALTER TABLE public.contacts DROP COLUMN IF EXISTS tags;

-- Remove legacy text array tags column from notes table
ALTER TABLE public.notes DROP COLUMN IF EXISTS tags;

-- Drop legacy task_contact_tags table
DROP TABLE IF EXISTS public.task_contact_tags;

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tag tables
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for tags table
CREATE POLICY "Users can view their own tags" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON public.tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON public.tags
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for contact_tags table
CREATE POLICY "Users can view contact tags for their contacts" ON public.contact_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contacts 
      WHERE contacts.id = contact_tags.contact_id 
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contact tags for their contacts" ON public.contact_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts 
      WHERE contacts.id = contact_tags.contact_id 
      AND contacts.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.tags 
      WHERE tags.id = contact_tags.tag_id 
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contact tags for their contacts" ON public.contact_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.contacts 
      WHERE contacts.id = contact_tags.contact_id 
      AND contacts.user_id = auth.uid()
    )
  );

-- RLS policies for task_tags table
CREATE POLICY "Users can view task tags for their tasks" ON public.task_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_tags.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert task tags for their tasks" ON public.task_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_tags.task_id 
      AND tasks.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.tags 
      WHERE tags.id = task_tags.tag_id 
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete task tags for their tasks" ON public.task_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_tags.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

-- RLS policies for note_tags table
CREATE POLICY "Users can view note tags for their notes" ON public.note_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_tags.note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert note tags for their notes" ON public.note_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_tags.note_id 
      AND notes.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.tags 
      WHERE tags.id = note_tags.tag_id 
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete note tags for their notes" ON public.note_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_tags.note_id 
      AND notes.user_id = auth.uid()
    )
  );

-- RLS policies for goal_tags table
CREATE POLICY "Users can view goal tags for their goals" ON public.goal_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_tags.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert goal tags for their goals" ON public.goal_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_tags.goal_id 
      AND goals.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.tags 
      WHERE tags.id = goal_tags.tag_id 
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete goal tags for their goals" ON public.goal_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_tags.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. CREATE STARTER TEMPLATE TAGS FUNCTION
-- ============================================================================

-- Function to create starter template tags for new users
CREATE OR REPLACE FUNCTION create_starter_template_tags(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Client Status tags
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'New Client', 'client', '#10B981'),
    (user_uuid, 'Active', 'client', '#3B82F6'),
    (user_uuid, 'Inactive', 'client', '#6B7280'),
    (user_uuid, 'At-Risk', 'client', '#EF4444'),
    (user_uuid, 'Alumni', 'client', '#8B5CF6');
  
  -- Referral Source tags
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Workshop', 'client', '#F59E0B'),
    (user_uuid, 'Social Media', 'client', '#EC4899'),
    (user_uuid, 'Website', 'client', '#06B6D4'),
    (user_uuid, 'Referral', 'client', '#84CC16'),
    (user_uuid, 'Walk-in', 'client', '#F97316');
  
  -- Engagement Level tags
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Highly Engaged', 'client', '#22C55E'),
    (user_uuid, 'Regular', 'client', '#3B82F6'),
    (user_uuid, 'Occasional', 'client', '#F59E0B'),
    (user_uuid, 'Needs Follow-up', 'client', '#EF4444');
  
  -- Program Type tags
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, '1:1 Coaching', 'client', '#8B5CF6'),
    (user_uuid, 'Group Program', 'client', '#06B6D4'),
    (user_uuid, 'Workshop Attendee', 'client', '#F59E0B'),
    (user_uuid, 'Corporate Client', 'client', '#6B7280');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_tags TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.tags IS 'App-wide tags table for flexible entity tagging';
COMMENT ON TABLE public.contact_tags IS 'Junction table linking contacts to tags';
COMMENT ON TABLE public.task_tags IS 'Junction table linking tasks to tags';
COMMENT ON TABLE public.note_tags IS 'Junction table linking notes to tags';
COMMENT ON TABLE public.goal_tags IS 'Junction table linking goals to tags';

COMMENT ON COLUMN public.tags.usage_count IS 'Denormalized count of entities using this tag for performance';
COMMENT ON COLUMN public.tags.category IS 'Tag category for organization (client, task, note, goal, general)';
COMMENT ON COLUMN public.tags.color IS 'Hex color code for tag display (6 characters)';

COMMENT ON FUNCTION create_starter_template_tags IS 'Creates default template tags for new users during onboarding';

