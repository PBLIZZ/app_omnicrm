-- ====================================================================
-- Fix Onboarding Duplicate Contacts
-- ====================================================================
-- This migration fixes the issue where onboarding forms create duplicate
-- contacts instead of updating existing ones when the same email is used.

-- Drop and recreate the function with duplicate checking logic
DROP FUNCTION IF EXISTS public.onboard_client_with_token(TEXT, JSONB, JSONB, TEXT);

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
  v_existing_contact_id UUID;
  v_is_update BOOLEAN := FALSE;
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

  -- Check if a contact with this email already exists for this user
  IF (p_client->>'primary_email') IS NOT NULL AND (p_client->>'primary_email') != '' THEN
    SELECT id INTO v_existing_contact_id
    FROM public.contacts
    WHERE user_id = v_user_id
      AND primary_email = LOWER(TRIM(p_client->>'primary_email'))
    LIMIT 1;
  END IF;

  -- If contact exists, update it; otherwise create new one
  IF v_existing_contact_id IS NOT NULL THEN
    v_contact_id := v_existing_contact_id;
    v_is_update := TRUE;
    
    -- Update existing contact with onboarding form data
    UPDATE public.contacts SET
      display_name = COALESCE((p_client->>'display_name'), (p_client->>'first_name') || ' ' || (p_client->>'last_name')),
      primary_email = (p_client->>'primary_email'),
      primary_phone = (p_client->>'primary_phone'),
      date_of_birth = (p_client->>'date_of_birth')::date,
      emergency_contact_name = (p_client->>'emergency_contact_name'),
      emergency_contact_phone = (p_client->>'emergency_contact_phone'),
      client_status = COALESCE((p_client->>'client_status'), 'active'),
      referral_source = (p_client->>'referral_source'),
      address = (p_client->'address'),
      health_context = (p_client->'health_context'),
      preferences = (p_client->'preferences'),
      photo_url = p_photo_path,
      source = 'onboarding_form',
      lifecycle_stage = COALESCE((p_client->>'lifecycle_stage'), 'New Client'),
      updated_at = now()
    WHERE id = v_contact_id;
    
    -- Update existing consent record if it exists, otherwise create new one
    UPDATE public.client_consents SET
      consent_type = COALESCE((p_consent->>'consent_type')::public.consent_type, 'data_processing'::public.consent_type),
      granted = COALESCE((p_consent->>'granted')::boolean, true),
      consent_text_version = (p_consent->>'consent_text_version'),
      granted_at = now(),
      signature_svg = (p_consent->>'signature_svg'),
      signature_image_url = (p_consent->>'signature_image_url')
    WHERE contact_id = v_contact_id
      AND consent_type = COALESCE((p_consent->>'consent_type')::public.consent_type, 'data_processing'::public.consent_type);
    
    -- If no consent record was updated, create a new one
    IF NOT FOUND THEN
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
    END IF;
    
  ELSE
    -- Create new contact record
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
      COALESCE((p_consent->>'consent_type')::public.consent_type, 'data_processing'::public.consent_type),
      COALESCE((p_consent->>'granted')::boolean, true),
      (p_consent->>'consent_text_version'),
      now(),
      (p_consent->>'signature_svg'),
      (p_consent->>'signature_image_url')
    );
  END IF;

  -- Add photo file record if provided (only for new contacts or if updating photo)
  IF p_photo_path IS NOT NULL THEN
    -- Delete existing photo file record if updating
    IF v_is_update THEN
      DELETE FROM public.client_files 
      WHERE contact_id = v_contact_id AND file_type = 'photo';
    END IF;
    
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

RAISE NOTICE 'SUCCESS: Onboarding function updated to prevent duplicate contacts.';
