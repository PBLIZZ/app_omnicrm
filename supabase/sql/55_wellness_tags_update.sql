-- Wellness Tags System Update
-- Updates tag categories to semantic wellness categories
-- Adds 36 starter wellness practitioner tags
-- Migration: 55_wellness_tags_update.sql

-- ============================================================================
-- 1. UPDATE TAG CATEGORY ENUM
-- ============================================================================

-- Drop existing category constraint and recreate with new values
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_category_check;

ALTER TABLE public.tags 
  ADD CONSTRAINT tags_category_check 
  CHECK (category IN ('services', 'demographics', 'goals_health', 'engagement', 'general'));

-- Update existing tags to use new category system (map old to new)
UPDATE public.tags SET category = 'general' WHERE category IN ('client', 'task', 'note', 'goal');

-- ============================================================================
-- 2. UPDATE STARTER TAGS FUNCTION WITH 36 WELLNESS TAGS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_starter_template_tags(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Services (14 tags) - Treatment and service types
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Yoga', 'services', '#a78bfa'),
    (user_uuid, 'Massage', 'services', '#a78bfa'),
    (user_uuid, 'Meditation', 'services', '#a78bfa'),
    (user_uuid, 'Pilates', 'services', '#a78bfa'),
    (user_uuid, 'Reiki', 'services', '#a78bfa'),
    (user_uuid, 'Acupuncture', 'services', '#a78bfa'),
    (user_uuid, 'Personal Training', 'services', '#a78bfa'),
    (user_uuid, 'Nutrition Coaching', 'services', '#a78bfa'),
    (user_uuid, 'Life Coaching', 'services', '#a78bfa'),
    (user_uuid, 'Therapy', 'services', '#a78bfa'),
    (user_uuid, 'Workshops', 'services', '#a78bfa'),
    (user_uuid, 'Retreats', 'services', '#a78bfa'),
    (user_uuid, 'Group Classes', 'services', '#a78bfa'),
    (user_uuid, 'Private Sessions', 'services', '#a78bfa');
  
  -- Demographics (11 tags) - Client characteristics
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Senior', 'demographics', '#7dd3fc'),
    (user_uuid, 'Young Adult', 'demographics', '#7dd3fc'),
    (user_uuid, 'Professional', 'demographics', '#7dd3fc'),
    (user_uuid, 'Parent', 'demographics', '#7dd3fc'),
    (user_uuid, 'Student', 'demographics', '#7dd3fc'),
    (user_uuid, 'Beginner', 'demographics', '#7dd3fc'),
    (user_uuid, 'Intermediate', 'demographics', '#7dd3fc'),
    (user_uuid, 'Advanced', 'demographics', '#7dd3fc'),
    (user_uuid, 'VIP', 'demographics', '#7dd3fc'),
    (user_uuid, 'Local', 'demographics', '#7dd3fc'),
    (user_uuid, 'Traveler', 'demographics', '#7dd3fc');
  
  -- Goals & Health (11 tags) - Health objectives
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Stress Relief', 'goals_health', '#86efac'),
    (user_uuid, 'Weight Loss', 'goals_health', '#86efac'),
    (user_uuid, 'Flexibility', 'goals_health', '#86efac'),
    (user_uuid, 'Strength Building', 'goals_health', '#86efac'),
    (user_uuid, 'Pain Management', 'goals_health', '#86efac'),
    (user_uuid, 'Mental Health', 'goals_health', '#86efac'),
    (user_uuid, 'Spiritual Growth', 'goals_health', '#86efac'),
    (user_uuid, 'Mindfulness', 'goals_health', '#86efac'),
    (user_uuid, 'Athletic Performance', 'goals_health', '#86efac'),
    (user_uuid, 'Injury Recovery', 'goals_health', '#86efac'),
    (user_uuid, 'Prenatal', 'goals_health', '#86efac');
  
  -- Engagement (10 tags) - Client behavior patterns
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Regular Attendee', 'engagement', '#fbbf24'),
    (user_uuid, 'Weekend Warrior', 'engagement', '#fbbf24'),
    (user_uuid, 'Early Bird', 'engagement', '#fbbf24'),
    (user_uuid, 'Evening Preferred', 'engagement', '#fbbf24'),
    (user_uuid, 'Seasonal Client', 'engagement', '#fbbf24'),
    (user_uuid, 'Frequent Visitor', 'engagement', '#fbbf24'),
    (user_uuid, 'Occasional Visitor', 'engagement', '#fbbf24'),
    (user_uuid, 'High Spender', 'engagement', '#fbbf24'),
    (user_uuid, 'Referral Source', 'engagement', '#fbbf24'),
    (user_uuid, 'Social Media Active', 'engagement', '#fbbf24');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. UPDATE COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.tags.category IS 'Semantic tag category: services (treatments), demographics (client traits), goals_health (objectives), engagement (behavior), general (uncategorized)';

-- ============================================================================
-- 4. NOTES
-- ============================================================================

-- This migration updates the tag system to use semantic wellness categories
-- instead of entity-type categories. Tags are now universal - the same tag
-- (e.g., "Reiki") can be used across tasks, notes, goals, and contacts.
--
-- Color scheme:
-- - Services: #a78bfa (Violet) - Yoga, Massage, Reiki, etc.
-- - Demographics: #7dd3fc (Sky) - Beginner, Advanced, Senior, etc.
-- - Goals & Health: #86efac (Sage) - Stress Relief, Weight Loss, etc.
-- - Engagement: #fbbf24 (Amber) - Weekend Warrior, Frequent Visitor, etc.
-- - General: #9ca3af (Gray) - Uncategorized custom tags
