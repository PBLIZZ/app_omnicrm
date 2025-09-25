-- =============================================================================
-- Client Onboarding System Migration
--
-- This migration adds comprehensive client onboarding functionality including:
-- - Enhanced contacts table with wellness-specific fields
-- - Consent management system (GDPR compliant)
-- - Onboarding tokens for secure public forms
-- - Client photo storage support
-- - Proper RLS policies for security
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: ENHANCE CONTACTS TABLE
-- =============================================================================

-- Add new columns to existing contacts table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS client_status TEXT CHECK (client_status IN ('active', 'inactive', 'at_risk', 'churned')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS address JSONB,
ADD COLUMN IF NOT EXISTS health_context JSONB,
ADD COLUMN IF NOT EXISTS preferences JSONB,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Rename stage column to lifecycle_stage for consistency
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'stage') THEN
    ALTER TABLE public.contacts RENAME COLUMN stage TO lifecycle_stage;
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS contacts_client_status_idx ON public.contacts(client_status);
CREATE INDEX IF NOT EXISTS contacts_date_of_birth_idx ON public.contacts(date_of_birth);
CREATE INDEX IF NOT EXISTS contacts_referral_source_idx ON public.contacts(referral_source);

-- Add GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS contacts_address_gin ON public.contacts USING GIN (address);
CREATE INDEX IF NOT EXISTS contacts_health_context_gin ON public.contacts USING GIN (health_context);
CREATE INDEX IF NOT EXISTS contacts_preferences_gin ON public.contacts USING GIN (preferences);

RAISE NOTICE 'SUCCESS: Contacts table enhanced with onboarding fields.';

-- =============================================================================
-- PART 2: CREATE CONSENT MANAGEMENT SYSTEM
-- =============================================================================

-- Client consents table for GDPR compliance
CREATE TABLE IF NOT EXISTS public.client_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing', 'hipaa', 'photography', 'data_processing')),
  granted BOOLEAN NOT NULL DEFAULT true,
  consent_text_version TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  signature_svg TEXT,
  signature_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on consents table
ALTER TABLE public.client_consents ENABLE ROW LEVEL SECURITY;

-- RLS policies for consents
CREATE POLICY "users_can_manage_own_client_consents" ON public.client_consents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for consent queries
CREATE INDEX IF NOT EXISTS client_consents_contact_id_idx ON public.client_consents(contact_id);
CREATE INDEX IF NOT EXISTS client_consents_user_id_idx ON public.client_consents(user_id);
CREATE INDEX IF NOT EXISTS client_consents_type_idx ON public.client_consents(consent_type);
CREATE INDEX IF NOT EXISTS client_consents_granted_idx ON public.client_consents(granted);

-- Add updated_at trigger
CREATE TRIGGER update_client_consents_updated_at
  BEFORE UPDATE ON public.client_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

RAISE NOTICE 'SUCCESS: Client consents system created.';

-- =============================================================================
-- PART 3: CREATE ONBOARDING TOKENS SYSTEM
-- =============================================================================

-- Onboarding tokens for secure public form access
CREATE TABLE IF NOT EXISTS public.onboarding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on tokens table
ALTER TABLE public.onboarding_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for tokens (users can manage their own tokens)
CREATE POLICY "users_can_manage_own_tokens" ON public.onboarding_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Special policy for public token validation (read-only for valid tokens)
CREATE POLICY "public_can_validate_tokens" ON public.onboarding_tokens
  FOR SELECT USING (
    NOT disabled
    AND expires_at > now()
    AND used_count < max_uses
  );

-- Indexes for token operations
CREATE INDEX IF NOT EXISTS onboarding_tokens_user_id_idx ON public.onboarding_tokens(user_id);
CREATE INDEX IF NOT EXISTS onboarding_tokens_token_idx ON public.onboarding_tokens(token);
CREATE INDEX IF NOT EXISTS onboarding_tokens_expires_at_idx ON public.onboarding_tokens(expires_at);
CREATE INDEX IF NOT EXISTS onboarding_tokens_active_idx ON public.onboarding_tokens(disabled, expires_at, used_count, max_uses);

RAISE NOTICE 'SUCCESS: Onboarding tokens system created.';

-- =============================================================================
-- PART 4: CLIENT FILES TRACKING
-- =============================================================================

-- Client files table for photo and document tracking
CREATE TABLE IF NOT EXISTS public.client_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'photo',
  mime_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on client files
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for client files
CREATE POLICY "users_can_manage_own_client_files" ON public.client_files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for file operations
CREATE INDEX IF NOT EXISTS client_files_contact_id_idx ON public.client_files(contact_id);
CREATE INDEX IF NOT EXISTS client_files_user_id_idx ON public.client_files(user_id);
CREATE INDEX IF NOT EXISTS client_files_type_idx ON public.client_files(file_type);

