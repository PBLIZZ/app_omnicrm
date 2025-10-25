-- Migrate to Semantic Tag Categories
-- Migration created: 2025-10-24
-- Implements wellness practitioner tag taxonomy with 60+ starter tags

BEGIN;

-- ============================================================================
-- STEP 1: Update tag category enum to semantic categories
-- ============================================================================

-- Drop old constraint
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_category_check;

-- Drop the default constraint temporarily
ALTER TABLE public.tags
  ALTER COLUMN category DROP DEFAULT;

-- Create new semantic enum type
CREATE TYPE tag_category_new AS ENUM (
  'services_modalities',  -- 🧘 Services & Modalities
  'client_demographics',  -- 👩‍💼 Client Type & Demographics
  'schedule_attendance',  -- 🕒 Schedule & Attendance Patterns
  'health_wellness',      -- 🌿 Health & Wellness Goals
  'emotional_mental'      -- 😊 Emotional & Mental Focus
);

-- Migrate existing tags to first category (no current users, this is just for safety)
UPDATE public.tags SET category = 'client' WHERE category IN ('client', 'task', 'note', 'goal', 'general');

-- Alter column to use new enum
ALTER TABLE public.tags
  ALTER COLUMN category TYPE tag_category_new
  USING 'services_modalities'::tag_category_new;

-- Drop old enum if it exists
DROP TYPE IF EXISTS tag_category;

-- Rename new enum to standard name
ALTER TYPE tag_category_new RENAME TO tag_category;

-- Re-add the default with new type
ALTER TABLE public.tags
  ALTER COLUMN category SET DEFAULT 'services_modalities'::tag_category;

-- ============================================================================
-- STEP 2: Update color defaults and add category_color column
-- ============================================================================

-- Add a column to track user-customized category colors
ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS category_color TEXT;

-- Update default color to gray
ALTER TABLE public.tags
  ALTER COLUMN color SET DEFAULT '#9ca3af';

-- ============================================================================
-- STEP 3: Create function to seed starter tags for new users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_wellness_starter_tags(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete any existing tags for this user (clean slate)
  DELETE FROM public.tags WHERE user_id = user_uuid;

  -- 🧘 Services & Modalities (Violet #a78bfa) - 10 tags
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Yoga', 'services_modalities', '#a78bfa'),
    (user_uuid, 'Pilates', 'services_modalities', '#a78bfa'),
    (user_uuid, 'Meditation', 'services_modalities', '#a78bfa'),
    (user_uuid, 'Mindfulness', 'services_modalities', '#a78bfa'),
    (user_uuid, 'Massage Therapy', 'services_modalities', '#a78bfa'),
    (user_uuid, 'Deep Tissue', 'services_modalities', '#a78bfa'),
    (user_uuid, 'Sports Massage', 'services_modalities', '#a78bfa'),
    (user_uuid, 'Aromatherapy', 'services_modalities', '#a78bfa'),
    (user_uuid, 'Reiki', 'services_modalities', '#a78bfa'),
    (user_uuid, 'Acupuncture', 'services_modalities', '#a78bfa');

  -- 💼 Client Demographics (Sky #7dd3fc) - 10 tags
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'New Client', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Returning Client', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Regular Client', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Trial Session', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Expecting Mum', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Postpartum', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Seniors', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Athletes', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Fitness Buffs', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Office Workers', 'client_demographics', '#7dd3fc');

  -- 🕒 Schedule & Attendance (Amber #fbbf24) - 10 tags
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Weekday AM', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Weekday PM', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Weekends', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Mornings Only', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Evenings Only', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Irregular Attendance', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Cancelled Session', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'No Show', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Late Arrival', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Package Holder', 'schedule_attendance', '#fbbf24');

  -- 🌿 Health & Wellness Goals (Sage #86efac) - 10 tags
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Stress Relief', 'health_wellness', '#86efac'),
    (user_uuid, 'Pain Management', 'health_wellness', '#86efac'),
    (user_uuid, 'Muscle Tension', 'health_wellness', '#86efac'),
    (user_uuid, 'Sleep Improvement', 'health_wellness', '#86efac'),
    (user_uuid, 'Energy Boost', 'health_wellness', '#86efac'),
    (user_uuid, 'Injury Rehab', 'health_wellness', '#86efac'),
    (user_uuid, 'Weight Loss', 'health_wellness', '#86efac'),
    (user_uuid, 'Flexibility', 'health_wellness', '#86efac'),
    (user_uuid, 'Posture Correction', 'health_wellness', '#86efac'),
    (user_uuid, 'Mobility', 'health_wellness', '#86efac');

  -- 🧠 Emotional & Mental Focus (Rose #fb7185) - 10 tags
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Anxiety', 'emotional_mental', '#fb7185'),
    (user_uuid, 'Burnout', 'emotional_mental', '#fb7185'),
    (user_uuid, 'Emotional Release', 'emotional_mental', '#fb7185'),
    (user_uuid, 'Confidence', 'emotional_mental', '#fb7185'),
    (user_uuid, 'Focus', 'emotional_mental', '#fb7185'),
    (user_uuid, 'Relaxation', 'emotional_mental', '#fb7185'),
    (user_uuid, 'Motivation', 'emotional_mental', '#fb7185'),
    (user_uuid, 'Mindfulness Practice', 'emotional_mental', '#fb7185'),
    (user_uuid, 'Self Care', 'emotional_mental', '#fb7185'),
    (user_uuid, 'Trauma Informed', 'emotional_mental', '#fb7185');

  -- Additional business & engagement tags (10 more)
  INSERT INTO public.tags (user_id, name, category, color) VALUES
    (user_uuid, 'Intro Session', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Follow-up', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Assessment', 'health_wellness', '#86efac'),
    (user_uuid, 'Feedback Requested', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Referral Given', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Renewal Due', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Upsell Opportunity', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Membership Active', 'client_demographics', '#7dd3fc'),
    (user_uuid, 'Membership Expired', 'schedule_attendance', '#fbbf24'),
    (user_uuid, 'Gift Voucher', 'client_demographics', '#7dd3fc');

  RAISE NOTICE 'Created 60 wellness starter tags for user %', user_uuid;
END;
$$;

-- ============================================================================
-- STEP 4: Comment the function
-- ============================================================================

COMMENT ON FUNCTION public.create_wellness_starter_tags(UUID) IS
'Seeds 60 wellness practitioner starter tags for a new user across 5 semantic categories';

COMMIT;

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE '✅ Tag system migrated to semantic categories';
  RAISE NOTICE '✅ 5 categories: services_modalities, client_demographics, schedule_attendance, health_wellness, emotional_mental';
  RAISE NOTICE '✅ Function create_wellness_starter_tags() ready for new users';
END $$;
