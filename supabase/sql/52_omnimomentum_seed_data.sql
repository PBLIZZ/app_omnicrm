-- =========================
-- 52_omnimomentum_seed_data.sql
-- Comprehensive seed data for OmniMomentum workflow
-- Includes: inbox items, projects, tasks, goals, daily pulse logs, and habit data
-- =========================

-- =============================================================================
-- PART 1: SEED INBOX ITEMS (Quick Capture Data)
-- =============================================================================

-- Sample inbox items for different wellness practitioners
INSERT INTO public.inbox_items (user_id, raw_text, status, created_at) VALUES
  -- Unprocessed items (for Today's Focus)
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Need to update Sarah''s nutrition plan - she mentioned feeling bloated after meals', 'unprocessed', now() - interval '2 hours'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Client John wants to discuss his sleep issues during our next session', 'unprocessed', now() - interval '1 hour'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Research new meditation techniques for anxiety management', 'unprocessed', now() - interval '30 minutes'),
  
  -- Processed items
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Book venue for wellness workshop next month', 'processed', now() - interval '1 day'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Update website with new client testimonials', 'processed', now() - interval '2 days'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Order new yoga mats for the studio', 'processed', now() - interval '3 days'),
  
  -- Archived items
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Old idea about creating a meditation app - not pursuing', 'archived', now() - interval '1 week'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Client referral from Dr. Smith - already handled', 'archived', now() - interval '2 weeks')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PART 2: SEED PROJECTS (Pathways)
-- =============================================================================

-- Get zone IDs for reference
DO $$
DECLARE
  personal_wellness_id INTEGER;
  self_care_id INTEGER;
  admin_finances_id INTEGER;
  business_dev_id INTEGER;
  social_marketing_id INTEGER;
  client_care_id INTEGER;
BEGIN
  -- Get zone IDs
  SELECT id INTO personal_wellness_id FROM public.zones WHERE name = 'Personal Wellness';
  SELECT id INTO self_care_id FROM public.zones WHERE name = 'Self Care';
  SELECT id INTO admin_finances_id FROM public.zones WHERE name = 'Admin & Finances';
  SELECT id INTO business_dev_id FROM public.zones WHERE name = 'Business Development';
  SELECT id INTO social_marketing_id FROM public.zones WHERE name = 'Social Media & Marketing';
  SELECT id INTO client_care_id FROM public.zones WHERE name = 'Client Care';

  -- Insert projects
  INSERT INTO public.projects (user_id, zone_id, name, description, status, due_date, details) VALUES
    -- Personal Wellness Projects
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', personal_wellness_id, 'Morning Routine Optimization', 'Develop a consistent morning routine that includes meditation, journaling, and light exercise', 'active', current_date + interval '2 weeks', '{"priority": "high", "estimated_hours": 20}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', personal_wellness_id, 'Stress Management System', 'Create a comprehensive stress management system for busy periods', 'active', current_date + interval '1 month', '{"priority": "medium", "estimated_hours": 15}'),
    
    -- Self Care Projects
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', self_care_id, 'Digital Detox Protocol', 'Establish boundaries with technology and create offline time blocks', 'active', current_date + interval '3 weeks', '{"priority": "medium", "estimated_hours": 10}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', self_care_id, 'Nutrition Planning System', 'Develop a meal planning system that supports energy and focus', 'on_hold', current_date + interval '2 months', '{"priority": "low", "estimated_hours": 25}'),
    
    -- Business Development Projects
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', business_dev_id, 'Wellness Workshop Series', 'Create and launch a 6-week wellness workshop series', 'active', current_date + interval '6 weeks', '{"priority": "high", "estimated_hours": 40}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', business_dev_id, 'Client Onboarding Process', 'Streamline and improve the client onboarding experience', 'active', current_date + interval '2 weeks', '{"priority": "high", "estimated_hours": 30}'),
    
    -- Client Care Projects
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', client_care_id, 'Client Progress Tracking', 'Implement a system for tracking and celebrating client progress', 'active', current_date + interval '3 weeks', '{"priority": "medium", "estimated_hours": 20}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', client_care_id, 'Follow-up Communication System', 'Create automated follow-up sequences for client check-ins', 'completed', current_date - interval '1 week', '{"priority": "high", "estimated_hours": 15}'),
    
    -- Admin & Finances Projects
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', admin_finances_id, 'Tax Preparation 2024', 'Organize and prepare all financial documents for tax season', 'active', current_date + interval '2 months', '{"priority": "high", "estimated_hours": 12}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', admin_finances_id, 'Insurance Review', 'Review and update all business insurance policies', 'active', current_date + interval '1 month', '{"priority": "medium", "estimated_hours": 8}'),
    
    -- Social Media & Marketing Projects
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', social_marketing_id, 'Content Calendar Q1', 'Plan and schedule wellness content for first quarter', 'active', current_date + interval '2 weeks', '{"priority": "medium", "estimated_hours": 16}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', social_marketing_id, 'Client Success Stories', 'Collect and prepare client testimonials for marketing', 'on_hold', current_date + interval '1 month', '{"priority": "low", "estimated_hours": 12}')
  ON CONFLICT DO NOTHING;