RAISE NOTICE 'SUCCESS: Client files system created.';

-- =============================================================================
-- PART 5: SECURITY DEFINER FUNCTION FOR PUBLIC SUBMISSIONS
-- =============================================================================

-- Create secure function for public onboarding submissions
CREATE OR REPLACE FUNCTION public.onboard_client_with_token(
  p_token TEXT,
  p_client JSONB,
  p_consent JSONB,
  p_photo_path TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_token_record RECORD;
  v_contact_id UUID;
BEGIN
  -- Validate token and get user_id
  SELECT * INTO v_token_record
  FROM public.onboarding_tokens t
  WHERE t.token = p_token
    AND t.disabled = false
    AND now() < t.expires_at
    AND t.used_count < t.max_uses
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired token' USING ERRCODE = '28000';
  END IF;

  v_user_id := v_token_record.user_id;

  -- Insert contact record
  INSERT INTO public.contacts (
    user_id,
    display_name,
    primary_email,
    primary_phone,
    date_of_birth,
    emergency_contact_name,
    emergency_contact_phone,
    client_status,
    referral_source,
    address,
    health_context,
    preferences,
    photo_url,
    source,
    lifecycle_stage
  ) VALUES (
    v_user_id,
    COALESCE((p_client->>'display_name'), (p_client->>'first_name') || ' ' || (p_client->>'last_name')),
    (p_client->>'primary_email'),
    (p_client->>'primary_phone'),
    (p_client->>'date_of_birth')::date,
    (p_client->>'emergency_contact_name'),
    (p_client->>'emergency_contact_phone'),
    COALESCE((p_client->>'client_status'), 'active'),
    (p_client->>'referral_source'),
    (p_client->'address'),
    (p_client->'health_context'),
    (p_client->'preferences'),
    p_photo_path,
    'onboarding_form',
    COALESCE((p_client->>'lifecycle_stage'), 'New Client')
  ) RETURNING id INTO v_contact_id;

  -- Insert consent record
  INSERT INTO public.client_consents (
    contact_id,
    user_id,
    consent_type,
    granted,
    consent_text_version,
    granted_at,
    signature_svg,
    signature_image_url
  ) VALUES (
    v_contact_id,
    v_user_id,
    COALESCE((p_consent->>'consent_type'), 'data_processing'),
    COALESCE((p_consent->>'granted')::boolean, true),
    (p_consent->>'consent_text_version'),
    now(),
    (p_consent->>'signature_svg'),
    (p_consent->>'signature_image_url')
  );

  -- Add photo file record if provided
  IF p_photo_path IS NOT NULL THEN
    INSERT INTO public.client_files (
      contact_id,
      user_id,
      file_path,
      file_type
    ) VALUES (
      v_contact_id,
      v_user_id,
      p_photo_path,
      'photo'
    );
  END IF;

  -- Increment token usage
  UPDATE public.onboarding_tokens
  SET used_count = used_count + 1
  WHERE id = v_token_record.id;

  RETURN v_contact_id;
END;
$$;

-- Grant execute permission to anonymous users (for public form)
REVOKE ALL ON FUNCTION public.onboard_client_with_token(TEXT, JSONB, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.onboard_client_with_token(TEXT, JSONB, JSONB, TEXT) TO anon;

RAISE NOTICE 'SUCCESS: Secure onboarding function created.';

-- =============================================================================
-- PART 6: HELPER FUNCTIONS
-- =============================================================================

-- Function to check consent for business logic
CREATE OR REPLACE FUNCTION public.check_client_consent(
  p_contact_id UUID,
  p_consent_type TEXT,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_granted BOOLEAN := false;
BEGIN
  SELECT granted INTO v_granted
  FROM public.client_consents
  WHERE contact_id = p_contact_id
    AND consent_type = p_consent_type
    AND user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_granted, false);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_client_consent(UUID, TEXT, UUID) TO authenticated;

RAISE NOTICE 'SUCCESS: Helper functions created.';

-- =============================================================================
-- PART 7: UPDATE EXISTING DATA
-- =============================================================================

-- Update any existing contacts with default values for new fields
UPDATE public.contacts
SET
  client_status = 'active',
  lifecycle_stage = COALESCE(lifecycle_stage, stage, 'Core Client')
WHERE client_status IS NULL OR lifecycle_stage IS NULL;

RAISE NOTICE 'SUCCESS: Existing data updated with defaults.';

COMMIT;

RAISE NOTICE 'MIGRATION COMPLETE: Client onboarding system is ready! 🚀';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Run: pnpm types:gen';
RAISE NOTICE '2. Create client-photos storage bucket in Supabase Dashboard';
RAISE NOTICE '3. Test onboarding token generation and public form';