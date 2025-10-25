-- Migration: Fix Tag Colors and Add Marketing Tags
-- Description: Updates all existing tags to have correct colors based on their category
--              and adds the missing marketing_engagement tags

-- Update colors for each category based on TAG_CATEGORY_COLORS
UPDATE tags SET color = '#f5f3ff', updated_at = NOW() WHERE category = 'services_modalities';
UPDATE tags SET color = '#f0f9ff', updated_at = NOW() WHERE category = 'schedule_attendance';
UPDATE tags SET color = '#f0fdfa', updated_at = NOW() WHERE category = 'health_wellness';
UPDATE tags SET color = '#fefce8', updated_at = NOW() WHERE category = 'client_demographics';
UPDATE tags SET color = '#fff7ed', updated_at = NOW() WHERE category = 'marketing_engagement';
UPDATE tags SET color = '#fff1f2', updated_at = NOW() WHERE category = 'emotional_mental';

-- Add marketing_engagement tags (global tags with user_id = NULL)
INSERT INTO tags (user_id, name, category, color, is_system, usage_count, created_at, updated_at)
VALUES
  (NULL, 'Instagram', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Facebook', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'TikTok', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'YouTube', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Newsletter', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Blog Reader', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Referral Source', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Word of Mouth', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Workshop', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Retreat', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Testimonial', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Review Given', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Photo Consent', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW()),
  (NULL, 'Social Media Opt-In', 'marketing_engagement', '#fff7ed', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;
