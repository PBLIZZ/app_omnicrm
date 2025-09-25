-- =============================================================================
-- Convert CHECK Constraints to Proper ENUMs
--
-- This migration converts CHECK constraints to proper PostgreSQL ENUMs for:
-- - consent_type in client_consents table
-- - file_type in client_files table
-- - Updates the schema to use proper enum types
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: CREATE ENUM TYPES
-- =============================================================================

-- Create consent_type enum
DO $$ BEGIN
  CREATE TYPE public.consent_type AS ENUM (
    'data_processing',
    'marketing', 
    'hipaa',
    'photography'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create file_type enum
DO $$ BEGIN
  CREATE TYPE public.file_type AS ENUM (
    'photo',
    'document',
    'form'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

RAISE NOTICE 'SUCCESS: Enum types created.';

-- =============================================================================
-- PART 2: UPDATE CLIENT_CONSENTS TABLE
-- =============================================================================

-- Add new column with enum type
ALTER TABLE public.client_consents 
ADD COLUMN IF NOT EXISTS consent_type_new public.consent_type;

-- Populate new column with converted values
UPDATE public.client_consents 
SET consent_type_new = consent_type::public.consent_type
WHERE consent_type IN ('data_processing', 'marketing', 'hipaa', 'photography');

-- Drop old column and constraint
ALTER TABLE public.client_consents DROP COLUMN IF EXISTS consent_type;

-- Rename new column
ALTER TABLE public.client_consents RENAME COLUMN consent_type_new TO consent_type;

-- Make it NOT NULL
ALTER TABLE public.client_consents ALTER COLUMN consent_type SET NOT NULL;

RAISE NOTICE 'SUCCESS: client_consents.consent_type converted to enum.';

-- =============================================================================
-- PART 3: UPDATE CLIENT_FILES TABLE
-- =============================================================================

-- Add new column with enum type
ALTER TABLE public.client_files 
ADD COLUMN IF NOT EXISTS file_type_new public.file_type;

-- Populate new column with converted values (default to 'photo' for existing records)
UPDATE public.client_files 
SET file_type_new = COALESCE(file_type::public.file_type, 'photo'::public.file_type)
WHERE file_type IS NOT NULL;

-- Set default for any remaining NULL values
UPDATE public.client_files 
SET file_type_new = 'photo'::public.file_type
WHERE file_type_new IS NULL;

-- Drop old column
ALTER TABLE public.client_files DROP COLUMN IF EXISTS file_type;

-- Rename new column
ALTER TABLE public.client_files RENAME COLUMN file_type_new TO file_type;

-- Make it NOT NULL with default
ALTER TABLE public.client_files ALTER COLUMN file_type SET NOT NULL;
ALTER TABLE public.client_files ALTER COLUMN file_type SET DEFAULT 'photo'::public.file_type;

RAISE NOTICE 'SUCCESS: client_files.file_type converted to enum.';

-- =============================================================================
-- PART 4: UPDATE FUNCTIONS
-- =============================================================================

-- Update the onboard_client_with_token function to handle enum types
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

  -- Insert consent record with enum type
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
    COALESCE((p_consent->>'consent_type')::public.consent_type, 'data_processing'::public.consent_type),
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
      'photo'::public.file_type
    );
  END IF;

  -- Increment token usage
  UPDATE public.onboarding_tokens
  SET used_count = used_count + 1
  WHERE id = v_token_record.id;

  RETURN v_contact_id;
END;
$$;

RAISE NOTICE 'SUCCESS: Functions updated for enum types.';

COMMIT;

RAISE NOTICE 'MIGRATION COMPLETE: CHECK constraints converted to ENUMs! 🚀';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Run: pnpm types:gen';
RAISE NOTICE '2. Verify enum types are properly generated';
