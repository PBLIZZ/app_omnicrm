-- Migration: Create user_profiles table for extended practitioner profile data
-- Purpose: Store preferred name, organization, custom profile photo for external communications
-- Security: All data encrypted at rest with AES-256-GCM. Access restricted via RLS policies.

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Practitioner Information (for external communications)
  preferred_name TEXT, -- e.g., "Dr. Jane Smith" or "Jane Smith, RMT"
  organization_name TEXT, -- e.g., "Wellness Studio NYC" or "Smith Holistic Health"
  profile_photo_url TEXT, -- Custom uploaded photo (overrides Google photo)

  -- Optional Extended Information
  bio TEXT, -- Brief professional bio for client-facing materials
  phone TEXT, -- Business phone number
  website TEXT, -- Practice website

  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Add helpful comments
COMMENT ON TABLE user_profiles IS 'Extended practitioner profile data for external communications. Encrypted at rest with AES-256-GCM.';
COMMENT ON COLUMN user_profiles.preferred_name IS 'Name used in client communications (e.g., "Dr. Jane Smith")';
COMMENT ON COLUMN user_profiles.organization_name IS 'Practice or organization name for branding';
COMMENT ON COLUMN user_profiles.profile_photo_url IS 'Custom profile photo URL (overrides Google OAuth photo)';