END $$;

-- =============================================================================
-- PART 3: SEED TASKS (Hierarchical Task System)
-- =============================================================================

-- Get project IDs for task creation
DO $$
DECLARE
  morning_routine_id UUID;
  stress_mgmt_id UUID;
  digital_detox_id UUID;
  workshop_series_id UUID;
  client_onboarding_id UUID;
  progress_tracking_id UUID;
  tax_prep_id UUID;
  content_calendar_id UUID;
BEGIN
  -- Get project IDs
  SELECT id INTO morning_routine_id FROM public.projects WHERE name = 'Morning Routine Optimization';
  SELECT id INTO stress_mgmt_id FROM public.projects WHERE name = 'Stress Management System';
  SELECT id INTO digital_detox_id FROM public.projects WHERE name = 'Digital Detox Protocol';
  SELECT id INTO workshop_series_id FROM public.projects WHERE name = 'Wellness Workshop Series';
  SELECT id INTO client_onboarding_id FROM public.projects WHERE name = 'Client Onboarding Process';
  SELECT id INTO progress_tracking_id FROM public.projects WHERE name = 'Client Progress Tracking';
  SELECT id INTO tax_prep_id FROM public.projects WHERE name = 'Tax Preparation 2024';
  SELECT id INTO content_calendar_id FROM public.projects WHERE name = 'Content Calendar Q1';

  -- Insert tasks
  INSERT INTO public.tasks (user_id, project_id, name, description, status, priority, due_date, details) VALUES
    -- Morning Routine Optimization Tasks
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', morning_routine_id, 'Research morning routine best practices', 'Study successful morning routines from wellness practitioners', 'done', 'high', current_date - interval '3 days', '{"estimated_hours": 2}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', morning_routine_id, 'Design 30-minute morning routine', 'Create a structured 30-minute morning routine template', 'in_progress', 'high', current_date + interval '2 days', '{"estimated_hours": 3}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', morning_routine_id, 'Test routine for 1 week', 'Implement and test the morning routine for one week', 'todo', 'medium', current_date + interval '1 week', '{"estimated_hours": 0}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', morning_routine_id, 'Create routine checklist', 'Develop a printable checklist for the morning routine', 'todo', 'low', current_date + interval '2 weeks', '{"estimated_hours": 1}'),
    
    -- Stress Management System Tasks
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', stress_mgmt_id, 'Identify stress triggers', 'Document personal stress triggers and patterns', 'done', 'high', current_date - interval '1 week', '{"estimated_hours": 2}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', stress_mgmt_id, 'Research stress management techniques', 'Study various stress management methods and tools', 'in_progress', 'medium', current_date + interval '3 days', '{"estimated_hours": 4}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', stress_mgmt_id, 'Create stress response protocol', 'Develop a step-by-step protocol for managing stress', 'todo', 'high', current_date + interval '1 week', '{"estimated_hours": 3}'),
    
    -- Digital Detox Protocol Tasks
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', digital_detox_id, 'Audit current digital usage', 'Track and analyze current technology usage patterns', 'done', 'high', current_date - interval '5 days', '{"estimated_hours": 2}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', digital_detox_id, 'Set device boundaries', 'Establish specific times and places for device use', 'in_progress', 'medium', current_date + interval '1 day', '{"estimated_hours": 1}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', digital_detox_id, 'Create offline activities list', 'Compile a list of engaging offline activities', 'todo', 'low', current_date + interval '1 week', '{"estimated_hours": 2}'),
    
    -- Wellness Workshop Series Tasks
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', workshop_series_id, 'Define workshop topics', 'Choose 6 wellness topics for the workshop series', 'done', 'high', current_date - interval '2 weeks', '{"estimated_hours": 3}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', workshop_series_id, 'Create workshop content', 'Develop presentation materials and handouts', 'in_progress', 'high', current_date + interval '2 weeks', '{"estimated_hours": 20}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', workshop_series_id, 'Book venue and schedule', 'Secure venue and set workshop dates', 'todo', 'high', current_date + interval '1 week', '{"estimated_hours": 4}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', workshop_series_id, 'Create marketing materials', 'Design flyers and social media content', 'todo', 'medium', current_date + interval '3 weeks', '{"estimated_hours": 8}'),
    
    -- Client Onboarding Process Tasks
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', client_onboarding_id, 'Design intake forms', 'Create comprehensive client intake forms', 'done', 'high', current_date - interval '1 week', '{"estimated_hours": 6}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', client_onboarding_id, 'Create welcome packet', 'Develop a welcome packet for new clients', 'in_progress', 'medium', current_date + interval '3 days', '{"estimated_hours": 4}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', client_onboarding_id, 'Set up automated emails', 'Configure automated email sequences', 'todo', 'medium', current_date + interval '1 week', '{"estimated_hours": 3}'),
    
    -- Client Progress Tracking Tasks
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', progress_tracking_id, 'Choose tracking metrics', 'Select key metrics to track client progress', 'done', 'high', current_date - interval '1 week', '{"estimated_hours": 2}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', progress_tracking_id, 'Create progress templates', 'Design templates for tracking client progress', 'in_progress', 'medium', current_date + interval '5 days', '{"estimated_hours": 4}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', progress_tracking_id, 'Train staff on system', 'Ensure all team members understand the tracking system', 'todo', 'low', current_date + interval '2 weeks', '{"estimated_hours": 2}'),
    
    -- Tax Preparation Tasks
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', tax_prep_id, 'Gather financial documents', 'Collect all receipts, invoices, and financial records', 'in_progress', 'high', current_date + interval '1 week', '{"estimated_hours": 4}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', tax_prep_id, 'Organize expense categories', 'Categorize all business expenses for tax purposes', 'todo', 'high', current_date + interval '2 weeks', '{"estimated_hours": 6}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', tax_prep_id, 'Schedule accountant meeting', 'Book appointment with tax accountant', 'todo', 'medium', current_date + interval '3 weeks', '{"estimated_hours": 1}'),
    
    -- Content Calendar Tasks
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', content_calendar_id, 'Plan content themes', 'Define monthly themes for wellness content', 'done', 'high', current_date - interval '1 week', '{"estimated_hours": 2}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', content_calendar_id, 'Create content calendar', 'Build detailed calendar with post ideas and dates', 'in_progress', 'medium', current_date + interval '3 days', '{"estimated_hours": 6}'),
    ('3550f627-dbd7-4c5f-a13f-e59295c14676', content_calendar_id, 'Batch create content', 'Create multiple posts in advance', 'todo', 'medium', current_date + interval '1 week', '{"estimated_hours": 8}')
  ON CONFLICT DO NOTHING;
