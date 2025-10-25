-- Migration 62: System Wellness Tags
-- Created: 2025-10-24
-- Description: Add system tag support and seed 60 wellness tags

-- ============================================================================
-- 1. ADD SYSTEM TAG COLUMN & MODIFY USER_ID
-- ============================================================================

ALTER TABLE tags
ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;

-- Make user_id nullable for system tags
ALTER TABLE tags
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN tags.is_system IS 'System tags are read-only (name/category) but users can customize colors. Cannot be deleted.';
COMMENT ON COLUMN tags.user_id IS 'NULL for system tags, user UUID for user-created tags';

-- Create index for faster filtering
CREATE INDEX idx_tags_is_system ON tags(is_system) WHERE is_system = true;

-- ============================================================================
-- 2. SEED 60 WELLNESS SYSTEM TAGS
-- ============================================================================

-- Services & Modalities (10 tags)
INSERT INTO tags (id, user_id, name, category, color, is_system, usage_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), NULL, 'Yoga', 'services_modalities', '#a78bfa', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Pilates', 'services_modalities', '#a78bfa', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Meditation', 'services_modalities', '#a78bfa', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Mindfulness', 'services_modalities', '#a78bfa', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Massage Therapy', 'services_modalities', '#a78bfa', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Deep Tissue', 'services_modalities', '#a78bfa', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Sports Massage', 'services_modalities', '#a78bfa', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Aromatherapy', 'services_modalities', '#a78bfa', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Reiki', 'services_modalities', '#a78bfa', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Acupuncture', 'services_modalities', '#a78bfa', true, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Client Demographics (16 tags)
INSERT INTO tags (id, user_id, name, category, color, is_system, usage_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), NULL, 'New Client', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Returning Client', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Regular Client', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Trial Session', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Expecting Mum', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Postpartum', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Seniors', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Athletes', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Fitness Buffs', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Office Workers', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Intro Session', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Feedback Requested', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Referral Given', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Upsell Opportunity', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Membership Active', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Gift Voucher', 'client_demographics', '#7dd3fc', true, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Schedule & Attendance (13 tags)
INSERT INTO tags (id, user_id, name, category, color, is_system, usage_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), NULL, 'Weekday AM', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Weekday PM', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Weekends', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Mornings Only', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Evenings Only', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Irregular Attendance', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Cancelled Session', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'No Show', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Late Arrival', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Package Holder', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Follow-up', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Renewal Due', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Membership Expired', 'schedule_attendance', '#fbbf24', true, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Health & Wellness Goals (11 tags)
INSERT INTO tags (id, user_id, name, category, color, is_system, usage_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), NULL, 'Stress Relief', 'health_wellness', '#86efac', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Pain Management', 'health_wellness', '#86efac', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Muscle Tension', 'health_wellness', '#86efac', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Sleep Improvement', 'health_wellness', '#86efac', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Energy Boost', 'health_wellness', '#86efac', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Injury Rehab', 'health_wellness', '#86efac', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Weight Loss', 'health_wellness', '#86efac', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Flexibility', 'health_wellness', '#86efac', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Posture Correction', 'health_wellness', '#86efac', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Mobility', 'health_wellness', '#86efac', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Assessment', 'health_wellness', '#86efac', true, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Emotional & Mental Focus (10 tags)
INSERT INTO tags (id, user_id, name, category, color, is_system, usage_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), NULL, 'Anxiety', 'emotional_mental', '#fb7185', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Burnout', 'emotional_mental', '#fb7185', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Emotional Release', 'emotional_mental', '#fb7185', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Confidence', 'emotional_mental', '#fb7185', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Focus', 'emotional_mental', '#fb7185', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Relaxation', 'emotional_mental', '#fb7185', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Motivation', 'emotional_mental', '#fb7185', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Mindfulness Practice', 'emotional_mental', '#fb7185', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Self Care', 'emotional_mental', '#fb7185', true, 0, NOW(), NOW()),
  (gen_random_uuid(), NULL, 'Trauma Informed', 'emotional_mental', '#fb7185', true, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. UPDATE RLS POLICIES FOR SYSTEM TAGS
-- ============================================================================

-- System tags are visible to all users (read-only for name/category)
-- Users can only modify colors of system tags, not delete them

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view own tags and system tags" ON tags;

-- Create new policy: users can see their own tags + all system tags
CREATE POLICY "Users can view own tags and system tags" ON tags
  FOR SELECT
  USING (auth.uid() = user_id OR is_system = true);

-- Update policy: users can only insert their own tags (not system tags)
DROP POLICY IF EXISTS "Users can create own tags" ON tags;
CREATE POLICY "Users can create own tags" ON tags
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Update policy: users can only update their own tags OR update colors of system tags
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
CREATE POLICY "Users can update own tags and system tag colors" ON tags
  FOR UPDATE
  USING (
    (auth.uid() = user_id AND is_system = false)
    OR (is_system = true)  -- Can update system tags (service layer will restrict to color only)
  );

-- Delete policy: users can only delete their own tags (never system tags)
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;
CREATE POLICY "Users can delete own tags" ON tags
  FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- ============================================================================
-- 4. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE tags IS 'Universal tagging system. System tags (is_system=true) have read-only names/categories but customizable colors. User tags are fully editable.';