END $$;

-- =============================================================================
-- PART 4: SEED GOALS (Personal, Business, and Client Goals)
-- =============================================================================

INSERT INTO public.goals (user_id, contact_id, goal_type, name, status, target_date, details) VALUES
  -- Practitioner Personal Goals
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', NULL, 'practitioner_personal', 'Maintain consistent morning routine for 30 days', 'on_track', current_date + interval '30 days', '{"description": "Establish a sustainable morning routine that includes meditation, journaling, and light exercise", "metrics": "Days completed out of 30"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', NULL, 'practitioner_personal', 'Complete 200 hours of continuing education', 'on_track', current_date + interval '6 months', '{"description": "Maintain professional development through courses, workshops, and certifications", "metrics": "Hours completed: 45/200"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', NULL, 'practitioner_personal', 'Achieve work-life balance score of 8/10', 'at_risk', current_date + interval '3 months', '{"description": "Improve work-life balance through better time management and boundaries", "metrics": "Current score: 6/10"}'),
  
  -- Practitioner Business Goals
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', NULL, 'practitioner_business', 'Increase monthly revenue by 25%', 'on_track', current_date + interval '6 months', '{"description": "Grow business through new clients and service offerings", "metrics": "Current: $8,500/month, Target: $10,625/month"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', NULL, 'practitioner_business', 'Launch wellness workshop series', 'on_track', current_date + interval '2 months', '{"description": "Create and launch a 6-week wellness workshop series", "metrics": "Workshops planned: 6, Registration target: 20 participants"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', NULL, 'practitioner_business', 'Build email list to 500 subscribers', 'on_track', current_date + interval '4 months', '{"description": "Grow email list through content marketing and lead magnets", "metrics": "Current: 150 subscribers, Target: 500"}'),
  
  -- Client Wellness Goals (assuming we have a contact with ID)
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', (SELECT id FROM public.contacts LIMIT 1), 'client_wellness', 'Reduce stress levels by 40%', 'on_track', current_date + interval '3 months', '{"description": "Help client develop stress management techniques and coping strategies", "metrics": "Baseline stress score: 8/10, Target: 5/10"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', (SELECT id FROM public.contacts LIMIT 1), 'client_wellness', 'Improve sleep quality', 'on_track', current_date + interval '2 months', '{"description": "Establish healthy sleep habits and improve sleep duration", "metrics": "Current: 5.5 hours/night, Target: 7-8 hours/night"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', (SELECT id FROM public.contacts LIMIT 1), 'client_wellness', 'Increase daily activity level', 'at_risk', current_date + interval '2 months', '{"description": "Help client incorporate regular physical activity into daily routine", "metrics": "Current: 2,000 steps/day, Target: 8,000 steps/day"}')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PART 5: SEED DAILY PULSE LOGS (Wellness Tracking Data)
-- =============================================================================

-- Insert daily pulse logs for the past 7 days
INSERT INTO public.daily_pulse_logs (user_id, log_date, details) VALUES
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', current_date - interval '6 days', '{"energy_level": 4, "sleep_hours": 7.5, "nap_minutes": 0, "mood": "😊", "notes": "Great day, felt energized and focused"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', current_date - interval '5 days', '{"energy_level": 3, "sleep_hours": 6, "nap_minutes": 20, "mood": "😌", "notes": "Took a power nap in the afternoon, helped with afternoon slump"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', current_date - interval '4 days', '{"energy_level": 5, "sleep_hours": 8, "nap_minutes": 0, "mood": "✨", "notes": "Excellent sleep, felt amazing all day"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', current_date - interval '3 days', '{"energy_level": 2, "sleep_hours": 5.5, "nap_minutes": 30, "mood": "😔", "notes": "Rough night, client emergency kept me up late"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', current_date - interval '2 days', '{"energy_level": 3, "sleep_hours": 6.5, "nap_minutes": 15, "mood": "😐", "notes": "Recovering from previous night, took it easy"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', current_date - interval '1 day', '{"energy_level": 4, "sleep_hours": 7, "nap_minutes": 0, "mood": "😊", "notes": "Good day, completed most planned tasks"}'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', current_date, '{"energy_level": 3, "sleep_hours": 6, "nap_minutes": 0, "mood": "😌", "notes": "Feeling calm and centered, ready for the day"}')
ON CONFLICT (user_id, log_date) DO NOTHING;

-- =============================================================================
-- PART 6: SEED HABIT TRACKING DATA (Custom Table for Habits)
-- =============================================================================

-- Create a habits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_frequency TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  color TEXT DEFAULT '#10B981',
  icon_name TEXT DEFAULT 'check-circle',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create habit completions table
CREATE TABLE IF NOT EXISTS public.habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_id, completed_date)
);

-- Insert sample habits
INSERT INTO public.habits (user_id, name, description, target_frequency, color, icon_name) VALUES
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Morning Meditation', '10-minute meditation session each morning', 'daily', '#10B981', 'brain'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Exercise', '30 minutes of physical activity', 'daily', '#F59E0B', 'activity'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Journaling', 'Write in gratitude journal', 'daily', '#8B5CF6', 'book-open'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Water Intake', 'Drink 8 glasses of water', 'daily', '#06B6D4', 'droplet'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Digital Detox', 'No screens 1 hour before bed', 'daily', '#EC4899', 'smartphone'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Client Follow-up', 'Check in with at least one client', 'daily', '#6366F1', 'users'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Learning', 'Read or study for 30 minutes', 'daily', '#F97316', 'book'),
  ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Gratitude Practice', 'Write down 3 things I''m grateful for', 'daily', '#84CC16', 'heart')
ON CONFLICT DO NOTHING;

-- Insert habit completions for the past week
DO $$
DECLARE
  habit_record RECORD;
  completion_date DATE;
  i INTEGER;
BEGIN
  -- Get all habits for the user
  FOR habit_record IN 
    SELECT id, name FROM public.habits WHERE user_id = '3550f627-dbd7-4c5f-a13f-e59295c14676'
  LOOP
    -- Create completions for the past 7 days with some randomness
    FOR i IN 0..6 LOOP
      completion_date := current_date - i;
      
      -- Randomly complete habits (80% completion rate)
      IF random() < 0.8 THEN
        INSERT INTO public.habit_completions (user_id, habit_id, completed_date, notes)
        VALUES (
          '3550f627-dbd7-4c5f-a13f-e59295c14676',
          habit_record.id,
          completion_date,
          CASE 
            WHEN habit_record.name = 'Morning Meditation' THEN 'Felt centered and focused'
            WHEN habit_record.name = 'Exercise' THEN 'Great workout, felt energized'
            WHEN habit_record.name = 'Journaling' THEN 'Reflected on the day'
            WHEN habit_record.name = 'Water Intake' THEN 'Stayed hydrated throughout the day'
            WHEN habit_record.name = 'Digital Detox' THEN 'Peaceful evening without screens'
            WHEN habit_record.name = 'Client Follow-up' THEN 'Checked in with Sarah about her progress'
            WHEN habit_record.name = 'Learning' THEN 'Read about new wellness techniques'
            WHEN habit_record.name = 'Gratitude Practice' THEN 'Grateful for good health, family, and meaningful work'
            ELSE 'Completed successfully'
          END
        ) ON CONFLICT (user_id, habit_id, completed_date) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- =============================================================================
-- PART 7: ADD RLS POLICIES FOR NEW TABLES
-- =============================================================================

-- Habits table RLS
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_manage_own_habits" ON public.habits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Habit completions table RLS
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_manage_own_habit_completions" ON public.habit_completions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- PART 8: ADD UPDATED_AT TRIGGERS
-- =============================================================================

-- Add updated_at trigger for habits table
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

RAISE NOTICE 'SUCCESS: OmniMomentum seed data created successfully! 🚀';
RAISE NOTICE 'Seeded data includes:';
RAISE NOTICE '- 8 inbox items (3 unprocessed, 3 processed, 2 archived)';
RAISE NOTICE '- 12 projects across all wellness zones';
RAISE NOTICE '- 25+ tasks with realistic hierarchy and statuses';
RAISE NOTICE '- 9 goals (personal, business, and client wellness)';
RAISE NOTICE '- 7 days of daily pulse logs';
RAISE NOTICE '- 8 habits with completion tracking for the past week';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Run: pnpm types:gen';
RAISE NOTICE '2. Test the OmniMomentum page to see the seeded data';
RAISE NOTICE '3. Verify all components are working with real data';
